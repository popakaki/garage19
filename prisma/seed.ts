/**
 * Garage19 — идемпотентные демо-данные.
 *
 * Запуск: npm run db:seed  (tsx prisma/seed.ts)
 *
 * Принципы:
 *  * все сущности upsert'ятся по стабильному ключу (slug/SKU/номер заказа/ключ настройки),
 *    поэтому повторный запуск не приводит к дублям;
 *  * дочерние коллекции (изображения, характеристики, совместимость, отзывы, документы)
 *    пересоздаются — так они всегда соответствуют данным в prisma/data/**;
 *  * в конце печатается сводка «создано/обновлено» по каждой сущности.
 *
 * Данные лежат в prisma/data/**: catalog.ts, cars.ts, products*.ts, content.ts,
 * orders.ts, reviews.ts, brands.ts. Целостность проверяется скриптом
 * `npx tsx prisma/data/validate.ts`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// .env загружаем до импорта Prisma-клиента: datasource читает DATABASE_URL
// в момент создания клиента.
// ─────────────────────────────────────────────────────────────────────────────

function loadDotEnv(): void {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 0) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env отсутствует — используем переменные окружения как есть
  }
}

loadDotEnv();

/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");
const { hashPassword } = require("../src/lib/auth") as typeof import("../src/lib/auth");
const { formatOrderNumber } = require("../src/lib/utils") as typeof import("../src/lib/utils");
const { CATEGORY_TREE, ATTRIBUTE_SEEDS } = require("./data/catalog") as typeof import("./data/catalog");
const { PRODUCT_BRANDS } = require("./data/brands") as typeof import("./data/brands");
const { CAR_BRANDS } = require("./data/cars") as typeof import("./data/cars");
const {
  PRODUCTS,
  documentSpecsFor,
  flagshipKeysFor,
  resolveAttributeSlug,
} = require("./data/products") as typeof import("./data/products");
const { BANNERS, CALLBACKS, CITIES, DELIVERY_TARIFFS, PAGES, SETTINGS, SUBSCRIBERS, SUPPLIERS } =
  require("./data/content") as typeof import("./data/content");
const { QUESTIONS, REVIEWS } = require("./data/reviews") as typeof import("./data/reviews");
const {
  ADDRESSES,
  DEMO_PASSWORD,
  INSTALL_BOOKINGS,
  ORDERS,
  SAVED_CARS,
  USERS,
} = require("./data/orders") as typeof import("./data/orders");

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Учёт созданных/обновлённых записей
// ─────────────────────────────────────────────────────────────────────────────

const counters = new Map<string, { created: number; updated: number; skipped: number }>();

function bump(entity: string, kind: "created" | "updated" | "skipped", amount = 1): void {
  const entry = counters.get(entity) ?? { created: 0, updated: 0, skipped: 0 };
  entry[kind] += amount;
  counters.set(entity, entry);
}

/** Upsert «с подсчётом»: сначала проверяем существование, затем пишем. */
async function presenceCount<T>(existing: T | null, entity: string): Promise<void> {
  bump(entity, existing ? "updated" : "created");
}

function daysAgoDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Настройки и страницы
// ─────────────────────────────────────────────────────────────────────────────

async function seedSettings(): Promise<void> {
  for (const setting of SETTINGS) {
    const existing = await prisma.setting.findUnique({ where: { key: setting.key }, select: { id: true } });
    await prisma.setting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: setting.value,
        group: setting.group,
        label: setting.label,
        type: setting.type,
        sortOrder: setting.sortOrder,
      },
      update: {
        value: setting.value,
        group: setting.group,
        label: setting.label,
        type: setting.type,
        sortOrder: setting.sortOrder,
      },
    });
    await presenceCount(existing, "Setting");
  }
}

