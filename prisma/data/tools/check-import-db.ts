/**
 * Проверка результатов импорта в БД: наценка, purchasePrice, ImportJob,
 * созданные категории и совместимость.
 *
 * Запуск: npx tsx prisma/data/tools/check-import-db.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const supplier = await prisma.supplier.findUnique({ where: { slug: "roofsystems" } });
  console.log(`Поставщик: ${supplier?.name}, наценка ${supplier?.marginPercent}%`);

  const imported = await prisma.product.findMany({
    where: { supplierId: supplier?.id ?? undefined, externalId: { not: null } },
    select: {
      sku: true,
      name: true,
      price: true,
      purchasePrice: true,
      stock: true,
      fitmentType: true,
      images: { select: { url: true }, take: 2 },
      _count: { select: { fitments: true, attributes: true } },
    },
    orderBy: { sku: "asc" },
    take: 8,
  });

  console.log("\nТовары поставщика (цена продажи / закупка):");
  for (const product of imported) {
    const margin =
      product.purchasePrice && product.purchasePrice > 0
        ? ` (+${Math.round(((product.price - product.purchasePrice) / product.purchasePrice) * 100)}%)`
        : "";
    console.log(
      `  ${product.sku.padEnd(26)} ${(product.price / 100).toFixed(2).padStart(10)} ₽ / ` +
        `${((product.purchasePrice ?? 0) / 100).toFixed(2).padStart(10)} ₽${margin} · ` +
        `склад ${product.stock} · ${product.fitmentType} · совместимость ${product._count.fitments} · ` +
        `характеристик ${product._count.attributes} · фото ${product.images.length}`,
    );
  }

  const jobs = await prisma.importJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      fileName: true,
      sourceType: true,
      mode: true,
      status: true,
      totalRows: true,
      createdCount: true,
      updatedCount: true,
      skippedCount: true,
      errorCount: true,
      log: true,
    },
  });

  console.log("\nImportJob (последние запуски):");
  for (const job of jobs) {
    console.log(
      `  ${job.fileName} · ${job.sourceType} · ${job.mode} · ${job.status} · ` +
        `строк ${job.totalRows}, создано ${job.createdCount}, обновлено ${job.updatedCount}, ` +
        `пропущено ${job.skippedCount}, ошибок ${job.errorCount} · лог ${job.log?.length ?? 0} символов`,
    );
  }

  const categories = await prisma.category.findMany({
    where: { sortOrder: 900 },
    select: { slug: true, name: true, _count: { select: { products: true } } },
  });
  console.log("\nКатегории, созданные импортом:");
  if (categories.length === 0) console.log("  (нет)");
  for (const category of categories) {
    console.log(`  ${category.slug} — ${category.name} (товаров ${category._count.products})`);
  }

  const audit = await prisma.auditLog.count({ where: { action: "import" } });
  console.log(`\nAuditLog(action=import): ${audit}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
