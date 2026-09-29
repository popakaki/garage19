/**
 * Проверка целостности демо-данных ДО запуска сидера.
 *
 * Запуск: npx tsx prisma/data/validate.ts
 *
 * Проверяет:
 *  * уникальность slug/SKU товаров и slug'ов категорий/марок/поколений;
 *  * существование категории, бренда и атрибутов у каждого товара;
 *  * валидность ключей совместимости (Fitment) по справочнику автомобилей;
 *  * допустимость значений select-атрибутов (рейлинги, алюминий, WingBar и т.д.);
 *  * ссылки accessories/analogs на существующие товары;
 *  * покрытие флагманских авто товарами во всех основных категориях.
 */

import { ATTRIBUTE_SEEDS, CATEGORY_TREE } from "./catalog";
import { CAR_BRANDS, buildCarIndex } from "./cars";
import { PRODUCT_BRANDS } from "./brands";
import { FLAGSHIP_BRAND_SLUGS, FLAGSHIP_CARS, PRODUCTS } from "./products";
import { QUESTIONS, REVIEWS } from "./reviews";

type CategoryFlat = { slug: string; parentSlug?: string };

function flattenCategories(): CategoryFlat[] {
  const flat: CategoryFlat[] = [];
  for (const root of CATEGORY_TREE) {
    flat.push({ slug: root.slug });
    for (const child of root.children ?? []) flat.push({ slug: child.slug, parentSlug: root.slug });
  }
  return flat;
}

/** Сокращённые ключи атрибутов → слаг'и (синхронно с сидером). */
const ATTRIBUTE_ALIASES: Record<string, string> = {
  mount: "mesto-ustanovki",
  mat: "material",
  prof: "profil",
  hook: "tip-kryuka",
  cap: "gruzopodyomnost",
  vol: "obyom",
  lock: "zamok-v-komplekte",
  cut: "vyrez-bampera",
  el: "elektrika-v-komplekte",
  doors: "kolichestvo-dverey",
  warranty: "garantiya",
  plug: "tip-razema",
  bikes: "kolichestvo-velosipedov",
  pairs: "kolichestvo-par-lyzh",
  vert: "vertikalnaya-nagruzka",
  tow: "tyagovaya-nagruzka",
};

export function resolveAttributeSlug(key: string): string {
  return ATTRIBUTE_ALIASES[key] ?? key;
}

