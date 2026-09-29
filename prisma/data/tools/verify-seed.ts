/**
 * Финальная проверка демо-данных в БД: рейтинги, изображения, документы,
 * фасеты, «гараж», заказы и записи на установку.
 *
 * Запуск: npx tsx prisma/data/tools/verify-seed.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Check = { name: string; ok: boolean; detail: string };

async function main(): Promise<void> {
  const checks: Check[] = [];
  const push = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

  const [products, ratingsWithReviews, externalImages, reviews, questions, orders, savedCars, bookings] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { ratingCount: { gt: 0 } } }),
      prisma.productImage.count({ where: { url: { not: { startsWith: "/" } } } }),
      prisma.review.findMany({ select: { status: true } }),
      prisma.productQuestion.findMany({ select: { status: true, answer: true } }),
      prisma.order.findMany({
        select: { status: true, paymentStatus: true, items: { select: { id: true } }, total: true },
      }),
      prisma.savedCar.count(),
      prisma.installBooking.count(),
    ]);

  const savedCarRows = await prisma.savedCar.findMany({ select: { userId: true } });
  const savedCarCounts = new Map<string, number>();
  for (const row of savedCarRows) savedCarCounts.set(row.userId, (savedCarCounts.get(row.userId) ?? 0) + 1);
  const savedCarsPerUser = { biggest: Math.max(0, ...savedCarCounts.values()) };

  push("товаров", products >= 120 && products <= 200, `${products} (ожидается 120–200)`);
  push("товары с рейтингом", ratingsWithReviews >= 30, `${ratingsWithReviews} товаров имеют ratingCount > 0`);
  push("изображения только локальные", externalImages === 0, `внешних URL: ${externalImages}`);

  const published = reviews.filter((review) => review.status === "published").length;
  const pending = reviews.filter((review) => review.status === "pending").length;
  push("отзывы", reviews.length >= 40 && reviews.length <= 60, `${reviews.length} (опубликовано ${published}, на модерации ${pending})`);
  push("отзывов на модерации 5–8", pending >= 5 && pending <= 8, `${pending}`);

  const publishedQuestions = questions.filter((question) => question.status === "published").length;
  push("вопросов", questions.length >= 15 && questions.length <= 25, `${questions.length} (опубликовано ${publishedQuestions})`);
  push(
    "опубликованные вопросы с ответом",
    questions.every((question) => question.status !== "published" || Boolean(question.answer)),
    "",
  );

  const statuses = new Set(orders.map((order) => order.status));
  const payments = new Set(orders.map((order) => order.paymentStatus));
  push("заказов 6–10", orders.length >= 6 && orders.length <= 10, `${orders.length}`);
  push("статусов заказов ≥ 4", statuses.size >= 4, [...statuses].join(", "));
  push("статусов оплаты ≥ 3", payments.size >= 3, [...payments].join(", "));
  push("у всех заказов есть позиции", orders.every((order) => order.items.length > 0), "");
  push("суммы заказов > 0", orders.every((order) => order.total > 0), "");

  push("сохранённых авто (демо-«гараж»)", savedCars >= 2 && savedCars <= 6, `${savedCars} у демо-покупателей`);
  push("сохранённых авто у покупателя", savedCarsPerUser.biggest >= 2 && savedCarsPerUser.biggest <= 3, `максимум ${savedCarsPerUser.biggest} у одного покупателя, всего ${savedCars}`);
  push("записей на установку", bookings === 2, `${bookings}`);

  // Фасеты: сколько товаров имеют ключевые колонки
  const [withCapacity, withVolume, withMaterial, withMount, withLock, withBumper, withElectric, rentable] =
    await Promise.all([
      prisma.product.count({ where: { capacityKg: { not: null } } }),
      prisma.product.count({ where: { volumeL: { not: null } } }),
      prisma.product.count({ where: { material: { not: null } } }),
      prisma.product.count({ where: { mountPlace: { not: null } } }),
      prisma.product.count({ where: { lockIncluded: { not: null } } }),
      prisma.product.count({ where: { bumperCut: { not: null } } }),
      prisma.product.count({ where: { electricIncluded: { not: null } } }),
      prisma.product.count({ where: { rentAvailable: true } }),
    ]);

  push("capacityKg заполнен", withCapacity >= 50, `${withCapacity}`);
  push("volumeL заполнен", withVolume >= 15, `${withVolume}`);
  push("material заполнен", withMaterial >= 50, `${withMaterial}`);
  push("mountPlace заполнен", withMount >= 50, `${withMount}`);
  push("lockIncluded заполнен", withLock >= 30, `${withLock}`);
  push("bumperCut заполнен (фаркопы)", withBumper >= 15, `${withBumper}`);
  push("electricIncluded заполнен (фаркопы)", withElectric >= 15, `${withElectric}`);
  push("rentAvailable (аренда)", rentable >= 1, `${rentable}`);

  // Документы: паспорт и сертификат у фаркопов, инструкция у багажников
  const [towbars, towbarDocs, roofDocs, productAttributes, fitments, relations, cities, tariffs, pickupPoints] =
    await Promise.all([
      prisma.product.count({ where: { category: { slug: { startsWith: "farkopy" } } } }),
      prisma.product.count({
        where: { category: { slug: { startsWith: "farkopy" } }, documents: { some: { type: "passport" } } },
      }),
      prisma.product.count({
        where: { category: { slug: { startsWith: "bagazhniki" } }, documents: { some: { type: "instruction" } } },
      }),
      prisma.productAttribute.count(),
      prisma.fitment.count(),
      prisma.productRelation.count(),
      prisma.city.count(),
      prisma.deliveryTariff.count(),
      prisma.pickupPoint.count(),
    ]);

  push("у фаркопов есть паспорт ТСУ", towbarDocs === towbars, `${towbarDocs} из ${towbars}`);
  push("у багажников есть инструкция", roofDocs > 0, `${roofDocs} товаров`);
  push("значения характеристик", productAttributes >= 500, `${productAttributes}`);
  push("записей совместимости", fitments >= 400, `${fitments}`);
  push("связей товаров (аксессуары/аналоги)", relations >= 20, `${relations}`);
  push("городов 7", cities === 7, `${cities}`);
  push("тарифов доставки", tariffs >= 40, `${tariffs}`);
  push("пунктов выдачи", pickupPoints >= 20, `${pickupPoints}`);

  // Сводка
  console.log("Проверка демо-данных в БД:\n");
  let failed = 0;
  for (const check of checks) {
    if (!check.ok) failed += 1;
    console.log(`${check.ok ? "OK  " : "FAIL"} ${check.name.padEnd(38)} ${check.detail}`);
  }
  console.log(`\n${failed === 0 ? "Все проверки пройдены." : `Провалено проверок: ${failed}`}`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
