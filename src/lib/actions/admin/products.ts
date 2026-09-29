"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import {
  audit,
  fail,
  getFormBool,
  getFormBoolStrict,
  getFormFloat,
  getFormInt,
  getFormLines,
  getFormList,
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  parseDelimited,
  redirectWith,
  errorToastCode,
  runTransaction as runTx,
  toState,
  type ActionResult,
  type ActionState,
  type TxClient,
} from "@/lib/admin/actions";
import { saveUpload } from "@/lib/admin/upload";

/**
 * Товары: CRUD, массовые действия, цены, изображения, характеристики,
 * документы и связи (`ProductRelation`).
 * Деньги — копейки, вес — граммы, габариты — миллиметры (см. ARCHITECTURE.md).
 */

type ParsedProduct = {
  name: string;
  slug: string;
  sku: string | null;
  categoryId: string;
  manufacturerId: string | null;
  brandName: string | null;
  shortDescription: string | null;
  description: string | null;
  warrantyMonths: number | null;
  price: number;
  oldPrice: number | null;
  purchasePrice: number | null;
  stock: number;
  reserved: number;
  unit: string;
  weight: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  fitmentType: string;
  fitmentNote: string | null;
  capacityKg: number | null;
  verticalLoadKg: number | null;
  volumeL: number | null;
  material: string | null;
  mountPlace: string | null;
  profile: string | null;
  doorsCount: number | null;
  lockIncluded: boolean | null;
  bumperCut: boolean | null;
  electricIncluded: boolean | null;
  rentAvailable: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isHit: boolean;
  isNew: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  supplierId: string | null;
  externalId: string | null;
  images: string[];
  documents: string[];
  attributes: { attributeId: string; value: string }[];
  relations: { relatedProductId: string; type: string }[];
};

const RELATION_TYPES = ["accessory", "analog", "similar"] as const;
const FITMENT_TYPES = ["specific", "universal"] as const;
const DOCUMENT_TYPES = ["instruction", "passport", "certificate", "manual", "other"] as const;