export function validateData(): string[] {
  const problems: string[] = [];
  const categories = flattenCategories();
  const categorySlugs = new Set(categories.map((category) => category.slug));

  // ── Дубликаты в справочнике категорий ────────────────────────────────────
  if (categorySlugs.size !== categories.length) problems.push("Дубликаты slug'ов категорий");

  /** Категория товара с учётом ветки: matchesCategory("veloperekreateli-na-kryshu", "veloperekreateli"). */
  const inCategory = (productCategory: string, categorySlug: string) =>
    productCategory === categorySlug || productCategory.startsWith(`${categorySlug}-`);

  // ── Атрибуты ─────────────────────────────────────────────────────────────
  const attributeBySlug = new Map(ATTRIBUTE_SEEDS.map((attribute) => [attribute.slug, attribute]));
  const attributeSlugs = new Set(ATTRIBUTE_SEEDS.map((attribute) => attribute.slug));
  const productBrandNames = new Set(PRODUCT_BRANDS.map((brand) => brand.name));

  // ── Дубликаты slug/SKU товаров ───────────────────────────────────────────
  const seenSlugs = new Map<string, string>();
  const seenSkus = new Map<string, string>();
  for (const product of PRODUCTS) {
    if (seenSlugs.has(product.slug)) problems.push(`Дубликат slug товара: ${product.slug}`);
    seenSlugs.set(product.slug, product.sku);
    if (seenSkus.has(product.sku)) problems.push(`Дубликат SKU: ${product.sku} (${product.slug})`);
    seenSkus.set(product.sku, product.slug);
  }
  const productSlugs = new Set(PRODUCTS.map((product) => product.slug));

  // ── Справочник автомобилей ───────────────────────────────────────────────
  const carIndex = buildCarIndex();
  const carBrandSlugs = new Set<string>();
  const carModelSlugs = new Set<string>();
  const carGenerationSlugs = new Set<string>();
  for (const brand of CAR_BRANDS) {
    if (carBrandSlugs.has(brand.slug)) problems.push(`Дубликат slug марки авто: ${brand.slug}`);
    carBrandSlugs.add(brand.slug);
    if (brand.models.length < 2) problems.push(`У марки ${brand.slug} меньше 2 моделей`);
    for (const model of brand.models) {
      const modelKey = `${brand.slug}/${model.slug}`;
      if (carModelSlugs.has(modelKey)) problems.push(`Дубликат модели: ${modelKey}`);
      carModelSlugs.add(modelKey);
      if (model.generations.length === 0) problems.push(`У модели ${modelKey} нет поколений`);
      for (const generation of model.generations) {
        const generationKey = `${modelKey}/${generation.slug}`;
        if (carGenerationSlugs.has(generationKey)) problems.push(`Дубликат поколения: ${generationKey}`);
        carGenerationSlugs.add(generationKey);
        if (generation.modifications.length === 0) problems.push(`У поколения ${generationKey} нет модификаций`);
        if (generation.yearTo && generation.yearTo < generation.yearFrom) {
          problems.push(`Некорректные годы у поколения ${generationKey}`);
        }
      }
    }
  }

  // ── Товары ───────────────────────────────────────────────────────────────
  for (const product of PRODUCTS) {
    const where = `${product.sku} (${product.slug})`;

    if (!categorySlugs.has(product.category)) {
      problems.push(`${where}: неизвестная категория «${product.category}»`);
    }
    if (!productBrandNames.has(product.brand)) {
      problems.push(`${where}: бренд «${product.brand}» отсутствует в PRODUCT_BRANDS`);
    }
    if (product.price <= 0) problems.push(`${where}: цена должна быть больше нуля`);
    if (product.oldPrice !== undefined && product.oldPrice <= product.price) {
      problems.push(`${where}: старая цена должна быть больше текущей`);
    }
    if (product.stock < 0) problems.push(`${where}: отрицательный склад`);
    if (product.images.length < 3) problems.push(`${where}: меньше 3 изображений`);
    if (product.description.length < 120) problems.push(`${where}: слишком короткое описание`);

    const facet = product.facets;
    if (facet.capacityKg !== undefined && facet.capacityKg <= 0) problems.push(`${where}: capacityKg <= 0`);
    if (facet.volumeL !== undefined && facet.volumeL <= 0) problems.push(`${where}: volumeL <= 0`);

    // Атрибуты: слаг существует, значение допустимо для select
    for (const [rawKey, value] of Object.entries(facet.attributes ?? {})) {
      const slug = resolveAttributeSlug(rawKey);
      const attribute = attributeBySlug.get(slug);
      if (!attribute) {
        problems.push(`${where}: неизвестный атрибут «${rawKey}» → «${slug}»`);
        continue;
      }
      if (attribute.type === "select" && attribute.options && typeof value === "string") {
        if (!attribute.options.includes(value)) {
          problems.push(`${where}: значение «${value}» не входит в options атрибута ${slug}`);
        }
      }
      if (attribute.type === "bool" && typeof value !== "boolean") {
        problems.push(`${where}: атрибут ${slug} должен быть boolean`);
      }
      if (attribute.type === "number" && typeof value !== "number") {
        problems.push(`${where}: атрибут ${slug} должен быть числом`);
      }
    }

    // Совместимость
    if (product.fitment.type === "specific") {
      for (const target of product.fitment.targets) {
        if (!carIndex.has(target)) problems.push(`${where}: неизвестная цель совместимости «${target}»`);
      }
    }

    for (const slug of [...(product.accessories ?? []), ...(product.analogs ?? [])]) {
      if (!productSlugs.has(slug)) problems.push(`${where}: ссылка на несуществующий товар «${slug}»`);
      if (slug === product.slug) problems.push(`${where}: ссылка на самого себя`);
    }

    for (const document of product.documents ?? []) {
      if (!document.url.startsWith("/docs/")) problems.push(`${where}: документ вне /docs/`);
    }
  }

  // ── Покрытие флагманских авто ────────────────────────────────────────────
  const coreCategories = [
    "bagazhniki",
    "avtoboksy",
    "veloperekreateli",
    "lyzhnye-krepleniya",
    "farkopy",
  ];
  for (const flagship of FLAGSHIP_CARS) {
    if (!carIndex.has(flagship)) {
      problems.push(`Флагманское авто «${flagship}» отсутствует в справочнике`);
      continue;
    }
    for (const categorySlug of coreCategories) {
      const found = PRODUCTS.some((product) => {
        if (!inCategory(product.category, categorySlug)) return false;
        if (product.fitment.type === "universal") return true;
        const brandSlug = flagship.split("/")[0];
        // Прямая привязка к марке авто либо флаг flagship у товара —
        // сидер добавит таким товарам ключи остальных флагманских моделей.
        if (product.fitment.targets.some((target) => target.startsWith(brandSlug))) return true;
        // Флаг flagship добавляет ключи только для марок, уже присутствующих в targets.
        if (!product.fitment.flagship) return false;
        const brands = new Set(product.fitment.targets.map((target) => target.split("/")[0]));
        return brands.has(brandSlug) && FLAGSHIP_BRAND_SLUGS.has(brandSlug);
      });
      if (!found) {
        problems.push(`Нет товаров категории «${categorySlug}» для флагманского авто ${flagship}`);
      }
    }
  }

  // ── Отзывы и вопросы ─────────────────────────────────────────────────────
  for (const review of REVIEWS) {
    if (review.productIndex < 0 || review.productIndex >= PRODUCTS.length) {
      problems.push(`Отзыв «${review.authorName}»: productIndex ${review.productIndex} вне диапазона`);
      continue;
    }
    if (review.rating < 1 || review.rating > 5) {
      problems.push(`Отзыв «${review.authorName}»: рейтинг ${review.rating} вне 1–5`);
    }
    if (review.text.length < 40) {
      problems.push(`Отзыв «${review.authorName}»: слишком короткий текст`);
    }
  }
  for (const question of QUESTIONS) {
    if (question.productIndex < 0 || question.productIndex >= PRODUCTS.length) {
      problems.push(`Вопрос «${question.authorName}»: productIndex ${question.productIndex} вне диапазона`);
      continue;
    }
    if (question.status === "published" && !question.answer) {
      problems.push(`Вопрос «${question.authorName}»: опубликован без ответа`);
    }
  }

  const publishedReviews = REVIEWS.filter((review) => review.status === "published").length;
  const publishedQuestions = QUESTIONS.filter((question) => question.status === "published").length;

  // ── Сводка ───────────────────────────────────────────────────────────────
  const byCategory = new Map<string, number>();
  for (const product of PRODUCTS) {
    byCategory.set(product.category, (byCategory.get(product.category) ?? 0) + 1);
  }
  console.log(`Категорий: ${categorySlugs.size}, марок авто: ${carBrandSlugs.size}, моделей: ${carModelSlugs.size}, поколений: ${carGenerationSlugs.size}`);
  console.log(`Товаров: ${PRODUCTS.length}`);
  for (const [slug, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(3)} — ${slug}`);
  }
  console.log(`Атрибутов: ${attributeSlugs.size}`);
  console.log(`Отзывов: ${REVIEWS.length} (опубликовано ${publishedReviews}), вопросов: ${QUESTIONS.length} (опубликовано ${publishedQuestions})`);

  return problems;
}

const problems = validateData();
if (problems.length === 0) {
  console.log("\nOK: демо-данные прошли проверку.");
  process.exitCode = 0;
} else {
  console.error(`\nНайдено проблем: ${problems.length}`);
  for (const problem of problems) console.error(`  · ${problem}`);
  process.exitCode = 1;
}
