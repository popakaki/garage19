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
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  redirectWith,
  type ActionState,
} from "@/lib/admin/actions";

/**
 * Поставщики: контакты, URL прайса, тип фида, наценка, активность.
 * Раздел доступен только администратору (здесь закупочные данные).
 */

const FEED_TYPES = ["xml", "yml", "csv"];

type SupplierPayload = {
  name: string;
  slug: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  priceUrl: string | null;
  feedType: string | null;
  marginPercent: number;
  note: string | null;
  isActive: boolean;
};

function parseSupplier(formData: FormData): { data: SupplierPayload } | { error: string } {
  const name = getFormString(formData, "name");
  if (!name) return { error: "Укажите название поставщика" };

  const feedType = getFormOptional(formData, "feedType");
  if (feedType && !FEED_TYPES.includes(feedType)) return { error: "Неизвестный тип фида" };

  const priceUrl = getFormOptional(formData, "priceUrl");
  if (priceUrl && !/^(https?:\/\/|\/)/.test(priceUrl)) {
    return { error: "Ссылка на прайс должна начинаться с http:// или https://" };
  }

  return {
    data: {
      name,
      slug: slugify(getFormString(formData, "slug") || name),
      contactPerson: getFormOptional(formData, "contactPerson") ?? null,
      phone: getFormOptional(formData, "phone") ?? null,
      email: getFormOptional(formData, "email") ?? null,
      priceUrl: priceUrl ?? null,
      feedType: feedType ?? null,
      marginPercent: getFormFloat(formData, "marginPercent") ?? 0,
      note: getFormOptional(formData, "note") ?? null,
      isActive: getFormBoolStrict(formData, "isActive") ?? false,
    },
  };
}

function revalidateSuppliers(): void {
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/import");
  revalidatePath("/admin/products");
}

export async function createSupplierAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("suppliers", async (user) => {
    const parsed = parseSupplier(formData);
    if ("error" in parsed) return fail(parsed.error);

    const busy = await prisma.supplier.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
    if (busy) return fail(`Поставщик со slug «${parsed.data.slug}» уже есть`);

    const supplier = await prisma.supplier.create({ data: parsed.data });
    await audit(user, "create", "supplier", supplier.id, { name: supplier.name, slug: supplier.slug });
    revalidateSuppliers();
    redirectWith("/admin/suppliers", "supplier.created");
  });
}

export async function updateSupplierAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("suppliers", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Поставщик не найден");

    const parsed = parseSupplier(formData);
    if ("error" in parsed) return fail(parsed.error);

    const current = await prisma.supplier.findUnique({ where: { id }, select: { slug: true } });
    if (!current) return fail("Поставщик не найден");

    if (parsed.data.slug !== current.slug) {
      const busy = await prisma.supplier.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
      if (busy) return fail(`Поставщик со slug «${parsed.data.slug}» уже есть`);
    }

    await prisma.supplier.update({ where: { id }, data: parsed.data });
    await audit(user, "update", "supplier", id, { name: parsed.data.name, marginPercent: parsed.data.marginPercent });
    revalidateSuppliers();
    return { ok: true };
  });
}

export async function deleteSupplierAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirectWith("/admin/suppliers", "error.forbidden");
  }
  if (!isId(id)) redirectWith("/admin/suppliers", "error.notfound");

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: { name: true, _count: { select: { products: true, importJobs: true } } },
    });
    if (!supplier) redirectWith("/admin/suppliers", "error.notfound");
    if (supplier._count.products > 0) {
      // Товары поставщика не удаляем — только отвязываем.
      await prisma.product.updateMany({ where: { supplierId: id }, data: { supplierId: null } });
    }
    if (supplier._count.importJobs > 0) {
      await prisma.importJob.updateMany({ where: { supplierId: id }, data: { supplierId: null } });
    }
    await prisma.supplier.delete({ where: { id } });
    await audit(user, "delete", "supplier", id, { name: supplier.name, products: supplier._count.products });
  } catch {
    redirectWith("/admin/suppliers", "error.failed");
  }

  revalidateSuppliers();
  redirectWith("/admin/suppliers", "supplier.deleted");
}
