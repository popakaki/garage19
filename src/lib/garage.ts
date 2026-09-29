import "server-only";
import prisma from "@/lib/prisma";

/**
 * Каскадный выбор автомобиля (марка → модель → поколение → модификация).
 * Используется «Гаражом» в личном кабинете и API `/api/garage/cascade`.
 */

export type CascadeOption = {
  id: string;
  name: string;
  slug?: string;
  years?: string;
  engine?: string | null;
};

export async function listCarBrands(search?: string): Promise<CascadeOption[]> {
  const brands = await prisma.brand.findMany({
    where: {
      isActive: true,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ popular: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
    take: 400,
  });
  return brands;
}

export async function listBrandModels(brandId: string): Promise<CascadeOption[]> {
  if (!brandId) return [];
  const models = await prisma.carModel.findMany({
    where: { brandId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, yearFrom: true, yearTo: true, bodyType: true },
  });
  return models.map((model) => ({
    id: model.id,
    name: model.bodyType ? `${model.name} (${model.bodyType})` : model.name,
    slug: model.slug,
    years: [model.yearFrom, model.yearTo].filter(Boolean).join("–"),
  }));
}

export async function listModelGenerations(modelId: string): Promise<CascadeOption[]> {
  if (!modelId) return [];
  const generations = await prisma.generation.findMany({
    where: { modelId, isActive: true },
    orderBy: [{ yearFrom: "asc" }, { sortOrder: "asc" }],
    select: { id: true, name: true, slug: true, yearFrom: true, yearTo: true, bodyType: true },
  });
  return generations.map((generation) => ({
    id: generation.id,
    name: generation.bodyType ? `${generation.name} · ${generation.bodyType}` : generation.name,
    slug: generation.slug,
    years: generation.yearTo ? `${generation.yearFrom}–${generation.yearTo}` : `с ${generation.yearFrom}`,
  }));
}

export async function listGenerationModifications(generationId: string): Promise<CascadeOption[]> {
  if (!generationId) return [];
  const modifications = await prisma.modification.findMany({
    where: { generationId, isActive: true },
    orderBy: [{ volume: "asc" }, { power: "asc" }],
    select: {
      id: true,
      name: true,
      engine: true,
      volume: true,
      power: true,
      fuel: true,
      drive: true,
      transmission: true,
    },
  });
  return modifications.map((modification) => ({
    id: modification.id,
    name: modification.name,
    engine: [modification.engine, modification.volume ? `${modification.volume} л` : null]
      .filter(Boolean)
      .join(" "),
  }));
}
