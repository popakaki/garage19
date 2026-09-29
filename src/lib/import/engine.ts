/**
 * Движок импорта прайсов поставщиков.
 *
 * Пайплайн:
 *   текст → парсер (yml/xml/csv) → черновики (draft.ts) → запись в БД (engine.ts)
 *
 * Режимы:
 *  * `dry_run`   — ничего не пишет, только отчёт (ImportJob не создаётся);
 *  * `insert_only` — создаёт новые товары, существующие помечает как пропущенные;
 *  * `update`    — создаёт новые и обновляет найденные.
 *
 * Поиск существующего товара: по `sku`, затем по паре `supplierId + externalId`.
 * Наценка поставщика применяется к цене, закупочная цена сохраняется в purchasePrice.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { slugify } from "@/lib/utils";
import prisma from "@/lib/prisma";
import { parseCsv } from "./parsers/csv";
import { parseYml } from "./parsers/yml";
import { buildDraft, FALLBACK_IMAGE, type DraftContext } from "./draft";
import { loadDictionaries } from "./mapping";
import type { ImportInput, ImportResult, ParseResult, ProductDraft } from "./types";

/** Сколько ошибок возвращаем в ImportResult (остальные — только в логе). */
const MAX_REPORTED_ERRORS = 50;

/** Максимальная длина текстового поля лога в ImportJob. */
const MAX_LOG_LENGTH = 60_000;

type Counters = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
};

function parseByType(text: string, sourceType: ImportInput["sourceType"]): ParseResult {
  if (sourceType === "csv") return parseCsv(text);
  return parseYml(text);
}

/** Первое изображение черновика или фолбэк. */
function primaryImage(draft: ProductDraft): string {
  return draft.images[0] ?? FALLBACK_IMAGE;
}

function isLocalImage(url: string): boolean {
  return url.startsWith("/images/") || url.startsWith("/uploads/");
}

/**
 * Разрешает категорию черновика: существующий slug либо новая категория
 * (создаётся под `categoriesParentSlug`, по умолчанию — корень каталога).
 */
async function resolveCategoryId(
  prisma: PrismaClient,
  draft: ProductDraft,
  context: { categories: { id: string; slug: string; name: string }[]; parentSlug?: string; created: string[] },
): Promise<string> {
  const existing = context.categories.find((category) => category.slug === draft.categorySlug);
  if (existing) return existing.id;

  const parent = context.parentSlug
    ? context.categories.find((category) => category.slug === context.parentSlug)
    : undefined;

  let slug = draft.categorySlug || slugify(draft.categoryName ?? "import", "import");
  let suffix = 2;
  while (context.categories.some((category) => category.slug === slug)) {
    slug = `${draft.categorySlug}-${suffix}`;
    suffix += 1;
  }

  const created = await prisma.category.create({
    data: {
      slug,
      name: draft.categoryName?.trim() || draft.categorySlug || "Импортированные товары",
      parentId: parent?.id ?? null,
      sortOrder: 900,
      description: `Категория создана автоматически при импорте прайса (${slug}).`,
    },
    select: { id: true, slug: true, name: true, parentId: true },
  });
  context.categories.push(created);
  context.created.push(`${created.name} (${created.slug})`);

  return created.id;
}

/** Разрешает производителя: существующий бренд или новый. */
async function resolveManufacturerId(
  prisma: PrismaClient,
  draft: ProductDraft,
  context: { brands: { id: string; slug: string; name: string }[]; created: string[] },
): Promise<string | null> {
  if (!draft.manufacturerSlug || !draft.brandName) return null;

  const existing = context.brands.find((brand) => brand.slug === draft.manufacturerSlug);
  if (existing) return existing.id;

  let slug = draft.manufacturerSlug;
  let suffix = 2;
  while (context.brands.some((brand) => brand.slug === slug)) {
    slug = `${draft.manufacturerSlug}-${suffix}`;
    suffix += 1;
  }

  const created = await prisma.brand.create({
    data: {
      name: draft.brandName,
      slug,
      sortOrder: 900,
      popular: false,
    },
    select: { id: true, slug: true, name: true },
  });
  context.brands.push(created);
  context.created.push(`бренд ${created.name} (${created.slug})`);

  return created.id;
}

