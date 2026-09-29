import prisma from "@/lib/prisma";
import { ATTRIBUTE_TYPES } from "@/lib/constants";
import { parseOptions } from "@/lib/admin/format";

/**
 * Подготовка данных для формы товара (характеристики категории).
 * Чтение вынесено из страниц, чтобы не дублировать запросы.
 */

export type ProductAttributeDef = {
  id: string;
  name: string;
  type: string;
  unit: string | null;
  options: string[] | null;
  isRequired: boolean;
  group: string | null;
};

const ATTRIBUTE_TYPE_KEYS = Object.keys(ATTRIBUTE_TYPES);

/**
 * Характеристики, применимые к категории: собственные + общие (без категории).
 */
export async function getProductAttributeDefs(categoryId?: string): Promise<ProductAttributeDef[]> {
  const attributes = await prisma.attribute.findMany({
    where: {
      isActive: true,
      OR: [{ categoryId: null }, ...(categoryId ? [{ categoryId }] : [])],
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      unit: true,
      options: true,
      isRequired: true,
      group: true,
    },
  });

  return attributes.map((attribute) => ({
    id: attribute.id,
    name: attribute.name,
    type: ATTRIBUTE_TYPE_KEYS.includes(attribute.type) ? attribute.type : "text",
    unit: attribute.unit,
    options: Array.isArray(attribute.options) ? parseOptions(attribute.options.join(",")) : null,
    isRequired: attribute.isRequired,
    group: attribute.group,
  }));
}

/** Значения характеристик товара: attributeId → строка для поля формы. */
export async function getProductAttributeValues(productId: string): Promise<Record<string, string>> {
  const values = await prisma.productAttribute.findMany({
    where: { productId },
    select: { attributeId: true, valueString: true, valueNumber: true, valueBool: true },
  });

  const result: Record<string, string> = {};
  for (const value of values) {
    if (value.valueBool !== null && value.valueBool !== undefined) {
      result[value.attributeId] = value.valueBool ? "true" : "false";
    } else if (value.valueNumber !== null && value.valueNumber !== undefined) {
      result[value.attributeId] = String(value.valueNumber);
    } else if (value.valueString) {
      result[value.attributeId] = value.valueString;
    }
  }
  return result;
}

/** Товары для выпадающего списка связей (аксессуары/аналоги). */
export async function getRelatedProductOptions(excludeId: string, take = 200) {
  return prisma.product.findMany({
    where: { id: { not: excludeId }, isActive: true },
    orderBy: { name: "asc" },
    take,
    select: { id: true, name: true, sku: true },
  });
}