async function seedPages(): Promise<void> {
  for (const page of PAGES) {
    const existing = await prisma.page.findUnique({ where: { slug: page.slug }, select: { id: true } });
    await prisma.page.upsert({
      where: { slug: page.slug },
      create: {
        slug: page.slug,
        title: page.title,
        content: page.content,
        excerpt: page.excerpt,
        showInHeader: page.showInHeader ?? false,
        showInFooter: page.showInFooter ?? true,
        sortOrder: page.sortOrder,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
      },
      update: {
        title: page.title,
        content: page.content,
        excerpt: page.excerpt,
        showInHeader: page.showInHeader ?? false,
        showInFooter: page.showInFooter ?? true,
        sortOrder: page.sortOrder,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
      },
    });
    await presenceCount(existing, "Page");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Категории и характеристики
// ─────────────────────────────────────────────────────────────────────────────

async function seedCategories(): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>();

  for (const root of CATEGORY_TREE) {
    const existing = await prisma.category.findUnique({ where: { slug: root.slug }, select: { id: true } });
    const saved = await prisma.category.upsert({
      where: { slug: root.slug },
      create: {
        slug: root.slug,
        name: root.name,
        description: root.description,
        image: root.image,
        icon: root.icon,
        sortOrder: root.sortOrder,
        showInMenu: root.showInMenu ?? true,
        seoTitle: root.seoTitle,
        seoDescription: root.seoDescription,
        seoKeywords: root.seoKeywords,
      },
      update: {
        name: root.name,
        description: root.description,
        image: root.image,
        icon: root.icon,
        sortOrder: root.sortOrder,
        showInMenu: root.showInMenu ?? true,
        seoTitle: root.seoTitle,
        seoDescription: root.seoDescription,
        seoKeywords: root.seoKeywords,
      },
      select: { id: true },
    });
    bySlug.set(root.slug, saved.id);
    await presenceCount(existing, "Category");
  }

  for (const root of CATEGORY_TREE) {
    for (const child of root.children ?? []) {
      const parentId = bySlug.get(root.slug);
      const existing = await prisma.category.findUnique({ where: { slug: child.slug }, select: { id: true } });
      const saved = await prisma.category.upsert({
        where: { slug: child.slug },
        create: {
          slug: child.slug,
          name: child.name,
          parentId,
          description: child.description,
          image: child.image,
          icon: child.icon,
          sortOrder: child.sortOrder,
          showInMenu: child.showInMenu ?? true,
          seoTitle: child.seoTitle,
          seoDescription: child.seoDescription,
          seoKeywords: child.seoKeywords,
        },
        update: {
          name: child.name,
          parentId,
          description: child.description,
          image: child.image,
          icon: child.icon,
          sortOrder: child.sortOrder,
          showInMenu: child.showInMenu ?? true,
          seoTitle: child.seoTitle,
          seoDescription: child.seoDescription,
          seoKeywords: child.seoKeywords,
        },
        select: { id: true },
      });
      bySlug.set(child.slug, saved.id);
      await presenceCount(existing, "Category");
    }
  }

  return bySlug;
}

async function seedAttributes(categoryIds: Map<string, string>): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>();

  for (const attribute of ATTRIBUTE_SEEDS) {
    // Характеристика привязывается к первой (корневой) категории из списка:
    // иначе одну и ту же фасету пришлось бы дублировать по подкатегориям.
    const categoryId = categoryIds.get(attribute.categories[0]) ?? null;
    const existing = await prisma.attribute.findUnique({ where: { slug: attribute.slug }, select: { id: true } });
    const saved = await prisma.attribute.upsert({
      where: { slug: attribute.slug },
      create: {
        slug: attribute.slug,
        name: attribute.name,
        categoryId,
        type: attribute.type,
        unit: attribute.unit ?? null,
        options: attribute.options ?? undefined,
        isFilterable: attribute.isFilterable ?? true,
        isRequired: attribute.isRequired ?? false,
        group: attribute.group ?? null,
        sortOrder: attribute.sortOrder,
      },
      update: {
        name: attribute.name,
        categoryId,
        type: attribute.type,
        unit: attribute.unit ?? null,
        options: attribute.options ?? undefined,
        isFilterable: attribute.isFilterable ?? true,
        isRequired: attribute.isRequired ?? false,
        group: attribute.group ?? null,
        sortOrder: attribute.sortOrder,
      },
      select: { id: true },
    });
    bySlug.set(attribute.slug, saved.id);
    await presenceCount(existing, "Attribute");
  }

  return bySlug;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Бренды: производители товаров и марки автомобилей
// ─────────────────────────────────────────────────────────────────────────────

async function seedBrands(): Promise<{
  productBrandIds: Map<string, string>;
  carBrandIds: Map<string, string>;
  carIndex: Map<string, { brandId: string; modelId?: string; generationId?: string }>;
  generationIds: string[];
}> {
  const productBrandIds = new Map<string, string>();

  for (const brand of PRODUCT_BRANDS) {
    const existing = await prisma.brand.findUnique({ where: { slug: brand.slug }, select: { id: true } });
    const saved = await prisma.brand.upsert({
      where: { slug: brand.slug },
      create: {
        name: brand.name,
        slug: brand.slug,
        country: brand.country,
        logo: brand.logo ?? null,
        popular: brand.popular,
        sortOrder: brand.sortOrder,
      },
      update: {
        name: brand.name,
        country: brand.country,
        logo: brand.logo ?? null,
        popular: brand.popular,
        sortOrder: brand.sortOrder,
      },
      select: { id: true },
    });
    productBrandIds.set(brand.name, saved.id);
    await presenceCount(existing, "Brand (производитель)");
  }

  const carBrandIds = new Map<string, string>();
  const carIndex = new Map<string, { brandId: string; modelId?: string; generationId?: string }>();
  const generationIds: string[] = [];

  for (const brand of CAR_BRANDS) {
    const existing = await prisma.brand.findUnique({ where: { slug: brand.slug }, select: { id: true } });
    const savedBrand = await prisma.brand.upsert({
      where: { slug: brand.slug },
      create: {
        name: brand.name,
        slug: brand.slug,
        country: brand.country,
        popular: brand.popular ?? false,
        sortOrder: brand.sortOrder,
      },
      update: {
        name: brand.name,
        country: brand.country,
        popular: brand.popular ?? false,
        sortOrder: brand.sortOrder,
      },
      select: { id: true },
    });
    carBrandIds.set(brand.slug, savedBrand.id);
    carIndex.set(brand.slug, { brandId: savedBrand.id });
    await presenceCount(existing, "Brand (марка авто)");

    for (const model of brand.models) {
      const existingModel = await prisma.carModel.findUnique({
        where: { brandId_slug: { brandId: savedBrand.id, slug: model.slug } },
        select: { id: true },
      });
      const savedModel = await prisma.carModel.upsert({
        where: { brandId_slug: { brandId: savedBrand.id, slug: model.slug } },
        create: {
          brandId: savedBrand.id,
          name: model.name,
          slug: model.slug,
          bodyType: model.bodyType,
          yearFrom: model.yearFrom,
          yearTo: model.yearTo ?? null,
          sortOrder: 100,
        },
        update: {
          name: model.name,
          bodyType: model.bodyType,
          yearFrom: model.yearFrom,
          yearTo: model.yearTo ?? null,
        },
        select: { id: true },
      });
      carIndex.set(`${brand.slug}/${model.slug}`, { brandId: savedBrand.id, modelId: savedModel.id });
      await presenceCount(existingModel, "CarModel");

      for (const generation of model.generations) {
        const existingGeneration = await prisma.generation.findUnique({
          where: { modelId_slug: { modelId: savedModel.id, slug: generation.slug } },
          select: { id: true },
        });
        const savedGeneration = await prisma.generation.upsert({
          where: { modelId_slug: { modelId: savedModel.id, slug: generation.slug } },
          create: {
            modelId: savedModel.id,
            name: generation.name,
            slug: generation.slug,
            yearFrom: generation.yearFrom,
            yearTo: generation.yearTo ?? null,
            bodyType: generation.bodyType,
            note: generation.note ?? null,
            imageUrl: `/images/products/universal-1.svg`,
          },
          update: {
            name: generation.name,
            yearFrom: generation.yearFrom,
            yearTo: generation.yearTo ?? null,
            bodyType: generation.bodyType,
            note: generation.note ?? null,
          },
          select: { id: true },
        });
        generationIds.push(savedGeneration.id);
        carIndex.set(`${brand.slug}/${model.slug}/${generation.slug}`, {
          brandId: savedBrand.id,
          modelId: savedModel.id,
          generationId: savedGeneration.id,
        });
        await presenceCount(existingGeneration, "Generation");

        // Модификации не имеют естественного уникального ключа — пересоздаём.
        await prisma.modification.deleteMany({ where: { generationId: savedGeneration.id } });
        await prisma.modification.createMany({
          data: generation.modifications.map((modification, index) => ({
            generationId: savedGeneration.id,
            name: modification.name,
            engine: modification.engine,
            volume: modification.volume,
            power: modification.power,
            fuel: modification.fuel,
            drive: modification.drive,
            transmission: modification.transmission,
            bodyType: modification.bodyType ?? generation.bodyType,
            yearFrom: modification.yearFrom ?? generation.yearFrom,
            yearTo: modification.yearTo ?? generation.yearTo ?? null,
            sortOrder: (index + 1) * 10,
          })),
        });
        bump("Modification", "created", generation.modifications.length);
      }
    }
  }

  return { productBrandIds, carBrandIds, carIndex, generationIds };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Товары
// ─────────────────────────────────────────────────────────────────────────────

async function seedProducts(
  categoryIds: Map<string, string>,
  attributeIds: Map<string, string>,
  brandIds: Map<string, string>,
  supplierIds: Map<string, string>,
): Promise<Map<string, string>> {
  const productIds = new Map<string, string>();
  const supplierSlugs = [...supplierIds.keys()];

  for (const [productIndex, product] of PRODUCTS.entries()) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Категория не найдена: ${product.category} (${product.sku})`);
    const manufacturerId = brandIds.get(product.brand) ?? null;
    if (!manufacturerId) throw new Error(`Бренд не найден: ${product.brand} (${product.sku})`);

    const supplierId = supplierSlugs.length
      ? supplierIds.get(supplierSlugs[productIndex % supplierSlugs.length]) ?? null
      : null;

    const data = {
      name: product.name,
      slug: product.slug,
      categoryId,
      manufacturerId,
      brandName: product.brand,
      supplierId,
      externalId: product.sku,
      shortDescription: product.shortDescription,
      description: product.description,
      warrantyMonths: product.warrantyMonths ?? null,
      price: product.price,
      oldPrice: product.oldPrice ?? null,
      stock: product.stock,
      unit: "шт",
      weight: product.weight,
      lengthMm: product.lengthMm ?? null,
      widthMm: product.widthMm ?? null,
      heightMm: product.heightMm ?? null,
      fitmentType: product.fitment.type === "universal" ? "universal" : "specific",
      fitmentNote: product.fitment.note ?? null,
      capacityKg: product.facets.capacityKg ?? null,
      verticalLoadKg: product.facets.verticalLoadKg ?? null,
      volumeL: product.facets.volumeL ?? null,
      material: product.facets.material ?? null,
      mountPlace: product.facets.mountPlace ?? null,
      profile: product.facets.profile ?? null,
      lockIncluded: product.facets.lockIncluded ?? null,
      electricIncluded: product.facets.electricIncluded ?? null,
      bumperCut: product.facets.bumperCut ?? null,
      doorsCount: product.facets.doorsCount ?? null,
      rentAvailable: product.facets.rentAvailable ?? false,
      isNew: product.isNew ?? false,
      isHit: product.isHit ?? false,
      isFeatured: product.isFeatured ?? false,
      sortOrder: product.sortOrder ?? 100,
      salesCount: product.salesCount ?? 0,
      viewsCount: product.viewsCount ?? 0,
      seoTitle: `${product.name} — купить с установкой | Garage19`,
      seoDescription: product.shortDescription.slice(0, 300),
      seoKeywords: `${product.name}, ${product.brand}, купить, цена, доставка`,
    };

    const existing = await prisma.product.findUnique({ where: { sku: product.sku }, select: { id: true } });
    const saved = await prisma.product.upsert({
      where: { sku: product.sku },
      create: { sku: product.sku, ...data },
      update: data,
      select: { id: true },
    });
    productIds.set(product.sku, saved.id);
    await presenceCount(existing, "Product");

    // Изображения и характеристики пересоздаём: они всегда выводятся из сида.
    await prisma.productImage.deleteMany({ where: { productId: saved.id } });
    await prisma.productImage.createMany({
      data: product.images.map((image, index) => ({
        productId: saved.id,
        url: `/images/products/${image}`,
        alt: `${product.name} — изображение ${index + 1}`,
        sortOrder: (index + 1) * 10,
        isPrimary: index === 0,
      })),
    });
    bump("ProductImage", "created", product.images.length);

    // Значения характеристик: колонки-фасеты + явные attributes
    const attributeValues: { attributeId: string; valueString?: string; valueNumber?: number; valueBool?: boolean }[] = [];
    const pushValue = (
      slug: string,
      value: string | number | boolean | undefined,
    ): void => {
      if (value === undefined) return;
      const attributeId = attributeIds.get(slug);
      if (!attributeId) return;
      if (typeof value === "boolean") attributeValues.push({ attributeId, valueBool: value });
      else if (typeof value === "number") attributeValues.push({ attributeId, valueNumber: value });
      else attributeValues.push({ attributeId, valueString: String(value) });
    };

    for (const [key, value] of Object.entries(product.facets.attributes ?? {})) {
      pushValue(resolveAttributeSlug(key), value);
    }
    pushValue("gruzopodyomnost", product.facets.capacityKg);
    pushValue("obyom", product.facets.volumeL);
    pushValue("material", product.facets.material);
    pushValue("mesto-ustanovki", product.facets.mountPlace);
    pushValue("profil", product.facets.profile);
    pushValue("zamok-v-komplekte", product.facets.lockIncluded);
    pushValue("vyrez-bampera", product.facets.bumperCut);
    pushValue("elektrika-v-komplekte", product.facets.electricIncluded);
    pushValue("kolichestvo-dverey", product.facets.doorsCount);
    pushValue("vertikalnaya-nagruzka", product.facets.verticalLoadKg);
    pushValue("garantiya", product.warrantyMonths);

    // Одна характеристика — одно значение: убираем дубли по attributeId.
    const uniqueValues = new Map<string, (typeof attributeValues)[number]>();
    for (const value of attributeValues) uniqueValues.set(value.attributeId, value);

    await prisma.productAttribute.deleteMany({ where: { productId: saved.id } });
    if (uniqueValues.size > 0) {
      await prisma.productAttribute.createMany({
        data: [...uniqueValues.values()].map((value) => ({ productId: saved.id, ...value })),
      });
      bump("ProductAttribute", "created", uniqueValues.size);
    }

    await prisma.productDocument.deleteMany({ where: { productId: saved.id } });
    const documents = documentSpecsFor(product);
    if (documents.length > 0) {
      await prisma.productDocument.createMany({
        data: documents.map((document, index) => ({
          productId: saved.id,
          type: document.type,
          title: document.title,
          url: document.url,
          fileSize: document.fileSize ?? null,
          sortOrder: (index + 1) * 10,
        })),
      });
      bump("ProductDocument", "created", documents.length);
    }
  }

  // Совместимость создаётся после всех товаров — см. seedFitments().
  return productIds;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Совместимость (Fitment) и связи товаров
// ─────────────────────────────────────────────────────────────────────────────

async function seedFitments(
  productIds: Map<string, string>,
  carIndex: Map<string, { brandId: string; modelId?: string; generationId?: string }>,
): Promise<void> {
  for (const product of PRODUCTS) {
    const productId = productIds.get(product.sku);
    if (!productId) continue;

    // Пересоздаём совместимость, чтобы она точно соответствовала сиду.
    await prisma.fitment.deleteMany({ where: { productId } });

    if (product.fitment.type === "universal") continue;

    const targets = new Set<string>(product.fitment.targets);
    for (const key of flagshipKeysFor(product)) targets.add(key);

    const rows: {
      productId: string;
      brandId: string;
      modelId: string | null;
      generationId: string | null;
      note: string | null;
    }[] = [];

    for (const target of targets) {
      const car = carIndex.get(target);
      if (!car) {
        bump("Fitment", "skipped");
        continue;
      }
      rows.push({
        productId,
        brandId: car.brandId,
        modelId: car.modelId ?? null,
        generationId: car.generationId ?? null,
        note: product.fitment.type === "specific" ? product.fitment.note ?? null : null,
      });
    }

    // Дедупликация: один и тот же уровень не должен повторяться.
    const seen = new Set<string>();
    const unique = rows.filter((row) => {
      const key = `${row.brandId}|${row.modelId ?? ""}|${row.generationId ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (unique.length > 0) {
      await prisma.fitment.createMany({ data: unique });
      bump("Fitment", "created", unique.length);
    }
  }
}

async function seedProductRelations(productIds: Map<string, string>): Promise<void> {
  const idBySlug = new Map<string, string>();
  for (const product of PRODUCTS) {
    const id = productIds.get(product.sku);
    if (id) idBySlug.set(product.slug, id);
  }

  for (const product of PRODUCTS) {
    const productId = productIds.get(product.sku);
    if (!productId) continue;

    await prisma.productRelation.deleteMany({
      where: { productId, type: { in: ["accessory", "analog"] } },
    });

    const rows: { productId: string; relatedProductId: string; type: string; sortOrder: number }[] = [];
    (product.accessories ?? []).forEach((slug, index) => {
      const related = idBySlug.get(slug);
      if (related && related !== productId) {
        rows.push({ productId, relatedProductId: related, type: "accessory", sortOrder: (index + 1) * 10 });
      } else if (!related) {
        bump("ProductRelation", "skipped");
      }
    });
    (product.analogs ?? []).forEach((slug, index) => {
      const related = idBySlug.get(slug);
      if (related && related !== productId) {
        rows.push({ productId, relatedProductId: related, type: "analog", sortOrder: (index + 1) * 10 });
      } else if (!related) {
        bump("ProductRelation", "skipped");
      }
    });

    if (rows.length > 0) {
      await prisma.productRelation.createMany({ data: rows });
      bump("ProductRelation", "created", rows.length);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Отзывы и вопросы
// ─────────────────────────────────────────────────────────────────────────────

async function seedReviews(productIds: Map<string, string>): Promise<void> {
  const productIdList = [...productIds.values()];

  if (productIdList.length > 0) {
    await prisma.review.deleteMany({ where: { productId: { in: productIdList } } });
    await prisma.productQuestion.deleteMany({ where: { productId: { in: productIdList } } });
  }
  bump("Review", "created", REVIEWS.length);
  bump("ProductQuestion", "created", QUESTIONS.length);

  const reviewsByProduct = new Map<string, { ratingSum: number; count: number }>();

  for (const review of REVIEWS) {
    const product = PRODUCTS[review.productIndex];
    if (!product) continue;
    const productId = productIds.get(product.sku);
    if (!productId) continue;

    await prisma.review.create({
      data: {
        productId,
        authorName: review.authorName,
        rating: review.rating,
        title: review.title,
        text: review.text,
        pros: review.pros ?? null,
        cons: review.cons ?? null,
        status: review.status,
        isVerified: review.isVerified,
        adminReply: review.adminReply ?? null,
        adminReplyAt: review.adminReply ? daysAgoDate(Math.max(0, review.daysAgo - 1)) : null,
        createdAt: daysAgoDate(review.daysAgo),
      },
    });

    if (review.status === "published") {
      const entry = reviewsByProduct.get(productId) ?? { ratingSum: 0, count: 0 };
      entry.ratingSum += review.rating;
      entry.count += 1;
      reviewsByProduct.set(productId, entry);
    }
  }

  for (const question of QUESTIONS) {
    const product = PRODUCTS[question.productIndex];
    if (!product) continue;
    const productId = productIds.get(product.sku);
    if (!productId) continue;

    await prisma.productQuestion.create({
      data: {
        productId,
        authorName: question.authorName,
        question: question.question,
        answer: question.answer ?? null,
        answeredBy: question.answer ? "Ольга Менеджерова" : null,
        answeredAt: question.answer ? daysAgoDate(Math.max(0, question.daysAgo - 1)) : null,
        status: question.status,
        isPinned: question.isPinned ?? false,
        createdAt: daysAgoDate(question.daysAgo),
      },
    });
  }

  // Пересчёт рейтинга: товары без опубликованных отзывов обнуляются.
  await prisma.product.updateMany({
    where: { id: { in: productIdList } },
    data: { ratingAvg: 0, ratingCount: 0 },
  });
  for (const [productId, entry] of reviewsByProduct) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        ratingAvg: Math.round((entry.ratingSum / entry.count) * 10) / 10,
        ratingCount: entry.count,
      },
    });
    bump("Product.rating", "updated");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Баннеры, города, доставка, поставщики
// ─────────────────────────────────────────────────────────────────────────────

async function seedBanners(): Promise<void> {
  // Естественного уникального ключа нет — ищем по заголовку и позиции.
  for (const banner of BANNERS) {
    const existing = await prisma.banner.findFirst({
      where: { title: banner.title, position: banner.position },
      select: { id: true },
    });
    const data = {
      title: banner.title,
      subtitle: banner.subtitle,
      description: banner.description,
      image: banner.image,
      mobileImage: banner.mobileImage ?? null,
      badge: banner.badge ?? null,
      linkUrl: banner.linkUrl,
      linkText: banner.linkText,
      position: banner.position,
      textAlign: banner.textAlign,
      sortOrder: banner.sortOrder,
      isActive: true,
    };
    if (existing) {
      await prisma.banner.update({ where: { id: existing.id }, data });
      bump("Banner", "updated");
    } else {
      await prisma.banner.create({ data });
      bump("Banner", "created");
    }
  }
}

async function seedCities(): Promise<Map<string, string>> {
  const cityIds = new Map<string, string>();

  for (const city of CITIES) {
    const existing = await prisma.city.findUnique({ where: { slug: city.slug }, select: { id: true } });
    const saved = await prisma.city.upsert({
      where: { slug: city.slug },
      create: {
        slug: city.slug,
        name: city.name,
        region: city.region,
        phone: city.phone,
        address: city.address,
        workTime: city.workTime,
        deliveryDays: city.deliveryDays,
        freeDeliveryFrom: city.freeDeliveryFrom,
        pickupAvailable: city.pickupAvailable,
        deliveryAvailable: true,
        isDefault: city.isDefault ?? false,
        sortOrder: city.sortOrder,
        seoTitle: city.seoTitle,
        seoDescription: city.seoDescription,
      },
      update: {
        name: city.name,
        region: city.region,
        phone: city.phone,
        address: city.address,
        workTime: city.workTime,
        deliveryDays: city.deliveryDays,
        freeDeliveryFrom: city.freeDeliveryFrom,
        pickupAvailable: city.pickupAvailable,
        isDefault: city.isDefault ?? false,
        sortOrder: city.sortOrder,
        seoTitle: city.seoTitle,
        seoDescription: city.seoDescription,
      },
      select: { id: true },
    });
    cityIds.set(city.slug, saved.id);
    await presenceCount(existing, "City");

    for (const point of city.pickupPoints) {
      const existingPoint = await prisma.pickupPoint.findUnique({
        where: { provider_code: { provider: point.provider, code: point.code } },
        select: { id: true },
      });
      const pointData = {
        provider: point.provider,
        cityId: saved.id,
        code: point.code,
        name: point.name,
        address: point.address,
        workTime: point.workTime,
        phone: point.phone ?? null,
      };
      await prisma.pickupPoint.upsert({
        where: { provider_code: { provider: point.provider, code: point.code } },
        create: pointData,
        update: pointData,
      });
      await presenceCount(existingPoint, "PickupPoint");
    }
  }

  // Тарифы на каждый город: ищем по (cityId, provider, name).
  for (const [citySlug, cityId] of cityIds) {
    void citySlug;
    for (const tariff of DELIVERY_TARIFFS) {
      const existing = await prisma.deliveryTariff.findFirst({
        where: { cityId, provider: tariff.provider, name: tariff.name },
        select: { id: true },
      });
      const data = {
        provider: tariff.provider,
        cityId,
        name: tariff.name,
        price: tariff.price,
        minDays: tariff.minDays,
        maxDays: tariff.maxDays,
        minOrderTotal: tariff.minOrderTotal ?? null,
        maxWeight: tariff.maxWeight ?? null,
        sortOrder: tariff.sortOrder,
      };
      if (existing) {
        await prisma.deliveryTariff.update({ where: { id: existing.id }, data });
        bump("DeliveryTariff", "updated");
      } else {
        await prisma.deliveryTariff.create({ data });
        bump("DeliveryTariff", "created");
      }
    }
  }

  return cityIds;
}

async function seedSuppliers(): Promise<Map<string, string>> {
  const supplierIds = new Map<string, string>();

  for (const supplier of SUPPLIERS) {
    const existing = await prisma.supplier.findUnique({ where: { slug: supplier.slug }, select: { id: true } });
    const data = {
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      priceUrl: supplier.priceUrl || null,
      feedType: supplier.feedType,
      marginPercent: supplier.marginPercent,
      note: supplier.note,
      isActive: true,
    };
    const saved = await prisma.supplier.upsert({
      where: { slug: supplier.slug },
      create: { slug: supplier.slug, ...data },
      update: data,
      select: { id: true },
    });
    supplierIds.set(supplier.slug, saved.id);
    await presenceCount(existing, "Supplier");
  }

  return supplierIds;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Пользователи, заказы, «гараж», записи на установку, заявки
// ─────────────────────────────────────────────────────────────────────────────

async function seedUsers(cityIds: Map<string, string>): Promise<{
  userIds: Map<string, string>;
  adminEmail: string;
  adminPassword: string;
}> {
  const userIds = new Map<string, string>();

  const adminEmail = process.env.ADMIN_EMAIL?.trim() || "admin@garage19.ru";
  const adminPassword = process.env.ADMIN_PASSWORD?.trim() || "Garage19!Admin";
  const adminName = process.env.ADMIN_NAME?.trim() || "Администратор";

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } });
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: adminName,
      role: "admin",
      passwordHash: await hashPassword(adminPassword),
      cityId: cityIds.get("moskva") ?? null,
      phone: "+7 (495) 190-19-19",
    },
    update: {
      name: adminName,
      role: "admin",
      cityId: cityIds.get("moskva") ?? null,
    },
    select: { id: true },
  });
  userIds.set(adminEmail, admin.id);
  await presenceCount(existingAdmin, "User (администратор)");

  const demoHash = await hashPassword(DEMO_PASSWORD);
  for (const user of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: user.email }, select: { id: true } });
    const data = {
      name: user.name,
      role: user.role,
      phone: user.phone ?? null,
      cityId: user.citySlug ? cityIds.get(user.citySlug) ?? null : null,
      isActive: true,
      createdAt: daysAgoDate(user.daysAgo),
    };
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      create: { email: user.email, passwordHash: demoHash, ...data },
      update: data,
      select: { id: true },
    });
    userIds.set(user.email, saved.id);
    await presenceCount(existing, "User");
  }

  for (const address of ADDRESSES) {
    const userId = userIds.get(address.userEmail);
    if (!userId) continue;
    const cityId = cityIds.get(address.citySlug) ?? null;
    const existing = await prisma.address.findFirst({
      where: { userId, street: address.street },
      select: { id: true },
    });
    const data = {
      userId,
      title: address.title,
      cityId,
      street: address.street,
      comment: address.comment ?? null,
      isDefault: address.isDefault ?? false,
    };
    if (existing) {
      await prisma.address.update({ where: { id: existing.id }, data });
      bump("Address", "updated");
    } else {
      await prisma.address.create({ data });
      bump("Address", "created");
    }
  }

  return { userIds, adminEmail, adminPassword };
}