/** Ищет существующий товар по SKU, затем по паре «поставщик + внешний id». */
async function findExistingProduct(
  prisma: PrismaClient,
  draft: ProductDraft,
  supplierId: string | undefined,
): Promise<{ id: string; slug: string } | null> {
  const bySku = await prisma.product.findUnique({ where: { sku: draft.sku }, select: { id: true, slug: true } });
  if (bySku) return bySku;

  if (supplierId && draft.externalId) {
    const byExternal = await prisma.product.findFirst({
      where: { supplierId, externalId: draft.externalId },
      select: { id: true, slug: true },
    });
    if (byExternal) return byExternal;
  }

  return null;
}

/** Подбирает свободный slug товара, если занят другим товаром. */
async function ensureUniqueSlug(prisma: PrismaClient, draft: ProductDraft, productId?: string): Promise<string> {
  const owner = await prisma.product.findUnique({ where: { slug: draft.slug }, select: { id: true } });
  if (!owner || owner.id === productId) return draft.slug;
  let suffix = 2;
  for (;;) {
    const candidate = `${draft.slug}-${suffix}`.slice(0, 95);
    const busy = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!busy || busy.id === productId) return candidate;
    suffix += 1;
  }
}

/** Создаёт или обновляет товар по черновику. */
async function writeProduct(
  prisma: PrismaClient,
  draft: ProductDraft,
  options: {
    supplierId?: string;
    categoryContext: { categories: { id: string; slug: string; name: string }[]; parentSlug?: string; created: string[] };
    brandContext: { brands: { id: string; slug: string; name: string }[]; created: string[] };
    carDictionary: DraftContext["cars"];
    mode: "update" | "insert_only";
  },
): Promise<"created" | "updated" | "skipped"> {
  const existing = await findExistingProduct(prisma, draft, options.supplierId);
  if (existing && options.mode === "insert_only") return "skipped";

  const categoryId = await resolveCategoryId(prisma, draft, options.categoryContext);
  const manufacturerId = await resolveManufacturerId(prisma, draft, options.brandContext);
  const slug = existing ? existing.slug : await ensureUniqueSlug(prisma, draft);
  const fitmentType = draft.fitmentKeys.length > 0 ? "specific" : "universal";

  const baseData: Prisma.ProductUncheckedCreateInput = {
    sku: draft.sku,
    slug,
    name: draft.name,
    categoryId,
    manufacturerId,
    brandName: draft.brandName ?? null,
    shortDescription: draft.shortDescription,
    description: draft.description,
    warrantyMonths: draft.warrantyMonths ?? null,
    price: draft.price,
    oldPrice: draft.oldPrice ?? null,
    purchasePrice: draft.purchasePrice ?? null,
    stock: draft.stock,
    weight: draft.weight ?? null,
    lengthMm: draft.lengthMm ?? null,
    widthMm: draft.widthMm ?? null,
    heightMm: draft.heightMm ?? null,
    fitmentType,
    fitmentNote: draft.fitmentNote ?? null,
    capacityKg: draft.capacityKg ?? null,
    verticalLoadKg: draft.verticalLoadKg ?? null,
    volumeL: draft.volumeL ?? null,
    material: draft.material ?? null,
    mountPlace: draft.mountPlace ?? null,
    profile: draft.profile ?? null,
    lockIncluded: draft.lockIncluded ?? null,
    electricIncluded: draft.electricIncluded ?? null,
    bumperCut: draft.bumperCut ?? null,
    doorsCount: draft.doorsCount ?? null,
    isActive: draft.isActive ?? true,
    seoTitle: draft.seoTitle ?? null,
    seoDescription: draft.seoDescription ?? null,
    supplierId: options.supplierId ?? null,
    externalId: draft.externalId ?? draft.sku,
  };

  let productId: string;
  let outcome: "created" | "updated";

  if (existing) {
    const { sku: _sku, supplierId: _supplierId, externalId: _externalId, ...updateData } = baseData;
    void _sku;
    void _supplierId;
    void _externalId;
    await prisma.product.update({ where: { id: existing.id }, data: updateData });
    productId = existing.id;
    outcome = "updated";
  } else {
    const created = await prisma.product.create({ data: baseData, select: { id: true } });
    productId = created.id;
    outcome = "created";
  }

  // ── Изображения ──────────────────────────────────────────────────────────
  const remoteImages = draft.images.filter((url) => !isLocalImage(url));
  if (remoteImages.length > 0) {
    // Заменяем только изображения, пришедшие из прайса: загруженные вручную сохраняем.
    await prisma.productImage.deleteMany({ where: { productId, url: { notIn: remoteImages } } });
    const existingImages = await prisma.productImage.findMany({
      where: { productId },
      select: { url: true },
    });
    const known = new Set(existingImages.map((image) => image.url));
    const toCreate = remoteImages.filter((url) => !known.has(url));
    if (toCreate.length > 0) {
      await prisma.productImage.createMany({
        data: toCreate.map((url, index) => ({
          productId,
          url,
          alt: `${draft.name} — изображение ${index + 1}`,
          sortOrder: (existingImages.length + index + 1) * 10,
          isPrimary: existingImages.length === 0 && index === 0,
        })),
      });
    }
  } else {
    const count = await prisma.productImage.count({ where: { productId } });
    if (count === 0) {
      await prisma.productImage.create({
        data: { productId, url: primaryImage(draft), alt: draft.name, sortOrder: 10, isPrimary: true },
      });
    }
  }

  // ── Характеристики ───────────────────────────────────────────────────────
  for (const attribute of draft.attributes) {
    const record = await prisma.attribute.findUnique({ where: { slug: attribute.slug }, select: { id: true } });
    if (!record) continue;
    await prisma.productAttribute.upsert({
      where: { productId_attributeId: { productId, attributeId: record.id } },
      create: {
        productId,
        attributeId: record.id,
        valueString: attribute.valueString ?? null,
        valueNumber: attribute.valueNumber ?? null,
        valueBool: attribute.valueBool ?? null,
      },
      update: {
        valueString: attribute.valueString ?? null,
        valueNumber: attribute.valueNumber ?? null,
        valueBool: attribute.valueBool ?? null,
      },
    });
  }

  // ── Совместимость ────────────────────────────────────────────────────────
  const fitmentWarnings: string[] = [];
  for (const key of draft.fitmentKeys) {
    const parts = key.split("/");
    const brand = options.carDictionary.brandsBySlug.get(parts[0]);
    if (!brand) {
      if (fitmentWarnings.length < 3) fitmentWarnings.push(key);
      continue;
    }
    const model = parts[1] ? options.carDictionary.models.get(`${parts[0]}/${parts[1]}`) : undefined;
    const generation =
      parts[1] && parts[2] ? options.carDictionary.generations.get(`${parts[0]}/${parts[1]}/${parts[2]}`) : undefined;

    const duplicate = await prisma.fitment.findFirst({
      where: {
        productId,
        brandId: brand.id,
        modelId: model?.id ?? null,
        generationId: generation?.id ?? null,
      },
      select: { id: true },
    });
    if (duplicate) continue;

    await prisma.fitment.create({
      data: {
        productId,
        brandId: brand.id,
        modelId: model?.id ?? null,
        generationId: generation?.id ?? null,
        note: draft.fitmentNote ?? null,
      },
    });
  }

  void fitmentWarnings;
  return outcome;
}