function priceToKopecks(raw: string): number | null {
  const normalized = raw.replace(/\s|₽|руб\.?/gi, "").replace(",", ".");
  if (normalized === "") return null;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

function parseProductForm(formData: FormData): { data: ParsedProduct } | { error: string } {
  const name = getFormString(formData, "name");
  if (!name) return { error: "Укажите название товара" };

  const categoryId = getFormString(formData, "categoryId");
  if (!categoryId) return { error: "Выберите категорию" };

  const priceRaw = getFormString(formData, "price");
  if (priceRaw === "") return { error: "Укажите цену" };
  const price = priceToKopecks(priceRaw);
  if (price === null || price < 0) return { error: "Цена указана некорректно" };

  const slug = slugify(getFormString(formData, "slug") || name);

  return {
    data: {
      name,
      slug,
      sku: getFormOptional(formData, "sku") ?? null,
      categoryId,
      manufacturerId: getFormOptional(formData, "manufacturerId") ?? null,
      brandName: getFormOptional(formData, "brandName") ?? null,
      shortDescription: getFormOptional(formData, "shortDescription") ?? null,
      description: getFormOptional(formData, "description") ?? null,
      warrantyMonths: getFormInt(formData, "warrantyMonths") ?? null,
      price,
      oldPrice: priceToKopecks(getFormString(formData, "oldPrice")),
      purchasePrice: priceToKopecks(getFormString(formData, "purchasePrice")),
      stock: getFormInt(formData, "stock") ?? 0,
      reserved: getFormInt(formData, "reserved") ?? 0,
      unit: getFormString(formData, "unit") || "шт",
      weight: getFormInt(formData, "weight") ?? null,
      lengthMm: getFormInt(formData, "lengthMm") ?? null,
      widthMm: getFormInt(formData, "widthMm") ?? null,
      heightMm: getFormInt(formData, "heightMm") ?? null,
      fitmentType: getFormString(formData, "fitmentType") === "universal" ? "universal" : "specific",
      fitmentNote: getFormOptional(formData, "fitmentNote") ?? null,
      capacityKg: getFormInt(formData, "capacityKg") ?? null,
      verticalLoadKg: getFormInt(formData, "verticalLoadKg") ?? null,
      volumeL: getFormInt(formData, "volumeL") ?? null,
      material: getFormOptional(formData, "material") ?? null,
      mountPlace: getFormOptional(formData, "mountPlace") ?? null,
      profile: getFormOptional(formData, "profile") ?? null,
      doorsCount: getFormInt(formData, "doorsCount") ?? null,
      lockIncluded: getFormBoolStrict(formData, "lockIncluded") ?? null,
      bumperCut: getFormBoolStrict(formData, "bumperCut") ?? null,
      electricIncluded: getFormBoolStrict(formData, "electricIncluded") ?? null,
      rentAvailable: getFormBool(formData, "rentAvailable"),
      isActive: getFormBoolStrict(formData, "isActive") ?? false,
      isFeatured: getFormBool(formData, "isFeatured"),
      isHit: getFormBool(formData, "isHit"),
      isNew: getFormBool(formData, "isNew"),
      sortOrder: getFormInt(formData, "sortOrder") ?? 100,
      seoTitle: getFormOptional(formData, "seoTitle") ?? null,
      seoDescription: getFormOptional(formData, "seoDescription") ?? null,
      seoKeywords: getFormOptional(formData, "seoKeywords") ?? null,
      supplierId: getFormOptional(formData, "supplierId") ?? null,
      externalId: getFormOptional(formData, "externalId") ?? null,
      images: getFormLines(formData, "images"),
      documents: getFormLines(formData, "documents"),
      attributes: parseAttributeValues(formData),
      relations: getFormList(formData, "relations").map((id) => ({ relatedProductId: id, type: "accessory" })),
    },
  };
}

/** Значения характеристик: поля формы называются `attr_<attributeId>`. */
function parseAttributeValues(formData: FormData): { attributeId: string; value: string }[] {
  const result: { attributeId: string; value: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("attr_")) continue;
    const attributeId = key.slice(5);
    if (!isId(attributeId)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed === "") continue;
    result.push({ attributeId, value: trimmed });
  }
  return result;
}

async function collectImageUrls(formData: FormData, current: string[]): Promise<{ urls: string[]; uploaded: string[] }> {
  const urls = [...getFormLines(formData, "images")];
  const uploaded: string[] = [];
  const files = formData.getAll("imagesFiles").filter((value): value is File => typeof value === "object" && value !== null);
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const result = await saveUpload(file, "products");
    if (result.ok) {
      uploaded.push(result.url);
      urls.push(result.url);
    }
  }
  const unique = Array.from(new Set(urls.filter((url) => url !== "")));
  if (unique.length === 0 && uploaded.length === 0) return { urls: current.length > 0 ? [] : [], uploaded };
  return { urls: unique, uploaded };
}

async function syncImages(tx: TxClient, productId: string, urls: string[]): Promise<void> {
  await tx.productImage.deleteMany({ where: { productId } });
  if (urls.length === 0) return;
  await tx.productImage.createMany({
    data: urls.map((url, index) => ({
      productId,
      url,
      sortOrder: (index + 1) * 10,
      isPrimary: index === 0,
    })),
  });
}

async function syncAttributes(
  tx: TxClient,
  productId: string,
  values: { attributeId: string; value: string }[],
): Promise<void> {
  if (values.length === 0) return;
  const attributeIds = values.map((item) => item.attributeId);
  const attributes = await tx.attribute.findMany({
    where: { id: { in: attributeIds } },
    select: { id: true, type: true },
  });
  const typeById = new Map(attributes.map((attribute) => [attribute.id, attribute.type]));

  await tx.productAttribute.deleteMany({ where: { productId, attributeId: { in: attributeIds } } });

  for (const item of values) {
    const type = typeById.get(item.attributeId);
    if (!type) continue;
    const isNumber = type === "number";
    const isBool = type === "bool";
    const numeric = Number.parseFloat(item.value.replace(",", "."));
    await tx.productAttribute.create({
      data: {
        productId,
        attributeId: item.attributeId,
        valueString: isNumber || isBool ? null : item.value,
        valueNumber: isNumber && Number.isFinite(numeric) ? numeric : null,
        valueBool: isBool ? item.value === "true" || item.value === "1" || item.value === "on" : null,
      },
    });
  }
}

