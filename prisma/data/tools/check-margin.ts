/**
 * Чистая проверка денежной логики импорта: наценка поставщика и purchasePrice.
 *
 * Создаёт временный товар с уникальным SKU, проверяет результат и удаляет его.
 * Запуск: npx tsx prisma/data/tools/check-margin.ts
 */

import { PrismaClient } from "@prisma/client";
import { runImport } from "../../../src/lib/import";

const prisma = new PrismaClient();

const SKU = `G19-TEST-MARGIN-${Date.now()}`;

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="2025-05-15T09:00:00+03:00">
  <shop>
    <categories><category id="1">Поперечины на крышу</category></categories>
    <offers>
      <offer id="${SKU}" available="true">
        <vendorCode>${SKU}</vendorCode>
        <name>Тестовый багажник для проверки наценки</name>
        <vendor>Thule</vendor>
        <price>10000</price>
        <currencyId>RUR</currencyId>
        <categoryId>1</categoryId>
        <count>3</count>
        <param name="Место установки">рейлинги</param>
        <param name="Грузоподъёмность">75</param>
        <param name="Гарантия">24</param>
      </offer>
    </offers>
  </shop>
</yml_catalog>`;

async function main(): Promise<void> {
  const supplier = await prisma.supplier.findUnique({ where: { slug: "roofsystems" }, select: { id: true, marginPercent: true } });
  if (!supplier) throw new Error("Поставщик roofsystems не найден — выполните npm run db:seed");

  // Эмулируем поведение админки: она создаёт ImportJob до вызова runImport.
  const preCreatedJob = await prisma.importJob.create({
    data: {
      fileName: "margin-check.xml",
      sourceType: "xml",
      supplierId: supplier.id,
      status: "pending",
      mode: "update",
    },
    select: { id: true },
  });

  const result = await runImport({
    text: XML,
    fileName: "margin-check.xml",
    sourceType: "xml",
    supplierId: supplier.id,
    mode: "update",
    defaultCategorySlug: "krepezh-i-aksessuary",
    // Проверяем интеграцию с админкой: задача уже создана её Server Action,
    // движок должен обновить её, а не создавать вторую.
    jobId: preCreatedJob.id,
  });

  const jobAfter = await prisma.importJob.findUnique({
    where: { id: preCreatedJob.id },
    select: { status: true, totalRows: true, createdCount: true },
  });
  const jobCount = await prisma.importJob.count({ where: { fileName: "margin-check.xml" } });

  const product = await prisma.product.findUnique({
    where: { sku: SKU },
    select: {
      price: true,
      purchasePrice: true,
      stock: true,
      supplierId: true,
      externalId: true,
      fitmentType: true,
      category: { select: { slug: true } },
      manufacturer: { select: { name: true } },
      _count: { select: { attributes: true, fitments: true, images: true } },
    },
  });

  console.log(`Импорт: создано ${result.createdCount}, обновлено ${result.updatedCount}, ошибок ${result.errorCount}`);
  console.log(
    `  переиспользование ImportJob: задач с этим файлом ${jobCount}, статус ${jobAfter?.status}, строк ${jobAfter?.totalRows} → ` +
      `${jobCount === 1 && jobAfter?.status === "done" ? "OK" : "ОШИБКА"}`,
  );
  if (!product) {
    console.error("✗ товар не создан");
    process.exitCode = 1;
    return;
  }

  const expected = Math.round(10_000 * 100 * (1 + supplier.marginPercent / 100));
  const ok = {
    margin: product.price === expected,
    purchase: product.purchasePrice === 10_000 * 100,
    supplier: product.supplierId === supplier.id,
    external: product.externalId === SKU,
    category: product.category.slug.startsWith("bagazhniki"),
    attributes: product._count.attributes >= 3,
    fitments: product._count.fitments > 0,
    images: product._count.images > 0,
    jobReused: jobCount === 1 && jobAfter?.status === "done",
  };

  console.log(`  наценка: цена ${(product.price / 100).toFixed(2)} ₽, ожидалось ${(expected / 100).toFixed(2)} ₽ (${supplier.marginPercent}%) → ${ok.margin ? "OK" : "ОШИБКА"}`);
  console.log(`  закупка: ${((product.purchasePrice ?? 0) / 100).toFixed(2)} ₽ → ${ok.purchase ? "OK" : "ОШИБКА"}`);
  console.log(`  поставщик/внешний id: ${ok.supplier && ok.external ? "OK" : "ОШИБКА"}`);
  console.log(`  категория: ${product.category.slug} → ${ok.category ? "OK" : "ОШИБКА"}`);
  console.log(`  производитель: ${product.manufacturer?.name ?? "—"} · атрибутов ${product._count.attributes} · совместимость ${product._count.fitments} · фото ${product._count.images}`);
  console.log(`  fitmentType: ${product.fitmentType} → ${ok.fitments ? "OK" : "ОШИБКА"}`);

  // Уборка: удаляем тестовый товар и его ImportJob
  await prisma.product.deleteMany({ where: { sku: SKU } });
  await prisma.importJob.deleteMany({ where: { fileName: "margin-check.xml" } });
  console.log("  тестовые данные удалены");

  const failed = Object.entries(ok).filter(([, value]) => !value).map(([key]) => key);
  if (failed.length > 0) {
    console.error(`✗ провалы: ${failed.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("\nOK: наценка, purchasePrice, категория, характеристики, совместимость и изображения — корректны.");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
