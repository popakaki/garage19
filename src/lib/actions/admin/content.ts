"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { BANNER_POSITIONS } from "@/lib/constants";
import {
  audit,
  fail,
  getFormBoolStrict,
  getFormInt,
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  redirectWith,
  type ActionState,
} from "@/lib/admin/actions";
import { parseDateInput } from "@/lib/admin/format";
import { saveUpload } from "@/lib/admin/upload";

/**
 * Контент: баннеры главного слайдера/промо и статические страницы.
 */

const BANNER_POSITION_KEYS = Object.keys(BANNER_POSITIONS);

// ─────────────────────────────────────────────────────────────────────────────
// Баннеры
// ─────────────────────────────────────────────────────────────────────────────

async function uploadIfPresent(formData: FormData, field: string, kind: "banners"): Promise<string | null> {
  const file = formData.get(field);
  if (!file || typeof file !== "object" || !("size" in file) || (file as File).size === 0) return null;
  const result = await saveUpload(file as File, kind);
  return result.ok ? result.url : null;
}

export async function createBannerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("banners", async (user) => {
    const title = getFormString(formData, "title");
    if (!title) return fail("Укажите заголовок баннера");

    const uploaded = await uploadIfPresent(formData, "imageFile", "banners");
    const image = uploaded ?? getFormOptional(formData, "image");
    if (!image) return fail("Укажите изображение баннера или загрузите файл");

    const position = getFormString(formData, "position") || "hero";
    if (!BANNER_POSITION_KEYS.includes(position)) return fail("Неизвестная позиция баннера");

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle: getFormOptional(formData, "subtitle") ?? null,
        description: getFormOptional(formData, "description") ?? null,
        image,
        mobileImage: getFormOptional(formData, "mobileImage") ?? null,
        badge: getFormOptional(formData, "badge") ?? null,
        linkUrl: getFormOptional(formData, "linkUrl") ?? null,
        linkText: getFormOptional(formData, "linkText") ?? null,
        position,
        textAlign: getFormString(formData, "textAlign") || "left",
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
        startsAt: parseDateInput(getFormOptional(formData, "startsAt")) ?? null,
        endsAt: parseDateInput(getFormOptional(formData, "endsAt")) ?? null,
      },
    });

    await audit(user, "create", "banner", banner.id, { title, position });
    revalidatePath("/admin/banners");
    revalidatePath("/");
    redirectWith("/admin/banners", "banner.created");
  });
}

export async function updateBannerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("banners", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Баннер не найден");

    const title = getFormString(formData, "title");
    if (!title) return fail("Укажите заголовок баннера");

    const uploaded = await uploadIfPresent(formData, "imageFile", "banners");
    const image = uploaded ?? getFormOptional(formData, "image");
    if (!image) return fail("Укажите изображение баннера или загрузите файл");

    await prisma.banner.update({
      where: { id },
      data: {
        title,
        subtitle: getFormOptional(formData, "subtitle") ?? null,
        description: getFormOptional(formData, "description") ?? null,
        image,
        mobileImage: getFormOptional(formData, "mobileImage") ?? null,
        badge: getFormOptional(formData, "badge") ?? null,
        linkUrl: getFormOptional(formData, "linkUrl") ?? null,
        linkText: getFormOptional(formData, "linkText") ?? null,
        position: getFormString(formData, "position") || "hero",
        textAlign: getFormString(formData, "textAlign") || "left",
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
        startsAt: parseDateInput(getFormOptional(formData, "startsAt")) ?? null,
        endsAt: parseDateInput(getFormOptional(formData, "endsAt")) ?? null,
      },
    });

    await audit(user, "update", "banner", id, { title });
    revalidatePath("/admin/banners");
    revalidatePath("/");
    return { ok: true };
  });
}

export async function toggleBannerAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  await guardAction("banners", async (user) => {
    if (!isId(id)) return fail("Баннер не найден");
    const banner = await prisma.banner.findUnique({ where: { id }, select: { isActive: true, title: true } });
    if (!banner) return fail("Баннер не найден");
    await prisma.banner.update({ where: { id }, data: { isActive: !banner.isActive } });
    await audit(user, "update", "banner", id, { isActive: !banner.isActive });
    revalidatePath("/admin/banners");
    revalidatePath("/");
    return { ok: true };
  });
  redirectWith("/admin/banners", "banner.updated");
}