function parseDocuments(lines: string[]): { type: string; title: string; url: string }[] {
  const parsed: { type: string; title: string; url: string }[] = [];
  for (const [type, title, url] of parseDelimited(lines, 3)) {
    if (!url) continue;
    const safeType = (DOCUMENT_TYPES as readonly string[]).includes(type) ? type : "instruction";
    parsed.push({ type: safeType, title: title || "Документ", url });
  }
  return parsed;
}

async function syncDocuments(
  tx: TxClient,
  productId: string,
  documents: { type: string; title: string; url: string }[],
): Promise<void> {
  await tx.productDocument.deleteMany({ where: { productId } });
  if (documents.length === 0) return;
  await tx.productDocument.createMany({
    data: documents.map((document, index) => ({
      productId,
      type: document.type,
      title: document.title,
      url: document.url,
      sortOrder: (index + 1) * 10,
    })),
  });
}

/** Читаемая ошибка уникальности slug/sku. */
function uniqueErrorMessage(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") {
    const target = (error as { meta?: { target?: unknown } }).meta?.target;
    const fields = Array.isArray(target) ? target.join(", ") : String(target ?? "");
    if (fields.includes("slug")) return "Такой slug уже занят — укажите другой";
    if (fields.includes("sku")) return "Такой артикул уже используется";
    return "Такое значение уже используется (slug или артикул)";
  }
  return null;
}

