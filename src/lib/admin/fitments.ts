import prisma from "@/lib/prisma";

/**
 * Чтение совместимости для страниц админки (не Server Actions).
 * Подбор «товары для авто» учитывает уровни fitment так же, как каталог:
 * запись с пустым уровнем ниже считается подходящей для всех значений уровня.
 */

export const FITMENT_SELECT = {
  id: true,
  yearFrom: true,
  yearTo: true,
  note: true,
  createdAt: true,
  product: { select: { id: true, name: true, slug: true, sku: true, price: true, isActive: true, stock: true } },
  brand: { select: { id: true, name: true, slug: true } },
  model: { select: { id: true, name: true } },
  generation: { select: { id: true, name: true, yearFrom: true, yearTo: true } },
  modification: { select: { id: true, name: true } },
} as const;

/** Какие автомобили подходят к товару. */
export async function getProductFitments(productId: string, take = 300) {
  return prisma.fitment.findMany({
    where: { productId },
    take,
    orderBy: [{ brand: { name: "asc" } }, { model: { name: "asc" } }, { generation: { yearFrom: "desc" } }],
    select: FITMENT_SELECT,
  });
}

/** Сколько привязок у товара. */
export async function countProductFitments(productId: string): Promise<number> {
  return prisma.fitment.count({ where: { productId } });
}

/** Какие товары подходят к автомобилю (марка обязательна). */
export async function getCarFitmentProducts(params: {
  brandId?: string;
  modelId?: string;
  generationId?: string;
  take?: number;
}) {
  const { brandId, modelId, generationId, take = 100 } = params;
  if (!brandId) return [];

  return prisma.fitment.findMany({
    where: {
      brandId,
      ...(modelId ? { OR: [{ modelId }, { modelId: null }] } : {}),
      ...(generationId ? { OR: [{ generationId }, { generationId: null }] } : {}),
    },
    take,
    orderBy: { product: { name: "asc" } },
    select: FITMENT_SELECT,
  });
}

/** Данные для селектов совместимости: товары по категории/бренду с поиском. */
export async function getFitmentProductOptions(params: {
  categoryId?: string;
  brandName?: string;
  search?: string;
  take?: number;
}) {
  const { categoryId, brandName, search, take = 60 } = params;
  return prisma.product.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(brandName ? { brandName: { contains: brandName, mode: "insensitive" } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    take,
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true, slug: true, price: true, fitmentType: true },
  });
}

/** Статистика по совместимости для сводки. */
export async function getFitmentStats() {
  const [withFitments, total, universal] = await Promise.all([
    prisma.fitment.groupBy({ by: ["productId"], _count: { _all: true } }),
    prisma.product.count(),
    prisma.product.count({ where: { fitmentType: "universal" } }),
  ]);
  const covered = withFitments.length;
  return { covered, total, universal, withoutFitments: Math.max(0, total - covered - universal) };
}