/** Ограничивает длину лога для записи в ImportJob. */
function clampLog(log: string): string {
  if (log.length <= MAX_LOG_LENGTH) return log;
  return `${log.slice(0, MAX_LOG_LENGTH)}\n... журнал обрезан (${log.length} символов)`;
}

/**
 * Единая точка входа импорта.
 * @see docs/IMPORT.md — описание контракта и режимов.
 */
export async function runImport(input: ImportInput): Promise<ImportResult> {
  const parseResult = parseByType(input.text, input.sourceType);
  const errors: string[] = parseResult.errors.slice(0, MAX_REPORTED_ERRORS);
  let errorCount = parseResult.errors.length;

  const logLines: string[] = [
    `Файл: ${input.fileName}`,
    `Формат: ${input.sourceType.toUpperCase()}, режим: ${input.mode}`,
  ];
  for (const note of parseResult.notes) logLines.push(`  · ${note}`);
  if (parseResult.errors.length > 0) {
    logLines.push(`Ошибки разбора (${parseResult.errors.length}):`);
    for (const error of parseResult.errors.slice(0, 20)) logLines.push(`  ! ${error}`);
  }

  if (parseResult.offers.length === 0) {
    logLines.push("Товары не найдены — импорт завершён без изменений.");
    const log = clampLog(logLines.join("\n"));
    const jobId = await createJob(prisma, input, {
      totalRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: Math.max(errorCount, 1),
      log,
      status: "failed",
    });
    return {
      jobId,
      status: "failed",
      totalRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: Math.max(errorCount, 1),
      errors: errors.length ? errors : ["В файле не найдено ни одного товара"],
      log,
    };
  }

  const dictionaries = await loadDictionaries(prisma);
  const supplier = input.supplierId
    ? dictionaries.suppliers.find((item) => item.id === input.supplierId)
    : dictionaries.suppliers.find((item) => item.slug === slugify(input.fileName.replace(/\.[^.]+$/, ""), ""));

  if (input.supplierId && !supplier) {
    errors.push(`Поставщик с id ${input.supplierId} не найден — наценка не применена`);
    errorCount += 1;
  }

  const draftContext: DraftContext = {
    categories: dictionaries.categories,
    brands: dictionaries.brands,
    attributes: dictionaries.attributes,
    cars: dictionaries.cars,
    defaultCategorySlug: input.defaultCategorySlug,
    marginPercent: supplier?.marginPercent ?? 0,
    supplierSlug: supplier?.slug,
    categoriesParentSlug: input.defaultCategorySlug,
  };

  if (supplier) {
    logLines.push(`Поставщик: ${supplier.name} (наценка ${supplier.marginPercent}%)`);
  } else {
    logLines.push("Поставщик не указан — наценка не применяется");
  }

  // ── Черновики ────────────────────────────────────────────────────────────
  const drafts: ProductDraft[] = [];
  const seenSkus = new Set<string>();
  let duplicates = 0;

  for (const offer of parseResult.offers) {
    const result = buildDraft(offer, draftContext);
    if ("error" in result) {
      errorCount += 1;
      if (errors.length < MAX_REPORTED_ERRORS) errors.push(result.error);
      continue;
    }
    if (seenSkus.has(result.sku)) {
      duplicates += 1;
      continue;
    }
    seenSkus.add(result.sku);
    drafts.push(result);
  }

  if (duplicates > 0) logLines.push(`Дубликатов SKU в файле: ${duplicates} (оставлена первая позиция)`);
  logLines.push(`Черновиков товаров: ${drafts.length}`);

  const counters: Counters = { created: 0, updated: 0, skipped: 0, errors: errorCount };

  // ── Режим dry_run ────────────────────────────────────────────────────────
  if (input.mode === "dry_run") {
    let willCreate = 0;
    let willUpdate = 0;

    logLines.push("", "Проверка без записи (dry_run). План импорта:");
    for (const draft of drafts) {
      const existing = await findExistingProduct(prisma, draft, supplier?.id);
      if (existing) willUpdate += 1;
      else willCreate += 1;
      logLines.push(
        `  [${existing ? "обновить" : "создать"}] ${draft.sku} · ${draft.name} · ` +
          `${(draft.price / 100).toFixed(2)} ₽ · ${draft.categorySlug || "категория не определена"} · ` +
          `совместимость: ${draft.fitmentKeys.length > 0 ? draft.fitmentKeys.join(", ") : "универсальный"}`,
      );
    }

    const createdCategories = new Set(
      drafts
        .filter(
          (draft) =>
            draft.categorySlug && !dictionaries.categories.some((category) => category.slug === draft.categorySlug),
        )
        .map((draft) => draft.categorySlug),
    );
    if (createdCategories.size > 0) {
      logLines.push(`Новые категории (${createdCategories.size}): ${[...createdCategories].join(", ")}`);
    }
    const newBrands = new Set(
      drafts
        .filter(
          (draft) =>
            draft.manufacturerSlug &&
            !dictionaries.brands.some((brand) => brand.slug === draft.manufacturerSlug),
        )
        .map((draft) => draft.brandName ?? draft.manufacturerSlug ?? ""),
    );
    if (newBrands.size > 0) logLines.push(`Новые бренды (${newBrands.size}): ${[...newBrands].join(", ")}`);

    logLines.push(
      "",
      `Итого без записи: создать ${willCreate}, обновить ${willUpdate}, ` +
        `пропущено строк ${parseResult.offers.length - drafts.length}, ошибок ${errorCount}.`,
    );

    return {
      jobId: "dry-run",
      status: "done",
      totalRows: parseResult.offers.length,
      createdCount: willCreate,
      updatedCount: willUpdate,
      skippedCount: parseResult.offers.length - drafts.length,
      errorCount,
      errors: errors.slice(0, MAX_REPORTED_ERRORS),
      log: clampLog(logLines.join("\n")),
    };
  }

  // ── Запись ───────────────────────────────────────────────────────────────
  const categoryContext = {
    categories: dictionaries.categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
    })),
    parentSlug: input.defaultCategorySlug,
    created: [] as string[],
  };
  const brandContext = {
    brands: dictionaries.brands.map((brand) => ({ id: brand.id, slug: brand.slug, name: brand.name })),
    created: [] as string[],
  };

  logLines.push("", "Запись в базу:");
  for (const draft of drafts) {
    try {
      const outcome = await writeProduct(prisma, draft, {
        supplierId: supplier?.id,
        categoryContext,
        brandContext,
        carDictionary: dictionaries.cars,
        mode: input.mode,
      });
      if (outcome === "created") {
        counters.created += 1;
        logLines.push(`  [+] ${draft.sku} · ${draft.name}`);
      } else if (outcome === "updated") {
        counters.updated += 1;
        logLines.push(`  [~] ${draft.sku} · ${draft.name}`);
      } else {
        counters.skipped += 1;
        logLines.push(`  [=] ${draft.sku} · уже существует (режим «только добавлять»)`);
      }
    } catch (error) {
      counters.errors += 1;
      const message = `строка ${draft.row} (${draft.sku}): ${(error as Error).message}`;
      if (errors.length < MAX_REPORTED_ERRORS) errors.push(message);
      logLines.push(`  [!] ${message}`);
    }
  }

  if (categoryContext.created.length > 0) {
    logLines.push("", `Созданы категории: ${categoryContext.created.join(", ")}`);
  }
  if (brandContext.created.length > 0) {
    logLines.push(`Созданы бренды: ${brandContext.created.join(", ")}`);
  }

  logLines.push(
    "",
    `Итог: создано ${counters.created}, обновлено ${counters.updated}, пропущено ${counters.skipped}, ошибок ${counters.errors}.`,
  );

  const log = clampLog(logLines.join("\n"));
  const status: ImportResult["status"] = counters.errors > 0 && counters.created + counters.updated === 0 ? "failed" : "done";

  const jobId = await createJob(prisma, input, {
    totalRows: parseResult.offers.length,
    createdCount: counters.created,
    updatedCount: counters.updated,
    skippedCount: counters.skipped,
    errorCount: counters.errors,
    log,
    status,
  });

  return {
    jobId,
    status,
    totalRows: parseResult.offers.length,
    createdCount: counters.created,
    updatedCount: counters.updated,
    skippedCount: counters.skipped,
    errorCount: counters.errors,
    errors: errors.slice(0, MAX_REPORTED_ERRORS),
    log,
  };
}