async function seedOrders(userIds: Map<string, string>, cityIds: Map<string, string>): Promise<void> {
  const priceBySku = new Map(PRODUCTS.map((product) => [product.sku, product.price]));
  const productIdBySku = new Map(PRODUCTS.map((product) => [product.sku, product.slug]));

  for (const order of ORDERS) {
    const number = formatOrderNumber(order.sequence);
    const userId = order.userEmail ? userIds.get(order.userEmail) ?? null : null;
    const cityId = cityIds.get(order.citySlug) ?? null;
    const city = CITIES.find((item) => item.slug === order.citySlug);

    const items = order.items.map((item) => {
      const price = item.price ?? priceBySku.get(item.sku) ?? 0;
      const product = PRODUCTS.find((candidate) => candidate.sku === item.sku);
      return {
        sku: item.sku,
        name: product?.name ?? item.sku,
        slug: productIdBySku.get(item.sku) ?? null,
        image: product ? `/images/products/${product.images[0]}` : null,
        price,
        qty: item.qty,
        total: price * item.qty,
      };
    });

    const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);
    const discount = order.discount ?? 0;
    const total = itemsTotal + order.deliveryPrice - discount;
    const createdAt = daysAgoDate(order.daysAgo);

    const history =
      order.status === "canceled"
        ? [
            { status: "new", at: createdAt.toISOString(), note: "Заказ создан на сайте" },
            {
              status: "canceled",
              at: daysAgoDate(Math.max(0, order.daysAgo - 1)).toISOString(),
              note: order.managerComment ?? "Заказ отменён",
            },
          ]
        : [
            { status: "new", at: createdAt.toISOString(), note: "Заказ создан" },
            ...(order.status !== "new"
              ? [
                  {
                    status: "confirmed",
                    at: daysAgoDate(Math.max(0, order.daysAgo - 1)).toISOString(),
                    note: "Подтверждён менеджером",
                  },
                ]
              : []),
            ...(["assembling", "shipped", "done"].includes(order.status)
              ? [
                  {
                    status: "assembling",
                    at: daysAgoDate(Math.max(0, order.daysAgo - 2)).toISOString(),
                    note: "Комплектуется на складе",
                  },
                ]
              : []),
            ...(["shipped", "done"].includes(order.status)
              ? [
                  {
                    status: "shipped",
                    at: daysAgoDate(Math.max(0, order.daysAgo - 3)).toISOString(),
                    note: "Передан в службу доставки",
                  },
                ]
              : []),
            ...(order.status === "done"
              ? [
                  {
                    status: "done",
                    at: daysAgoDate(Math.max(0, order.daysAgo - 5)).toISOString(),
                    note: "Заказ получен покупателем",
                  },
                ]
              : []),
          ];

    const data = {
      userId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail ?? null,
      cityId,
      cityName: city?.name ?? "Москва",
      deliveryType: order.deliveryType,
      deliveryProvider: order.deliveryProvider ?? null,
      deliveryAddress: order.deliveryAddress ?? null,
      pickupPointAddress: order.pickupPointAddress ?? null,
      deliveryPrice: order.deliveryPrice,
      deliveryDaysMin: order.deliveryDaysMin ?? null,
      deliveryDaysMax: order.deliveryDaysMax ?? null,
      paymentType: order.paymentType,
      status: order.status,
      paymentStatus: order.paymentStatus,
      installRequested: order.installRequested ?? false,
      installPrice: order.installPrice ?? null,
      itemsTotal,
      discount,
      total,
      promoCode: order.promoCode ?? null,
      comment: order.comment ?? null,
      managerComment: order.managerComment ?? null,
      source: order.source,
      carInfo: order.carInfo ?? null,
      statusHistory: history,
      ip: order.ip || null,
      createdAt,
      confirmedAt: order.status === "new" ? null : daysAgoDate(Math.max(0, order.daysAgo - 1)),
      shippedAt: ["shipped", "done"].includes(order.status) ? daysAgoDate(Math.max(0, order.daysAgo - 3)) : null,
      doneAt: order.status === "done" ? daysAgoDate(Math.max(0, order.daysAgo - 5)) : null,
      canceledAt: order.status === "canceled" ? daysAgoDate(Math.max(0, order.daysAgo - 1)) : null,
      paidAt: order.paymentStatus === "paid" ? daysAgoDate(order.daysAgo) : null,
    };

    const existing = await prisma.order.findUnique({ where: { number }, select: { id: true } });
    const saved = await prisma.order.upsert({
      where: { number },
      create: { number, ...data },
      update: data,
      select: { id: true },
    });
    await presenceCount(existing, "Order");

    await prisma.orderItem.deleteMany({ where: { orderId: saved.id } });
    await prisma.orderItem.createMany({
      data: items.map((item) => ({
        orderId: saved.id,
        productId: null,
        name: item.name,
        sku: item.sku,
        slug: item.slug,
        image: item.image,
        price: item.price,
        qty: item.qty,
        total: item.total,
      })),
    });
    bump("OrderItem", "created", items.length);
  }
}

