"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import {
  audit,
  fail,
  getFormBoolStrict,
  getFormFloat,
  getFormInt,
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  redirectWith,
  type ActionState,
} from "@/lib/admin/actions";
import { saveUpload } from "@/lib/admin/upload";

/**
 * Справочник автомобилей: марки → модели → поколения → модификации.
 * Ручной ввод поколений с годами выпуска — конкурентное преимущество проекта,
 * поэтому годы и примечание доступны в форме поколения.
 */

function revalidateCars(): void {
  revalidatePath("/admin/cars");
  revalidatePath("/admin/compatibility");
  revalidatePath("/admin/products");
}

// ─────────────────────────────────────────────────────────────────────────────
// Марки (Brand)
// ─────────────────────────────────────────────────────────────────────────────

export async function createBrandAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cars", async (user) => {
    const name = getFormString(formData, "name");
    if (!name) return fail("Укажите название марки");
    const slug = slugify(getFormString(formData, "slug") || name);

    const busy = await prisma.brand.findUnique({ where: { slug }, select: { id: true } });
    if (busy) return fail(`Марка с slug «${slug}» уже существует`);

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        logo: getFormOptional(formData, "logo") ?? null,
        country: getFormOptional(formData, "country") ?? null,
        popular: getFormBoolStrict(formData, "popular") ?? false,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
      },
    });

    await audit(user, "create", "brand", brand.id, { name: brand.name, slug: brand.slug });
    revalidateCars();
    redirectWith("/admin/cars", "brand.created");
  });
}

export async function updateBrandAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cars", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Марка не найдена");

    const name = getFormString(formData, "name");
    if (!name) return fail("Укажите название марки");
    const slug = slugify(getFormString(formData, "slug") || name);

    const file = formData.get("logoFile");
    let logo = getFormOptional(formData, "logo") ?? null;
    if (file && typeof file === "object" && "size" in file && file.size > 0) {
      const uploaded = await saveUpload(file as File, "brands");
      if (!uploaded.ok) return fail(uploaded.error);
      logo = uploaded.url;
    }

    await prisma.brand.update({
      where: { id },
      data: {
        name,
        slug,
        logo,
        country: getFormOptional(formData, "country") ?? null,
        popular: getFormBoolStrict(formData, "popular") ?? false,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
      },
    });

    await audit(user, "update", "brand", id, { name, slug });
    revalidateCars();
    return { ok: true };
  });
}

export async function deleteBrandAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/cars", "error.forbidden");
  }
  if (!isId(id)) redirectWith("/admin/cars", "error.notfound");

  try {
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: { name: true, _count: { select: { models: true, products: true, fitments: true } } },
    });
    if (!brand) redirectWith("/admin/cars", "error.notfound");
    if (brand._count.products > 0) redirectWith("/admin/cars", "error.relation", { products: brand._count.products });
    await prisma.brand.delete({ where: { id } });
    await audit(user, "delete", "brand", id, { name: brand.name });
  } catch {
    redirectWith("/admin/cars", "error.failed");
  }

  revalidateCars();
  redirectWith("/admin/cars", "brand.deleted");
}

// ─────────────────────────────────────────────────────────────────────────────
// Модели (CarModel)
// ─────────────────────────────────────────────────────────────────────────────

export async function createModelAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cars", async (user) => {
    const brandId = getFormString(formData, "brandId");
    const name = getFormString(formData, "name");
    if (!isId(brandId)) return fail("Выберите марку");
    if (!name) return fail("Укажите название модели");

    const slug = slugify(getFormString(formData, "slug") || name);
    const busy = await prisma.carModel.findFirst({ where: { brandId, slug }, select: { id: true } });
    if (busy) return fail(`Модель «${name}» уже есть у этой марки`);

    const model = await prisma.carModel.create({
      data: {
        brandId,
        name,
        slug,
        bodyType: getFormOptional(formData, "bodyType") ?? null,
        yearFrom: getFormInt(formData, "yearFrom") ?? null,
        yearTo: getFormInt(formData, "yearTo") ?? null,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
      },
    });

    await audit(user, "create", "carModel", model.id, { name, brandId });
    revalidateCars();
    redirectWith(`/admin/cars/${brandId}`, "model.created");
  });
}

export async function updateModelAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cars", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Модель не найдена");

    const model = await prisma.carModel.findUnique({ where: { id }, select: { brandId: true, slug: true } });
    if (!model) return fail("Модель не найдена");

    const name = getFormString(formData, "name");
    if (!name) return fail("Укажите название модели");
    const slug = slugify(getFormString(formData, "slug") || name);

    await prisma.carModel.update({
      where: { id },
      data: {
        name,
        slug,
        bodyType: getFormOptional(formData, "bodyType") ?? null,
        yearFrom: getFormInt(formData, "yearFrom") ?? null,
        yearTo: getFormInt(formData, "yearTo") ?? null,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
      },
    });

    await audit(user, "update", "carModel", id, { name, slug });
    revalidateCars();
    return { ok: true };
  });
}

export async function deleteModelAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/cars", "error.forbidden");
  }
  if (!isId(id)) redirectWith("/admin/cars", "error.notfound");

  let backTo = "/admin/cars";
  try {
    const model = await prisma.carModel.findUnique({ where: { id }, select: { brandId: true, name: true } });
    if (!model) redirectWith("/admin/cars", "error.notfound");
    backTo = `/admin/cars/${model.brandId}`;
    await prisma.carModel.delete({ where: { id } });
    await audit(user, "delete", "carModel", id, { name: model.name });
  } catch {
    redirectWith(backTo, "error.failed");
  }

  revalidateCars();
  redirectWith(backTo, "model.deleted");
}

