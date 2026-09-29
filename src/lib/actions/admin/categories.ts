"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import {
  audit,
  fail,
  getFormBoolStrict,
  getFormInt,
  getFormList,
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  redirectWith,
  type ActionResult,
  type ActionState,
} from "@/lib/admin/actions";
import { saveUpload } from "@/lib/admin/upload";

/**
 * Категории: дерево из двух уровней, CRUD, SEO-поля, перенос товаров.
 * Удаление запрещено, если в категории есть товары или подкатегории.
 */

type CategoryPayload = {
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  image: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  showInMenu: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
};

function parseCategory(formData: FormData): { data: CategoryPayload } | { error: string } {
  const name = getFormString(formData, "name");
  if (!name) return { error: "Укажите название категории" };

  return {
    data: {
      name,
      slug: slugify(getFormString(formData, "slug") || name),
      parentId: getFormOptional(formData, "parentId") ?? null,
      description: getFormOptional(formData, "description") ?? null,
      image: getFormOptional(formData, "image") ?? null,
      icon: getFormOptional(formData, "icon") ?? null,
      sortOrder: getFormInt(formData, "sortOrder") ?? 100,
      isActive: getFormBoolStrict(formData, "isActive") ?? false,
      showInMenu: getFormBoolStrict(formData, "showInMenu") ?? false,
      seoTitle: getFormOptional(formData, "seoTitle") ?? null,
      seoDescription: getFormOptional(formData, "seoDescription") ?? null,
      seoKeywords: getFormOptional(formData, "seoKeywords") ?? null,
    },
  };
}

function revalidateCategories(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}

export async function createCategoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("categories", async (user) => {
    const parsed = parseCategory(formData);
    if ("error" in parsed) return fail(parsed.error);

    const busy = await prisma.category.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
    if (busy) return fail(`Slug «${parsed.data.slug}» уже занят`);

    // Подкатегория может быть только второго уровня.
    if (parsed.data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parsed.data.parentId },
        select: { id: true, parentId: true },
      });
      if (!parent) return fail("Родительская категория не найдена");
      if (parent.parentId) return fail("Поддерживается только два уровня категорий");
    }

    const file = formData.get("imageFile");
    let image = parsed.data.image;
    if (file && typeof file === "object" && "size" in file && file.size > 0) {
      const uploaded = await saveUpload(file as File, "categories");
      if (!uploaded.ok) return fail(uploaded.error);
      image = uploaded.url;
    }

    const category = await prisma.category.create({ data: { ...parsed.data, image } });
    await audit(user, "create", "category", category.id, { name: category.name, slug: category.slug });
    revalidateCategories();
    redirectWith("/admin/categories", "category.created");
  });
}

export async function updateCategoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("categories", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Категория не найдена");

    const parsed = parseCategory(formData);
    if ("error" in parsed) return fail(parsed.error);
    if (parsed.data.parentId === id) return fail("Категория не может быть родителем самой себя");

    const current = await prisma.category.findUnique({ where: { id }, select: { slug: true, name: true } });
    if (!current) return fail("Категория не найдена");

    if (parsed.data.slug !== current.slug) {
      const busy = await prisma.category.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
      if (busy) return fail(`Slug «${parsed.data.slug}» уже занят`);
    }

    if (parsed.data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parsed.data.parentId },
        select: { parentId: true, children: { select: { id: true } } },
      });
      if (!parent) return fail("Родительская категория не найдена");
      if (parent.parentId) return fail("Поддерживается только два уровня категорий");
      if (parent.children.length > 0) return fail("Перенесите товары: у категории уже есть подкатегории");
    }

    const file = formData.get("imageFile");
    let image = parsed.data.image;
    if (file && typeof file === "object" && "size" in file && file.size > 0) {
      const uploaded = await saveUpload(file as File, "categories");
      if (!uploaded.ok) return fail(uploaded.error);
      image = uploaded.url;
    }

    await prisma.category.update({ where: { id }, data: { ...parsed.data, image } });
    await audit(user, "update", "category", id, { name: parsed.data.name, slug: parsed.data.slug });
    revalidateCategories();
    return { ok: true };
  });
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/categories", "error.forbidden");
  }
  if (!isId(id)) {
    redirectWith("/admin/categories", "error.notfound");
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      select: { name: true, _count: { select: { products: true, children: true } } },
    });
    if (!category) {
      redirectWith("/admin/categories", "error.notfound");
    }
    if (category._count.products > 0) {
      redirectWith("/admin/categories", "error.relation", { reason: "products" });
    }
    if (category._count.children > 0) {
      redirectWith("/admin/categories", "error.relation", { reason: "children" });
    }
    await prisma.category.delete({ where: { id } });
    await audit(user, "delete", "category", id, { name: category.name });
  } catch {
    redirectWith("/admin/categories", "error.failed");
  }

  revalidateCategories();
  redirectWith("/admin/categories", "category.deleted");
}

/** Перенос товаров из одной категории в другую. */
export async function moveCategoryProductsAction(formData: FormData): Promise<ActionResult> {
  return guardAction("categories", async (user) => {
    const fromId = getFormString(formData, "fromId");
    const toId = getFormString(formData, "toId");
    if (!isId(fromId) || !isId(toId)) return fail("Выберите категории для переноса");
    if (fromId === toId) return fail("Категории совпадают");

    const result = await prisma.product.updateMany({ where: { categoryId: fromId }, data: { categoryId: toId } });
    await audit(user, "update", "category", toId, { movedFrom: fromId, products: result.count });
    revalidateCategories();
    return { ok: true };
  });
}

/** Массовый перенос товаров из списка (чекбоксы на странице категории). */
export async function moveSelectedProductsAction(formData: FormData): Promise<void> {
  const productIds = getFormList(formData, "ids").filter(isId);
  const toId = getFormString(formData, "toId");

  await guardAction("categories", async (user) => {
    if (productIds.length === 0) return fail("Выберите товары");
    if (!isId(toId)) return fail("Выберите категорию назначения");
    const result = await prisma.product.updateMany({ where: { id: { in: productIds } }, data: { categoryId: toId } });
    await audit(user, "update", "category", toId, { moved: result.count, ids: productIds.slice(0, 50) });
    revalidateCategories();
    return { ok: true };
  });

  redirectWith("/admin/categories", "category.moved");
}

/** Обновление порядка сортировки: поле `order_<id>`. */
export async function updateCategoryOrderAction(formData: FormData): Promise<void> {
  await guardAction("categories", async (user) => {
    const updates: { id: string; sortOrder: number }[] = [];
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("order_") || typeof value !== "string") continue;
      const id = key.slice(6);
      const sortOrder = Number.parseInt(value, 10);
      if (!isId(id) || Number.isNaN(sortOrder)) continue;
      updates.push({ id, sortOrder });
    }
    if (updates.length === 0) return fail("Нет данных для обновления");

    await prisma.$transaction(
      updates.map((item) => prisma.category.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })),
    );
    await audit(user, "update", "category", null, { order: updates.length });
    revalidateCategories();
    return { ok: true };
  });

  redirectWith("/admin/categories", "category.updated");
}