async function seedSavedCars(
  userIds: Map<string, string>,
  carIndex: Map<string, { brandId: string; modelId?: string; generationId?: string }>,
): Promise<void> {
  for (const saved of SAVED_CARS) {
    const userId = userIds.get(saved.userEmail);
    if (!userId) continue;
    const key = [saved.brandSlug, saved.modelSlug ?? "", saved.generationSlug ?? ""].join("/");
    const car = carIndex.get(key);
    if (!car) {
      bump("SavedCar", "skipped");
      continue;
    }

    const existing = await prisma.savedCar.findFirst({
      where: {
        userId,
        brandId: car.brandId,
        modelId: car.modelId ?? null,
        generationId: car.generationId ?? null,
        modificationId: null,
      },
      select: { id: true },
    });
    const data = {
      userId,
      brandId: car.brandId,
      modelId: car.modelId ?? null,
      generationId: car.generationId ?? null,
      modificationId: null,
      label: saved.label ?? null,
      isPrimary: saved.isPrimary ?? false,
      createdAt: daysAgoDate(saved.daysAgo),
    };
    if (existing) {
      await prisma.savedCar.update({ where: { id: existing.id }, data });
      bump("SavedCar", "updated");
    } else {
      await prisma.savedCar.create({ data });
      bump("SavedCar", "created");
    }
  }
}