/**
 * Сохраняет результат импорта в ImportJob.
 *
 * Если админка уже создала задачу (`input.jobId`), обновляем её — иначе создаём новую.
 * `status` меняется на `done`/`failed`, выставляются счётчики, лог и `finishedAt`.
 */
async function createJob(
  prisma: PrismaClient,
  input: ImportInput,
  summary: {
    totalRows: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errorCount: number;
    log: string;
    status: "done" | "failed";
  },
): Promise<string> {
  const data: Prisma.ImportJobUncheckedUpdateInput = {
    fileName: input.fileName,
    sourceType: input.sourceType,
    supplierId: input.supplierId ?? null,
    userId: input.userId ?? null,
    status: summary.status,
    mode: input.mode,
    totalRows: summary.totalRows,
    createdCount: summary.createdCount,
    updatedCount: summary.updatedCount,
    skippedCount: summary.skippedCount,
    errorCount: summary.errorCount,
    log: summary.log,
    finishedAt: new Date(),
  };

  let jobId: string;
  if (input.jobId) {
    const existing = await prisma.importJob
      .findUnique({ where: { id: input.jobId }, select: { id: true } })
      .catch(() => null);
    if (existing) {
      await prisma.importJob.update({ where: { id: existing.id }, data });
      jobId = existing.id;
    } else {
      const created = await prisma.importJob.create({
        data: { ...(data as Prisma.ImportJobUncheckedCreateInput) },
        select: { id: true },
      });
      jobId = created.id;
    }
  } else {
    const created = await prisma.importJob.create({
      data: { ...(data as Prisma.ImportJobUncheckedCreateInput) },
      select: { id: true },
    });
    jobId = created.id;
  }

  if (input.userId) {
    await prisma.auditLog
      .create({
        data: {
          userId: input.userId,
          action: "import",
          entity: "product",
          entityId: jobId,
          payload: {
            fileName: input.fileName,
            sourceType: input.sourceType,
            mode: input.mode,
            createdCount: summary.createdCount,
            updatedCount: summary.updatedCount,
            skippedCount: summary.skippedCount,
            errorCount: summary.errorCount,
          },
        },
      })
      .catch(() => undefined);
  }

  return jobId;
}
