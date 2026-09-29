"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { ATTRIBUTE_TYPES } from "@/lib/constants";
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

/**
 * Характеристики (`Attribute`): CRUD, варианты значений (JSON-массив),
 * привязка к категории, фильтруемость и обязательность.
 */

const ATTRIBUTE_TYPE_KEYS = Object.keys(ATTRIBUTE_TYPES);

function parseOptions(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter((item) => item !== "")
    .slice(0, 200);
}

type AttributePayload = {
  name: string;
  slug: string;
  categoryId: string | null;
  type: string;
  unit: string | null;
  options: string[] | undefined;
  isFilterable: boolean;
  isRequired: boolean;
  group: string | null;
  sortOrder: number;
  isActive: boolean;
};

function parseAttribute(formData: FormData): { data: AttributePayload } | { error: string } {
  const name = getFormString(formData, "name");
  if (!name) return { error: "Укажите название характеристики" };

  const type = getFormString(formData, "type") || "select";
  if (!ATTRIBUTE_TYPE_KEYS.includes(type)) return { error: "Неизвестный тип характеристики" };

  const options = parseOptions(getFormOptional(formData, "options"));

  return {
    data: {
      name,
      slug: slugify(getFormString(formData, "slug") || name),
      categoryId: getFormOptional(formData, "categoryId") ?? null,
      type,
      unit: getFormOptional(formData, "unit") ?? null,
      options: type === "select" ? options : undefined,
      isFilterable: getFormBoolStrict(formData, "isFilterable") ?? false,
      isRequired: getFormBoolStrict(formData, "isRequired") ?? false,
      group: getFormOptional(formData, "group") ?? null,
      sortOrder: getFormInt(formData, "sortOrder") ?? 100,
      isActive: getFormBoolStrict(formData, "isActive") ?? false,
    },
  };
}

function revalidateAttributes(): void {
  revalidatePath("/admin/attributes");
  revalidatePath("/admin/products");
}

export async function createAttributeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("attributes", async (user) => {
    const parsed = parseAttribute(formData);
    if ("error" in parsed) return fail(parsed.error);

    const busy = await prisma.attribute.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
    if (busy) return fail(`Slug «${parsed.data.slug}» уже занят`);

    const attribute = await prisma.attribute.create({ data: parsed.data });
    await audit(user, "create", "attribute", attribute.id, { name: attribute.name, slug: attribute.slug });
    revalidateAttributes();
    redirectWith("/admin/attributes", "attribute.created");
  });
}

export async function updateAttributeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("attributes", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Характеристика не найдена");

    const parsed = parseAttribute(formData);
    if ("error" in parsed) return fail(parsed.error);

    const current = await prisma.attribute.findUnique({ where: { id }, select: { slug: true } });
    if (!current) return fail("Характеристика не найдена");

    if (parsed.data.slug !== current.slug) {
      const busy = await prisma.attribute.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
      if (busy) return fail(`Slug «${parsed.data.slug}» уже занят`);
    }

    await prisma.attribute.update({ where: { id }, data: parsed.data });
    await audit(user, "update", "attribute", id, { name: parsed.data.name, slug: parsed.data.slug });
    revalidateAttributes();
    return { ok: true };
  });
}

export async function deleteAttributeAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/attributes", "error.forbidden");
  }
  if (!isId(id)) {
    redirectWith("/admin/attributes", "error.notfound");
  }

  try {
    const attribute = await prisma.attribute.findUnique({
      where: { id },
      select: { name: true, _count: { select: { values: true } } },
    });
    if (!attribute) {
      redirectWith("/admin/attributes", "error.notfound");
    }
    if (attribute._count.values > 0) {
      redirectWith("/admin/attributes", "error.relation", { values: attribute._count.values });
    }
    await prisma.attribute.delete({ where: { id } });
    await audit(user, "delete", "attribute", id, { name: attribute.name });
  } catch {
    redirectWith("/admin/attributes", "error.failed");
  }

  revalidateAttributes();
  redirectWith("/admin/attributes", "attribute.deleted");
}

/** Принудительное удаление вместе со значениями товаров. */
export async function forceDeleteAttributeAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");

  await guardAction("attributes", async (user) => {
    if (!isId(id)) return fail("Характеристика не найдена");
    const attribute = await prisma.attribute.findUnique({ where: { id }, select: { name: true } });
    await prisma.productAttribute.deleteMany({ where: { attributeId: id } });
    await prisma.attribute.delete({ where: { id } });
    await audit(user, "delete", "attribute", id, { name: attribute?.name, forced: true });
    revalidateAttributes();
    return { ok: true };
  });

  redirectWith("/admin/attributes", "attribute.deleted");
}