async function seedInstallBookings(cityIds: Map<string, string>): Promise<void> {
  for (const booking of INSTALL_BOOKINGS) {
    const productIdList = booking.productSkus
      .map((sku) => PRODUCTS.find((product) => product.sku === sku))
      .filter(Boolean)
      .map((product) => product?.slug)
      .filter((slug): slug is string => Boolean(slug));

    const existing = await prisma.installBooking.findFirst({
      where: { phone: booking.phone, carInfo: booking.carInfo },
      select: { id: true },
    });
    const data = {
      name: booking.name,
      phone: booking.phone,
      email: booking.email ?? null,
      cityId: cityIds.get(booking.citySlug) ?? null,
      carInfo: booking.carInfo,
      productIds: booking.productSkus.join(","),
      comment: booking.comment ? `${booking.comment} (${productIdList.join(", ")})` : productIdList.join(", "),
      slotDate: new Date(`${booking.slotDateIso}T00:00:00.000Z`),
      slotTime: booking.slotTime,
      price: booking.price,
      status: booking.status,
      managerComment: booking.managerComment ?? null,
    };
    if (existing) {
      await prisma.installBooking.update({ where: { id: existing.id }, data });
      bump("InstallBooking", "updated");
    } else {
      await prisma.installBooking.create({ data });
      bump("InstallBooking", "created");
    }
  }
}

