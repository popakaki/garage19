"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import {
  audit,
  fail,
  getFormInt,
  getFormList,
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  redirectWith,
  type ActionResult,
} from "@/lib/admin/actions";

/**
 * Совместимость (Fitment): массовая привязка товаров к авто, удаление привязок
 * по фильтру, просмотр в обе стороны («какие товары подходят к авто» и
 * «к каким авто подходит товар»).
 *
 * Уровни: brandId обязателен, modelId/generationId/modificationId — опциональны.
 * Товар подходит к авто, если fitmentType = universal или есть подходящая запись.
 */

function revalidateFitments(productIds: string[] = []): void {
  revalidatePath("/admin/compatibility");
  revalidatePath("/admin/products");
  for (const id of productIds.slice(0, 20)) revalidatePath(`/admin/products/${id}`);
}

/** Массовое создание привязок: выбранные товары × выбранное авто. */
export async function createFitmentsAction(formData: FormData): Promise<void> {
  let toast = "fitment.created";
  const productIds = getFormList(formData, "productIds").filter(isId);

  await guardAction("compatibility", async (user) => {
    const brandId = getFormString(formData, "brandId");
    if (productIds.length === 0) return fail("Выберите хотя бы один товар");
    if (!isId(brandId)) return fail("Выберите марку автомобиля");

    const modelId = getFormOptional(formData, "modelId") ?? null;
    const generationId = getFormOptional(formData, "generationId") ?? null;
    const modificationId = getFormOptional(formData, "modificationId") ?? null;
    const note = getFormOptional(formData, "note") ?? null;
    let yearFrom = getFormInt(formData, "yearFrom") ?? null;
    let yearTo = getFormInt(formData, "yearTo") ?? null;

    // Если годы не указаны, а выбрано поколение — берём их из справочника.
    if ((yearFrom === null || yearTo === null) && generationId) {
      const generation = await prisma.generation.findUnique({
        where: { id: generationId },
        select: { yearFrom: true, yearTo: true },
      });
      if (generation) {
        yearFrom = yearFrom ?? generation.yearFrom;
        yearTo = yearTo ?? generation.yearTo;
      }
    }

    const existing = await prisma.fitment.findMany({
      where: {
        productId: { in: productIds },
        brandId,
        modelId,
        generationId,
        modificationId,
      },
      select: { productId: true },
    });
    const exists = new Set(existing.map((item) => item.productId));
    const toCreate = productIds.filter((id) => !exists.has(id));

    if (toCreate.length > 0) {
      await prisma.fitment.createMany({
        data: toCreate.map((productId) => ({
          productId,
          brandId,
          modelId,
          generationId,
          modificationId,
          yearFrom,
          yearTo,
          note,
        })),
      });
    }

    // Товары с привязками перестают быть «универсальными».
    await prisma.product.updateMany({
      where: { id: { in: toCreate } },
      data: { fitmentType: "specific" },
    });

    await audit(user, "create", "fitment", null, {
      products: toCreate.length,
      skipped: productIds.length - toCreate.length,
      brandId,
      modelId,
      generationId,
      yearFrom,
      yearTo,
    });
    revalidateFitments(toCreate);
    if (toCreate.length === 0) toast = "error.unique";
    return { ok: true };
  });

  redirectWith("/admin/compatibility", toast, { brandId: getFormString(formData, "brandId") });
}

/** Удаление привязок по фильтру (товары × авто). */
export async function deleteFitmentsAction(formData: FormData): Promise<void> {
  await guardAction("compatibility", async (user) => {
    const productIds = getFormList(formData, "productIds").filter(isId);
    const brandId = getFormOptional(formData, "brandId") ?? null;
    const modelId = getFormOptional(formData, "modelId") ?? null;
    const generationId = getFormOptional(formData, "generationId") ?? null;
    const productIdSingle = getFormString(formData, "productId");

    const where = {
      ...(productIds.length > 0 ? { productId: { in: productIds } } : {}),
      ...(isId(productIdSingle) ? { productId: productIdSingle } : {}),
      ...(brandId ? { brandId } : {}),
      ...(modelId ? { modelId } : {}),
      ...(generationId ? { generationId } : {}),
    };

    if (Object.keys(where).length === 0) return fail("Задайте хотя бы один фильтр удаления");

    const result = await prisma.fitment.deleteMany({ where });
    await audit(user, "delete", "fitment", null, { ...where, removed: result.count });
    revalidateFitments(productIds.length > 0 ? productIds : isId(productIdSingle) ? [productIdSingle] : []);
    return { ok: true };
  });

  redirectWith("/admin/compatibility", "fitment.deleted");
}

/** Удаление одной привязки (со страницы товара). */
export async function deleteFitmentAction(formData: FormData): Promise<ActionResult> {
  return guardAction("compatibility", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Привязка не найдена");
    const fitment = await prisma.fitment.findUnique({ where: { id }, select: { productId: true } });
    if (!fitment) return fail("Привязка не найдена");
    await prisma.fitment.delete({ where: { id } });
    await audit(user, "delete", "fitment", id, { productId: fitment.productId });
    revalidateFitments([fitment.productId]);
    return { ok: true };
  });
}

/** Быстрая привязка одного товара к марке (из карточки товара). */
export async function addProductFitmentAction(formData: FormData): Promise<ActionResult> {
  return guardAction("compatibility", async (user) => {
    const productId = getFormString(formData, "productId");
    const brandId = getFormString(formData, "brandId");
    if (!isId(productId)) return fail("Товар не найден");
    if (!isId(brandId)) return fail("Выберите марку");

    const modelId = getFormOptional(formData, "modelId") ?? null;
    const generationId = getFormOptional(formData, "generationId") ?? null;
    const modificationId = getFormOptional(formData, "modificationId") ?? null;

    const duplicate = await prisma.fitment.findFirst({
      where: { productId, brandId, modelId, generationId, modificationId },
      select: { id: true },
    });
    if (duplicate) return fail("Такая привязка уже существует");

    const fitment = await prisma.fitment.create({
      data: {
        productId,
        brandId,
        modelId,
        generationId,
        modificationId,
        yearFrom: getFormInt(formData, "yearFrom") ?? null,
        yearTo: getFormInt(formData, "yearTo") ?? null,
        note: getFormOptional(formData, "note") ?? null,
      },
    });

    await prisma.product.update({ where: { id: productId }, data: { fitmentType: "specific" } });
    await audit(user, "create", "fitment", fitment.id, { productId, brandId });
    revalidateFitments([productId]);
    return { ok: true };
  });
}

/** Удаление всех привязок товара. */
export async function clearProductFitmentsAction(formData: FormData): Promise<ActionResult> {
  return guardAction("compatibility", async (user) => {
    const productId = getFormString(formData, "productId");
    if (!isId(productId)) return fail("Товар не найден");
    const result = await prisma.fitment.deleteMany({ where: { productId } });
    await audit(user, "delete", "fitment", null, { productId, removed: result.count });
    revalidateFitments([productId]);
    return { ok: true };
  });
}
