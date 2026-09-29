import prisma from "@/lib/prisma";
import type { CarTreeBrand } from "@/components/admin/car-picker";

/**
 * Дерево автомобилей для селектов админки: марка → модель → поколение → модификация.
 * Данные отдаются одним запросом и передаются в клиентский CarPicker,
 * поэтому переключение уровней не требует обращений к серверу.
 */

export type CarTree = { brands: CarTreeBrand[] };

export async function getCarTree(options?: {
  includeModifications?: boolean;
  onlyActive?: boolean;
  brandId?: string;
}): Promise<CarTree> {
  const { includeModifications = false, onlyActive = false, brandId } = options ?? {};

  const brands = await prisma.brand.findMany({
    where: { ...(onlyActive ? { isActive: true } : {}), ...(brandId ? { id: brandId } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      models: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          generations: {
            orderBy: [{ yearFrom: "desc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              yearFrom: true,
              yearTo: true,
              ...(includeModifications
                ? {
                    modifications: {
                      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                      select: { id: true, name: true, yearFrom: true, yearTo: true },
                    },
                  }
                : {}),
            },
          },
        },
      },
    },
  });

  return {
    brands: brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      models: brand.models.map((model) => ({
        id: model.id,
        name: model.name,
        generations: model.generations.map((generation) => ({
          id: generation.id,
          name: generation.name,
          yearFrom: generation.yearFrom,
          yearTo: generation.yearTo,
          modifications:
            "modifications" in generation && Array.isArray(generation.modifications)
              ? generation.modifications.map((modification) => ({
                  id: modification.id,
                  name: modification.name,
                  yearFrom: modification.yearFrom,
                  yearTo: modification.yearTo,
                }))
              : [],
        })),
      })),
    })),
  };
}

/** Мини-дерево «марка → модель» для фильтров (без поколений). */
export async function getBrandModelOptions() {
  const brands = await prisma.brand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      models: { orderBy: [{ name: "asc" }], select: { id: true, name: true } },
    },
  });
  return brands;
}
