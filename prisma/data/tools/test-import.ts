/**
 * Проверка движка импорта на фикстурах из prisma/data/samples.
 *
 * Запуск: npx tsx prisma/data/tools/test-import.ts
 *
 * Что делает:
 *  1. dry_run для YML, XML и CSV — проверяет разбор и план импорта;
 *  2. реальный прогон в режиме update для YML (создаёт/обновляет товары);
 *  3. повторный прогон в режиме insert_only — проверяет, что дублей не появляется;
 *  4. печатает сводку и первые ошибки.
 *
 * Требует поднятой БД и выполненного `npm run db:seed`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runImport } from "../../../src/lib/import";
import type { ImportResult, ImportSourceType } from "../../../src/lib/import";

const SAMPLES = resolve(process.cwd(), "prisma/data/samples");

function readSample(file: string): string {
  return readFileSync(resolve(SAMPLES, file), "utf8");
}

function report(title: string, result: ImportResult): void {
  console.log(`\n━━ ${title} ━━`);
  console.log(`  статус: ${result.status}, строк в файле: ${result.totalRows}`);
  console.log(`  создано: ${result.createdCount}, обновлено: ${result.updatedCount}, пропущено: ${result.skippedCount}, ошибок: ${result.errorCount}`);
  if (result.errors.length > 0) {
    console.log("  ошибки:");
    for (const error of result.errors.slice(0, 5)) console.log(`    · ${error}`);
  }
  const plan = result.log
    .split("\n")
    .filter((line: string) => line.trim().startsWith("[") || line.includes("Итог") || line.includes("Итого"))
    .slice(0, 8);
  if (plan.length > 0) {
    console.log("  фрагмент журнала:");
    for (const line of plan) console.log(`    ${line.trim()}`);
  }
}

type Case = { title: string; file: string; sourceType: ImportSourceType; supplierSlug: string };

const CASES: Case[] = [
  { title: "YML (Яндекс.Маркет)", file: "supplier-price.yml", sourceType: "yml", supplierSlug: "roofsystems" },
  { title: "XML (произвольный)", file: "supplier-price.xml", sourceType: "xml", supplierSlug: "atera-pro" },
  { title: "CSV (фаркопы)", file: "supplier-price.csv", sourceType: "csv", supplierSlug: "towrus-trade" },
];

async function main(): Promise<void> {
  let failures = 0;

  // ── 1. dry_run по всем фикстурам ──────────────────────────────────────────
  for (const testCase of CASES) {
    const supplier = await findSupplier(testCase.supplierSlug);
    const result = await runImport({
      text: readSample(testCase.file),
      fileName: testCase.file,
      sourceType: testCase.sourceType,
      supplierId: supplier?.id,
      mode: "dry_run",
      defaultCategorySlug: "krepezh-i-aksessuary",
    });
    report(`dry_run · ${testCase.title}`, result);

    if (result.totalRows === 0) {
      failures += 1;
      console.error(`  ✗ не распознано ни одной строки (${testCase.file})`);
    }
    if (result.errorCount > 0 && result.createdCount + result.updatedCount === 0) {
      failures += 1;
      console.error(`  ✗ все строки с ошибками (${testCase.file})`);
    }
  }

  // ── 2. Реальный импорт YML ────────────────────────────────────────────────
  const supplier = await findSupplier("roofsystems");
  const first = await runImport({
    text: readSample("supplier-price.yml"),
    fileName: "supplier-price.yml",
    sourceType: "yml",
    supplierId: supplier?.id,
    mode: "update",
    defaultCategorySlug: "krepezh-i-aksessuary",
  });
  report("update · YML (запись в БД)", first);
  if (first.createdCount + first.updatedCount === 0) {
    failures += 1;
    console.error("  ✗ режим update не записал ни одного товара");
  }

  // ── 3. Повторный прогон в insert_only ─────────────────────────────────────
  const repeated = await runImport({
    text: readSample("supplier-price.yml"),
    fileName: "supplier-price.yml",
    sourceType: "yml",
    supplierId: supplier?.id,
    mode: "insert_only",
    defaultCategorySlug: "krepezh-i-aksessuary",
  });
  report("insert_only · YML (повтор)", repeated);
  if (repeated.createdCount > 0) {
    failures += 1;
    console.error("  ✗ повторный импорт создал дубликаты");
  }

  // ── 4. Уборка: удаляем тестовые ImportJob и товары, которых нет в сиде ────
  // Реальные прогоны обновляют товары с теми же SKU, что и сидер, поэтому после
  // теста запускаем `npm run db:seed` — он приводит демо-каталог к исходному виду.
  const { PrismaClient } = await import("@prisma/client");
  const { PRODUCTS } = await import("../products");
  const seedSkus = new Set(PRODUCTS.map((product) => product.sku));

  const cleanup = new PrismaClient();
  const removedJobs = await cleanup.importJob.deleteMany({
    where: { fileName: { in: ["supplier-price.yml", "supplier-price.xml", "supplier-price.csv"] } },
  });
  const strayProducts = await cleanup.product.findMany({ select: { id: true, sku: true } });
  const strayIds = strayProducts.filter((product) => !product.sku || !seedSkus.has(product.sku)).map((product) => product.id);
  if (strayIds.length > 0) {
    await cleanup.product.deleteMany({ where: { id: { in: strayIds } } });
  }
  const remaining = await cleanup.product.count();
  await cleanup.$disconnect();
  console.log(`\nУдалено тестовых ImportJob: ${removedJobs.count}, тестовых товаров: ${strayIds.length}, товаров в БД: ${remaining}`);

  if (process.env.SKIP_RESEED !== "1") {
    console.log(
      "Тест обновляет товары с теми же SKU, что и сидер.\n" +
        "Чтобы вернуть демо-цены и описания, выполните: npm run db:seed",
    );
  }

  console.log(
    failures === 0
      ? "\nOK: импорт работает на всех фикстурах (dry_run, update, insert_only)."
      : `\nВНИМАНИЕ: проблем ${failures}.`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

/** Ищет поставщика по slug, чтобы применить наценку. */
async function findSupplier(slug: string): Promise<{ id: string } | null> {
  const { PrismaClient } = await import("@prisma/client");
  const client = new PrismaClient();
  const supplier = await client.supplier.findUnique({ where: { slug }, select: { id: true } });
  await client.$disconnect();
  return supplier;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