export async function deleteBannerAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/banners", "error.forbidden");
  }
  if (!isId(id)) redirectWith("/admin/banners", "error.notfound");

  try {
    const banner = await prisma.banner.findUnique({ where: { id }, select: { title: true } });
    if (!banner) redirectWith("/admin/banners", "error.notfound");
    await prisma.banner.delete({ where: { id } });
    await audit(user, "delete", "banner", id, { title: banner.title });
  } catch {
    redirectWith("/admin/banners", "error.failed");
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirectWith("/admin/banners", "banner.deleted");
}

// ─────────────────────────────────────────────────────────────────────────────
// Страницы
// ─────────────────────────────────────────────────────────────────────────────

export async function createPageAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("pages", async (user) => {
    const title = getFormString(formData, "title");
    const content = getFormString(formData, "content");
    if (!title) return fail("Укажите заголовок страницы");
    if (!content) return fail("Заполните содержимое страницы");

    const slug = slugify(getFormString(formData, "slug") || title);
    const busy = await prisma.page.findUnique({ where: { slug }, select: { id: true } });
    if (busy) return fail(`Страница со slug «${slug}» уже существует`);

    const page = await prisma.page.create({
      data: {
        slug,
        title,
        content,
        excerpt: getFormOptional(formData, "excerpt") ?? null,
        isPublished: getFormBoolStrict(formData, "isPublished") ?? false,
        showInHeader: getFormBoolStrict(formData, "showInHeader") ?? false,
        showInFooter: getFormBoolStrict(formData, "showInFooter") ?? false,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        seoTitle: getFormOptional(formData, "seoTitle") ?? null,
        seoDescription: getFormOptional(formData, "seoDescription") ?? null,
      },
    });

    await audit(user, "create", "page", page.id, { title, slug });
    revalidatePath("/admin/pages");
    redirectWith(`/admin/pages/${page.id}`, "page.created");
  });
}

export async function updatePageAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("pages", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Страница не найдена");

    const title = getFormString(formData, "title");
    const content = getFormString(formData, "content");
    if (!title) return fail("Укажите заголовок страницы");
    if (!content) return fail("Заполните содержимое страницы");

    const slug = slugify(getFormString(formData, "slug") || title);
    const current = await prisma.page.findUnique({ where: { id }, select: { slug: true } });
    if (!current) return fail("Страница не найдена");
    if (slug !== current.slug) {
      const busy = await prisma.page.findUnique({ where: { slug }, select: { id: true } });
      if (busy) return fail(`Страница со slug «${slug}» уже существует`);
    }

    await prisma.page.update({
      where: { id },
      data: {
        slug,
        title,
        content,
        excerpt: getFormOptional(formData, "excerpt") ?? null,
        isPublished: getFormBoolStrict(formData, "isPublished") ?? false,
        showInHeader: getFormBoolStrict(formData, "showInHeader") ?? false,
        showInFooter: getFormBoolStrict(formData, "showInFooter") ?? false,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        seoTitle: getFormOptional(formData, "seoTitle") ?? null,
        seoDescription: getFormOptional(formData, "seoDescription") ?? null,
      },
    });

    await audit(user, "update", "page", id, { title, slug });
    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${id}`);
    revalidatePath(`/${slug}`);
    return { ok: true };
  });
}

export async function deletePageAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/pages", "error.forbidden");
  }
  if (!isId(id)) redirectWith("/admin/pages", "error.notfound");

  try {
    const page = await prisma.page.findUnique({ where: { id }, select: { title: true, slug: true } });
    if (!page) redirectWith("/admin/pages", "error.notfound");
    await prisma.page.delete({ where: { id } });
    await audit(user, "delete", "page", id, { title: page.title, slug: page.slug });
  } catch {
    redirectWith("/admin/pages", "error.failed");
  }

  revalidatePath("/admin/pages");
  redirectWith("/admin/pages", "page.deleted");
}

export async function togglePagePublishedAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  await guardAction("pages", async (user) => {
    if (!isId(id)) return fail("Страница не найдена");
    const page = await prisma.page.findUnique({ where: { id }, select: { isPublished: true } });
    if (!page) return fail("Страница не найдена");
    await prisma.page.update({ where: { id }, data: { isPublished: !page.isPublished } });
    await audit(user, "update", "page", id, { isPublished: !page.isPublished });
    revalidatePath("/admin/pages");
    return { ok: true };
  });
  redirectWith("/admin/pages", "page.updated");
}