// ─────────────────────────────────────────────────────────────────────────────
// Поколения (Generation)
// ─────────────────────────────────────────────────────────────────────────────

export async function createGenerationAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cars", async (user) => {
    const modelId = getFormString(formData, "modelId");
    const name = getFormString(formData, "name");
    const yearFrom = getFormInt(formData, "yearFrom");
    if (!isId(modelId)) return fail("Выберите модель");
    if (!name) return fail("Укажите название поколения");
    if (yearFrom === undefined) return fail("Укажите год начала выпуска");

    const slug = slugify(getFormString(formData, "slug") || name);
    const busy = await prisma.generation.findFirst({ where: { modelId, slug }, select: { id: true } });
    if (busy) return fail(`Поколение «${name}» уже есть у этой модели`);

    const generation = await prisma.generation.create({
      data: {
        modelId,
        name,
        slug,
        yearFrom,
        yearTo: getFormInt(formData, "yearTo") ?? null,
        bodyType: getFormOptional(formData, "bodyType") ?? null,
        imageUrl: getFormOptional(formData, "imageUrl") ?? null,
        note: getFormOptional(formData, "note") ?? null,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
      },
    });

    await audit(user, "create", "generation", generation.id, { name, modelId, yearFrom });
    revalidateCars();
    redirectWith(`/admin/cars/models/${modelId}`, "generation.created");
  });
}

export async function updateGenerationAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cars", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Поколение не найдено");

    const name = getFormString(formData, "name");
    const yearFrom = getFormInt(formData, "yearFrom");
    if (!name) return fail("Укажите название поколения");
    if (yearFrom === undefined) return fail("Укажите год начала выпуска");

    await prisma.generation.update({
      where: { id },
      data: {
        name,
        slug: slugify(getFormString(formData, "slug") || name),
        yearFrom,
        yearTo: getFormInt(formData, "yearTo") ?? null,
        bodyType: getFormOptional(formData, "bodyType") ?? null,
        imageUrl: getFormOptional(formData, "imageUrl") ?? null,
        note: getFormOptional(formData, "note") ?? null,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
      },
    });

    await audit(user, "update", "generation", id, { name, yearFrom });
    revalidateCars();
    return { ok: true };
  });
}

export async function deleteGenerationAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/cars", "error.forbidden");
  }
  if (!isId(id)) redirectWith("/admin/cars", "error.notfound");

  let backTo = "/admin/cars";
  try {
    const generation = await prisma.generation.findUnique({
      where: { id },
      select: { name: true, modelId: true },
    });
    if (!generation) redirectWith("/admin/cars", "error.notfound");
    backTo = `/admin/cars/models/${generation.modelId}`;
    await prisma.generation.delete({ where: { id } });
    await audit(user, "delete", "generation", id, { name: generation.name });
  } catch {
    redirectWith(backTo, "error.failed");
  }

  revalidateCars();
  redirectWith(backTo, "generation.deleted");
}

// ─────────────────────────────────────────────────────────────────────────────
// Модификации (Modification)
// ─────────────────────────────────────────────────────────────────────────────

export async function createModificationAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cars", async (user) => {
    const generationId = getFormString(formData, "generationId");
    const name = getFormString(formData, "name");
    if (!isId(generationId)) return fail("Выберите поколение");
    if (!name) return fail("Укажите название модификации");

    const modification = await prisma.modification.create({
      data: {
        generationId,
        name,
        engine: getFormOptional(formData, "engine") ?? null,
        volume: getFormFloat(formData, "volume") ?? null,
        power: getFormInt(formData, "power") ?? null,
        fuel: getFormOptional(formData, "fuel") ?? null,
        drive: getFormOptional(formData, "drive") ?? null,
        transmission: getFormOptional(formData, "transmission") ?? null,
        bodyType: getFormOptional(formData, "bodyType") ?? null,
        yearFrom: getFormInt(formData, "yearFrom") ?? null,
        yearTo: getFormInt(formData, "yearTo") ?? null,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
      },
    });

    await audit(user, "create", "modification", modification.id, { name, generationId });
    revalidateCars();
    redirectWith(`/admin/cars/generations/${generationId}`, "modification.created");
  });
}

export async function updateModificationAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cars", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Модификация не найдена");

    const name = getFormString(formData, "name");
    if (!name) return fail("Укажите название модификации");

    await prisma.modification.update({
      where: { id },
      data: {
        name,
        engine: getFormOptional(formData, "engine") ?? null,
        volume: getFormFloat(formData, "volume") ?? null,
        power: getFormInt(formData, "power") ?? null,
        fuel: getFormOptional(formData, "fuel") ?? null,
        drive: getFormOptional(formData, "drive") ?? null,
        transmission: getFormOptional(formData, "transmission") ?? null,
        bodyType: getFormOptional(formData, "bodyType") ?? null,
        yearFrom: getFormInt(formData, "yearFrom") ?? null,
        yearTo: getFormInt(formData, "yearTo") ?? null,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
      },
    });

    await audit(user, "update", "modification", id, { name });
    revalidateCars();
    return { ok: true };
  });
}

export async function deleteModificationAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/cars", "error.forbidden");
  }
  if (!isId(id)) redirectWith("/admin/cars", "error.notfound");

  let backTo = "/admin/cars";
  try {
    const modification = await prisma.modification.findUnique({
      where: { id },
      select: { name: true, generationId: true },
    });
    if (!modification) redirectWith("/admin/cars", "error.notfound");
    backTo = `/admin/cars/generations/${modification.generationId}`;
    await prisma.modification.delete({ where: { id } });
    await audit(user, "delete", "modification", id, { name: modification.name });
  } catch {
    redirectWith(backTo, "error.failed");
  }

  revalidateCars();
  redirectWith(backTo, "modification.deleted");
}
