/**
 * Проверка «конфигуратора»: для флагманских авто считает товары по категориям.
 *
 * Запуск: npx tsx prisma/data/tools/check-configurator.ts
 * Требует поднятой БД и выполненного `npm run db:seed`.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CARS = [
  { brandSlug: "toyota", modelSlug: "camry", generationSlug: "xv70", label: "Toyota Camry XV70" },
  { brandSlug: "kia", modelSlug: "sportage", generationSlug: "ql", label: "Kia Sportage QL" },
  { brandSlug: "lada", modelSlug: "vesta", generationSlug: "i", label: "Lada Vesta I" },
  { brandSlug: "haval", modelSlug: "jolion", generationSlug: "i", label: "Haval Jolion" },
  { brandSlug: "jetour", modelSlug: "t2", generationSlug: "i", label: "Jetour T2" },
  { brandSlug: "hyundai", modelSlug: "tucson", generationSlug: "nx4", label: "Hyundai Tucson NX4" },
  { brandSlug: "lada", modelSlug: "granta", generationSlug: "ii-fl", label: "Lada Granta FL" },
];

const CORE_CATEGORIES = [
  "bagazhniki",
  "avtoboksy",
  "veloperekreateli",
  "lyzhnye-krepleniya",
  "farkopy",
  "korziny-i-platformy",
  "vodnoe-snaryazhenie",
  "krepezh-i-aksessuary",
  "elektrika-farkopov",
];

/** Повторяет логику buildProductWhere для фильтра по авто. */
async function countForCar(
  car: { brandSlug: string; modelSlug: string; generationSlug: string },
  categorySlug?: string,
): Promise<number> {
  const brand = await prisma.brand.findUnique({ where: { slug: car.brandSlug } });
  if (!brand) return -1;
  const model = await prisma.carModel.findFirst({ where: { slug: car.modelSlug, brandId: brand.id } });
  const generation = model
    ? await prisma.generation.findFirst({ where: { slug: car.generationSlug, modelId: model.id } })
    : null;

  const category = categorySlug ? await prisma.category.findUnique({ where: { slug: categorySlug } }) : null;
  const categoryIds = category
    ? [
        category.id,
        ...(await prisma.category.findMany({ where: { parentId: category.id }, select: { id: true } })).map((row) => row.id),
      ]
    : [];

  return prisma.product.count({
    where: {
      isActive: true,
      ...(categoryIds.length ? { categoryId: { in: categoryIds } } : {}),
      OR: [
        { fitmentType: "universal" },
        {
          fitments: {
            some: {
              brandId: brand.id,
              AND: [
                ...(model ? [{ OR: [{ modelId: null }, { modelId: model.id }] }] : []),
                ...(generation ? [{ OR: [{ generationId: null }, { generationId: generation.id }] }] : []),
              ],
            },
          },
        },
      ],
    },
  });
}

async function main(): Promise<void> {
  let empty = 0;

  for (const car of CARS) {
    const total = await countForCar(car);
    const parts: string[] = [];
    for (const categorySlug of CORE_CATEGORIES) {
      const count = await countForCar(car, categorySlug);
      if (count <= 0) empty += 1;
      parts.push(`${categorySlug}=${count}`);
    }
    const flag = parts.some((part) => part.endsWith("=0")) ? "  ⚠ ЕСТЬ ПУСТЫЕ" : "";
    console.log(`${car.label.padEnd(22)} всего ${String(total).padStart(3)} | ${parts.join(" ")}${flag}`);
  }

  const [products, fitments, universal] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.fitment.count(),
    prisma.product.count({ where: { fitmentType: "universal" } }),
  ]);
  console.log(`\nТоваров ${products}, из них универсальных ${universal}, записей совместимости ${fitments}`);
  console.log(empty === 0 ? "OK: во всех категориях есть товары для каждого авто." : `ВНИМАНИЕ: пустых комбинаций ${empty}`);
  process.exitCode = empty === 0 ? 0 : 1;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