function revalidateProducts(id?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  if (id) revalidatePath(`/admin/products/${id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function createProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("products", async (user) => {
    const parsed = parseProductForm(formData);
    if ("error" in parsed) return fail(parsed.error);
    const { data } = parsed;

    // Уникальность slug проверяем заранее — понятная ошибка вместо P2002.
    const existing = await prisma.product.findUnique({ where: { slug: data.slug }, select: { id: true } });
    if (existing) return fail(`Slug «${data.slug}» уже занят — укажите другой`);

    const { images, documents, attributes, ...productData } = data;

    const product = await runTx(async (tx) => {
      const created = await tx.product.create({ data: productData });
      await syncImages(tx, created.id, images);
      await syncAttributes(tx, created.id, attributes);
      await syncDocuments(tx, created.id, parseDocuments(documents));
      return created;
    });

    await audit(user, "create", "product", product.id, { name: product.name, slug: product.slug, price: product.price });
    revalidateProducts();
    redirectWith(`/admin/products/${product.id}`, "product.created");
  });
}

export async function updateProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("products", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Товар не найден");

    const parsed = parseProductForm(formData);
    if ("error" in parsed) return fail(parsed.error);
    const { data } = parsed;

    const current = await prisma.product.findUnique({
      where: { id },
      select: { id: true, slug: true, price: true, stock: true, images: true, isActive: true },
    });
    if (!current) return fail("Товар не найден");

    if (data.slug !== current.slug) {
      const busy = await prisma.product.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (busy) return fail(`Slug «${data.slug}» уже занят — укажите другой`);
    }

    const { images, documents, attributes, ...productData } = data;

    try {
      await runTx(async (tx) => {
        await tx.product.update({ where: { id }, data: productData });
        await syncImages(tx, id, images);
        await syncAttributes(tx, id, attributes);
        await syncDocuments(tx, id, parseDocuments(documents));
        await tx.productAttribute.deleteMany({
          where: { productId: id, attributeId: { notIn: attributes.map((item) => item.attributeId) } },
        });
      });
    } catch (error) {
      const message = uniqueErrorMessage(error);
      if (message) return fail(message);
      throw error;
    }

    await audit(user, "update", "product", id, {
      name: data.name,
      price: { before: current.price, after: data.price },
      stock: { before: current.stock, after: data.stock },
      isActive: { before: current.isActive, after: data.isActive },
    });
    revalidateProducts(id);
    return { ok: true };
  });
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/products", "error.forbidden");
  }
  if (!isId(id)) {
    redirectWith("/admin/products", "error.notfound");
  }

  try {
    const product = await prisma.product.findUnique({ where: { id }, select: { name: true, _count: { select: { orderItems: true } } } });
    if (!product) {
      redirectWith("/admin/products", "error.notfound");
    }
    if (product._count.orderItems > 0) {
      // Товар есть в заказах — не удаляем, а скрываем с витрины.
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      await audit(user, "update", "product", id, { archived: true, reason: "есть в заказах" });
      revalidateProducts(id);
      redirectWith("/admin/products", "product.updated");
    }
    await prisma.product.delete({ where: { id } });
    await audit(user, "delete", "product", id, { name: product.name });
  } catch {
    redirectWith("/admin/products", "error.relation");
  }

  revalidateProducts();
  redirectWith("/admin/products", "product.deleted");
}

// ─────────────────────────────────────────────────────────────────────────────
// Массовые действия
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkProductAction(formData: FormData): Promise<void> {
  const result = await guardAction("products", async (user) => {
    const ids = getFormList(formData, "ids").filter(isId);
    const operation = getFormString(formData, "operation");
    const value = getFormFloat(formData, "value");

    if (ids.length === 0) return fail("Выберите хотя бы один товар");

    switch (operation) {
      case "activate":
      case "deactivate":
      case "feature":
      case "unfeature":
      case "hit":
      case "unhit": {
        const data =
          operation === "activate"
            ? { isActive: true }
            : operation === "deactivate"
              ? { isActive: false }
              : operation === "feature"
                ? { isFeatured: true }
                : operation === "unfeature"
                  ? { isFeatured: false }
                  : operation === "hit"
                    ? { isHit: true }
                    : { isHit: false };
        await prisma.product.updateMany({ where: { id: { in: ids } }, data });
        break;
      }
      case "price_percent": {
        if (value === undefined || value === 0) return fail("Укажите процент изменения цены");
        const products = await prisma.product.findMany({
          where: { id: { in: ids } },
          select: { id: true, price: true },
        });
        await runTx(async (tx) => {
          for (const product of products) {
            const nextPrice = Math.max(0, Math.round(product.price * (1 + value / 100)));
            await tx.product.update({ where: { id: product.id }, data: { price: nextPrice } });
          }
        });
        break;
      }
      case "price_set": {
        if (value === undefined || value < 0) return fail("Укажите новую цену");
        const kopecks = Math.round(value * 100);
        await prisma.product.updateMany({ where: { id: { in: ids } }, data: { price: kopecks } });
        break;
      }
      case "stock_set": {
        if (value === undefined || value < 0) return fail("Укажите остаток");
        await prisma.product.updateMany({ where: { id: { in: ids } }, data: { stock: Math.round(value) } });
        break;
      }
      default:
        return fail("Неизвестное массовое действие");
    }

    await audit(user, "update", "product", null, { bulk: operation, value, count: ids.length, ids: ids.slice(0, 50) });
    revalidateProducts();
    return { ok: true };
  });

  redirectWith("/admin/products", errorToastCode(result) ?? "product.bulk");
}

/** Изменение цены одного товара на процент (со страницы товара). */
export async function changeProductPriceAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = getFormString(formData, "id");
  const result = await guardAction("products", async (user) => {
    const percentValue = getFormFloat(formData, "percent");
    if (!isId(id)) return fail("Товар не найден");
    if (percentValue === undefined || percentValue === 0) return fail("Укажите процент");

    const product = await prisma.product.findUnique({ where: { id }, select: { price: true } });
    if (!product) return fail("Товар не найден");

    const nextPrice = Math.max(0, Math.round(product.price * (1 + percentValue / 100)));
    await prisma.product.update({ where: { id }, data: { price: nextPrice } });
    await audit(user, "update", "product", id, { price: { before: product.price, after: nextPrice }, percent: percentValue });
    return { ok: true };
  });
  revalidateProducts(isId(id) ? id : undefined);
  return toState(result);
}

// ─────────────────────────────────────────────────────────────────────────────
// Изображения, характеристики, документы
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProductImagesAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = getFormString(formData, "id");
  const result = await guardAction("products", async (user) => {
    if (!isId(id)) return fail("Товар не найден");

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, images: { orderBy: { sortOrder: "asc" }, select: { url: true } } },
    });
    if (!product) return fail("Товар не найден");

    const { urls, uploaded } = await collectImageUrls(
      formData,
      product.images.map((image) => image.url),
    );

    await runTx(async (tx) => {
      await syncImages(tx, id, urls);
    });

    await audit(user, "update", "product", id, { images: urls.length, uploaded });
    return { ok: true };
  });
  revalidateProducts(isId(id) ? id : undefined);
  return toState(result);
}

export async function updateProductAttributesAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = getFormString(formData, "id");
  const result = await guardAction("products", async (user) => {
    if (!isId(id)) return fail("Товар не найден");

    const values = parseAttributeValues(formData);
    await runTx(async (tx) => {
      await syncAttributes(tx, id, values);
      await tx.productAttribute.deleteMany({
        where: { productId: id, attributeId: { notIn: values.map((item) => item.attributeId) } },
      });
    });

    await audit(user, "update", "product", id, { attributes: values.length });
    return { ok: true };
  });
  revalidateProducts(isId(id) ? id : undefined);
  return toState(result);
}

export async function updateProductDocumentsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = getFormString(formData, "id");
  const result = await guardAction("products", async (user) => {
    if (!isId(id)) return fail("Товар не найден");

    const documents = parseDocuments(getFormLines(formData, "documents"));
    const uploaded: string[] = [];
    const files = formData.getAll("documentFiles").filter((value): value is File => typeof value === "object" && value !== null);
    for (const file of files) {
      if (!file || file.size === 0) continue;
      const uploadResult = await saveUpload(file, "documents");
      if (uploadResult.ok) {
        uploaded.push(uploadResult.url);
        documents.push({ type: "other", title: file.name, url: uploadResult.url });
      }
    }

    await runTx(async (tx) => {
      await syncDocuments(tx, id, documents);
    });

    await audit(user, "update", "product", id, { documents: documents.length, uploaded });
    return { ok: true };
  });
  revalidateProducts(isId(id) ? id : undefined);
  return toState(result);
}

export async function updateProductRelationsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = getFormString(formData, "id");
  const result = await guardAction("products", async (user) => {
    if (!isId(id)) return fail("Товар не найден");

    const type = getFormString(formData, "relationType") || "accessory";
    const safeType = (RELATION_TYPES as readonly string[]).includes(type) ? type : "accessory";
    const relatedIds = getFormList(formData, "relatedIds").filter((value) => isId(value) && value !== id);

    if (relatedIds.length === 0) return fail("Выберите хотя бы один товар");

    await prisma.productRelation.createMany({
      data: relatedIds.map((relatedProductId) => ({ productId: id, relatedProductId, type: safeType })),
      skipDuplicates: true,
    });

    await audit(user, "update", "product", id, { relations: { type: safeType, added: relatedIds.length } });
    return { ok: true };
  });
  revalidateProducts(isId(id) ? id : undefined);
  return toState(result);
}

export async function deleteProductRelationAction(formData: FormData): Promise<void> {
  const relationId = getFormString(formData, "relationId");
  const productId = getFormString(formData, "productId");

  await guardAction("products", async (user) => {
    if (!isId(relationId)) return fail("Связь не найдена");
    await prisma.productRelation.delete({ where: { id: relationId } });
    await audit(user, "delete", "productRelation", relationId, { productId });
    revalidateProducts(productId);
    return { ok: true };
  });

  redirectWith(isId(productId) ? `/admin/products/${productId}` : "/admin/products", "product.relations");
}