async function seedSubscribers(): Promise<void> {
  for (const email of SUBSCRIBERS) {
    const existing = await prisma.subscriber.findUnique({ where: { email }, select: { id: true } });
    await prisma.subscriber.upsert({
      where: { email },
      create: { email },
      update: { isActive: true },
    });
    await presenceCount(existing, "Subscriber");
  }
}

async function seedCallbacks(productIds: Map<string, string>): Promise<void> {
  for (const callback of CALLBACKS) {
    const productId = callback.productSku ? productIds.get(callback.productSku) ?? null : null;
    const existing = await prisma.callbackRequest.findFirst({
      where: { phone: callback.phone, type: callback.type, message: callback.message ?? null },
      select: { id: true },
    });
    const data = {
      type: callback.type,
      name: callback.name,
      phone: callback.phone,
      email: callback.email ?? null,
      message: callback.message ?? null,
      carInfo: callback.carInfo ?? null,
      productId,
      status: callback.status,
      managerComment: callback.managerComment ?? null,
      source: callback.source,
      createdAt: daysAgoDate(callback.daysAgo),
      processedAt: callback.status === "done" ? daysAgoDate(Math.max(0, callback.daysAgo - 1)) : null,
    };
    if (existing) {
      await prisma.callbackRequest.update({ where: { id: existing.id }, data });
      bump("CallbackRequest", "updated");
    } else {
      await prisma.callbackRequest.create({ data });
      bump("CallbackRequest", "created");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Сводка
// ─────────────────────────────────────────────────────────────────────────────

async function printSummary(startedAt: number): Promise<void> {
  const order = [
    "Setting",
    "Page",
    "Category",
    "Attribute",
    "Brand (производитель)",
    "Brand (марка авто)",
    "CarModel",
    "Generation",
    "Product",
    "Banner",
    "City",
    "PickupPoint",
    "DeliveryTariff",
    "Supplier",
    "User",
    "User (администратор)",
    "Address",
    "Order",
    "SavedCar",
    "InstallBooking",
    "Subscriber",
    "CallbackRequest",
    "Product.rating",
  ];

  /** Сущности, которые пересоздаются на каждом запуске (естественного ключа нет). */
  const recreated = [
    "Modification",
    "ProductImage",
    "ProductAttribute",
    "ProductDocument",
    "Fitment",
    "ProductRelation",
    "Review",
    "ProductQuestion",
    "OrderItem",
  ];

  const totals = { created: 0, updated: 0, skipped: 0, recreated: 0 };
  const lines: string[] = [];

  for (const entity of order) {
    const entry = counters.get(entity);
    if (!entry) continue;
    totals.created += entry.created;
    totals.updated += entry.updated;
    totals.skipped += entry.skipped;
    const skipped = entry.skipped > 0 ? `, пропущено ${entry.skipped}` : "";
    lines.push(`  ${entity.padEnd(24)} создано ${String(entry.created).padStart(5)}   обновлено ${String(entry.updated).padStart(5)}${skipped}`);
  }

  const recreatedLines: string[] = [];
  for (const entity of recreated) {
    const entry = counters.get(entity);
    if (!entry) continue;
    totals.recreated += entry.created + entry.skipped;
    const skipped = entry.skipped > 0 ? `, пропущено ${entry.skipped}` : "";
    recreatedLines.push(`  ${entity.padEnd(24)} ${String(entry.created + entry.skipped).padStart(5)} записей${skipped}`);
  }

  const [products, fitments, reviews, questions, cities, pickupPoints, users, orders] = await Promise.all([
    prisma.product.count(),
    prisma.fitment.count(),
    prisma.review.count(),
    prisma.productQuestion.count(),
    prisma.city.count(),
    prisma.pickupPoint.count(),
    prisma.user.count(),
    prisma.order.count(),
  ]);

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log("\n──────────────────────────────────────────────────────────────");
  console.log("Garage19 — демо-данные загружены");
  console.log("──────────────────────────────────────────────────────────────");
  console.log("  Upsert по стабильному ключу:");
  for (const line of lines) console.log(line);
  console.log("\n  Пересоздано (нет естественного ключа):");
  for (const line of recreatedLines) console.log(line);
  console.log("  ──────────────────────────────────────────────────────────");
  console.log(`  ${"ИТОГО".padEnd(24)} создано ${String(totals.created).padStart(5)}   обновлено ${String(totals.updated).padStart(5)}   пересоздано ${String(totals.recreated).padStart(5)}${totals.skipped ? `, пропущено ${totals.skipped}` : ""}`);
  console.log("\n  Состояние БД:");
  console.log(`    товаров ${products}, совместимостей ${fitments}, отзывов ${reviews}, вопросов ${questions}`);
  console.log(`    городов ${cities}, пунктов выдачи ${pickupPoints}, пользователей ${users}, заказов ${orders}`);
  console.log(`\n  Готово за ${seconds} с.`);
  console.log("──────────────────────────────────────────────────────────────\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Точка входа
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log("Garage19: загрузка демо-данных...");

  // Проверяем соединение до тяжёлых операций
  await prisma.$connect();
  console.log(`  БД: ${(process.env.DATABASE_URL ?? "").replace(/:[^:@/]+@/, ":***@")}`);

  await seedSettings();
  await seedPages();
  const categoryIds = await seedCategories();
  const attributeIds = await seedAttributes(categoryIds);
  const { productBrandIds, carIndex } = await seedBrands();
  const supplierIds = await seedSuppliers();
  const productIds = await seedProducts(categoryIds, attributeIds, productBrandIds, supplierIds);
  await seedFitments(productIds, carIndex);
  await seedProductRelations(productIds);
  await seedReviews(productIds);
  await seedBanners();
  const cityIds = await seedCities();
  const { userIds, adminEmail, adminPassword } = await seedUsers(cityIds);
  await seedOrders(userIds, cityIds);
  await seedSavedCars(userIds, carIndex);
  await seedInstallBookings(cityIds);
  await seedSubscribers();
  await seedCallbacks(productIds);

  await printSummary(startedAt);

  console.log(`  Администратор: ${adminEmail} / ${adminPassword}`);
  console.log(`  Демо-покупатели: пароль ${DEMO_PASSWORD}`);
  console.log("  (пароль администратора задаётся ADMIN_EMAIL/ADMIN_PASSWORD в .env)\n");
}

main()
  .catch((error: unknown) => {
    console.error("\nОшибка сидирования:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
