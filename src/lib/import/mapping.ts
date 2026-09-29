/**
 * Сопоставление данных прайса со справочниками Garage19.
 *
 * Отвечает за:
 *  * определение категории товара по названию из фида (YML-классификация у всех
 *    поставщиков своя, поэтому используем словарь ключевых слов + разбор ветки);
 *  * сопоставление бренда производителя с таблицей Brand (создание нового при промахе);
 *  * нормализацию названий автомобилей к справочнику
 *    марка → модель → поколение → модификация (по slug и годам выпуска).
 *
 * Модуль не пишет в БД сам: возвращает решения (slug / ключи fitment),
 * а запись выполняет engine.ts. Исключение — resolver.load(): он читает справочники.
 */

import type { PrismaClient } from "@prisma/client";
import { slugify } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Словарь категорий: ключевые слова → slug каталога
// ─────────────────────────────────────────────────────────────────────────────

type CategoryRule = {
  slug: string;
  /** Слова, при наличии которых категория считается подходящей. */
  keywords: string[];
  /** Вес правила: специфичные категории важнее общих. */
  weight: number;
  /**
   * Стоп-слова: если в названии товара есть любое из них, правило не применяется.
   * Нужны, чтобы «Велокрепление на фаркоп» не попадало в категорию «Фаркопы».
   */
  excludeKeywords?: string[];
};

/**
 * Правила подобраны по ассортименту проекта (docs/competitor-research.md, раздел 4.1)
 * и по типовым названиям разделов в фидах поставщиков.
 */
const CATEGORY_RULES: CategoryRule[] = [
  {
    slug: "elektrika-farkopov",
    keywords: ["электрик", "провод", "жгут", "розетк", "разъем", "разъём", "адаптер", "переходник", "pin", "блок соглас", "согласующ"],
    weight: 100,
  },
  {
    slug: "farkopy",
    keywords: ["фаркоп", "тсу", "тягово-сцепн", "сцепное устройство", " towbar", "буксировочн", "орис", "westfalia", "brink", "galia", "auto-hak"],
    weight: 95,
    // Фаркопы для перевозки велосипедов/грузов — это крепления, а не ТСУ
    excludeKeywords: ["велокреп", "велокрепл", "велобагаж", "платформ для велосипед", "bike", "easyfold", "strada", "velocompact", "valentino", "boks na farkop", "бокс на фаркоп"],
  },
  {
    slug: "avtoboksy",
    keywords: ["автобокс", "бокс", "skybox", "motion", "casar", "xplorer", "quasar", "diamond"],
    weight: 90,
    excludeKeywords: ["велокреп", "велокрепл", "лыжн", "корзин", "замок", "сумка", "поддон", "чехол"],
  },
  {
    slug: "veloperekreateli",
    keywords: ["велокреп", "велокрепл", "велобагаж", "для велосипед", "bike", "proride", "upride", "freeride", "easyfold", "strada", "clipon", "velocompact", "barracuda", "frontloader", "valentino", "giro", "alcor"],
    weight: 85,
  },
  {
    slug: "lyzhnye-krepleniya",
    keywords: ["лыжн", "лыжи", "сноуборд", "snowpack", "ski", "snowboard"],
    weight: 85,
  },
  {
    slug: "korziny-i-platformy",
    keywords: ["корзин", "платформ", "basket", "canyon", "грузов"],
    weight: 80,
    excludeKeywords: ["велокреп", "велобагаж", "автобокс", "лыжн"],
  },
  {
    slug: "vodnoe-snaryazhenie",
    keywords: ["каяк", "kayak", "sup", "серф", "водн", "hullavator", "waterpack"],
    weight: 80,
  },
  {
    slug: "krepezh-i-aksessuary",
    keywords: ["аксессуар", "крепёж", "крепеж", "ремкомплект", "замок", "ключ", "сумка", "сетка", "ремень", "ремни", "поддон", "чехол", "заглушк", "болт", "t-track"],
    weight: 70,
    excludeKeywords: ["электрик", "жгут", "розетк"],
  },
  {
    slug: "bagazhniki",
    keywords: ["багажник", "дуг", "поперечин", "рейлинг", "wingbar", "whispbar", "jetstream", "signo", "xplore", "piligrim", "titan", "rollster", "turtle", "lux", "aero", "flush bar", "through bar"],
    weight: 60,
    excludeKeywords: ["велокреп", "автобокс", "лыжн", "фаркоп", "корзин"],
  },
];

/** Категории-сигналы: если название товара содержит такое слово, категория почти определена. */
const CATEGORY_SIGNALS: { pattern: RegExp; slug: string }[] = [
  { pattern: /велокрепл|велокреп|велобагаж|bike carrier|proride|upride|freeride|easyfold|strada|clipon|velocompact|barracuda|frontloader|valentino/i, slug: "veloperekreateli" },
  { pattern: /автобокс|бокс на крышу|skybox|motion xt|motion 3|casar|xplorer|quasar/i, slug: "avtoboksy" },
  { pattern: /лыжн|сноуборд|snowpack|ski carrier/i, slug: "lyzhnye-krepleniya" },
  { pattern: /электрик|жгут провод|розетка фаркопа|согласующ|адаптер.*pin|переходник.*pin/i, slug: "elektrika-farkopov" },
  { pattern: /фаркоп|тсу|тягово-сцепн|towbar|сцепное устройство/i, slug: "farkopy" },
  { pattern: /корзин|грузов.*платформ|canyon|basket/i, slug: "korziny-i-platformy" },
  { pattern: /каяк|sup|серф|kayak|waterpack|hullavator/i, slug: "vodnoe-snaryazhenie" },
  { pattern: /замок|ремкомплект|сумка|сетка|ремень|ремни|поддон|чехол|заглушк|болт|t-track/i, slug: "krepezh-i-aksessuary" },
  { pattern: /багажник|дуги|поперечин|wingbar|whispbar|jetstream|signo|flush bar|through bar/i, slug: "bagazhniki" },
];

export type CategoryMatch = {
  /** Slug категории; undefined, если совпадений нет. */
  slug?: string;
  /** Оценка уверенности 0..1 — в лог попадает только высокая. */
  confidence: number;
  /** По какому ключевому слову сработало. */
  matched?: string;
};

/** Нормализует строку для нечёткого сравнения: нижний регистр, без разделителей. */
function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim();
}

/**
 * Определяет категорию по названию раздела фида и названию товара.
 *
 * Приоритет:
 *  1. точное совпадение slug'а или названия категории каталога;
 *  2. «сигнал» в названии товара (велокрепление, автобокс, фаркоп...) — он надёжнее
 *     раздела фида, потому что поставщики часто кладут всё в один раздел;
 *  3. ключевые слова с учётом стоп-слов.
 */
export function matchCategory(
  categoryName: string | undefined,
  productName: string,
  known: { slug: string; name: string }[],
): CategoryMatch {
  const nameHaystack = fold(productName);
  const categoryHaystack = fold(categoryName ?? "");

  if (categoryName) {
    const directSlug = slugify(categoryName, "");
    if (directSlug && known.some((category) => category.slug === directSlug)) {
      return { slug: directSlug, confidence: 1 };
    }
    const foldedCategory = fold(categoryName);
    for (const category of known) {
      if (fold(category.name) === foldedCategory) return { slug: category.slug, confidence: 1 };
    }
  }

  // Сигнал в названии товара
  for (const signal of CATEGORY_SIGNALS) {
    if (signal.pattern.test(productName)) {
      return { slug: signal.slug, confidence: 0.95, matched: signal.pattern.source.slice(0, 24) };
    }
  }

  // Ключевые слова: название товара весит больше, чем раздел фида
  let best: CategoryMatch = { confidence: 0 };
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    if (rule.excludeKeywords?.some((keyword) => nameHaystack.includes(fold(keyword)))) continue;

    let score = 0;
    let matched: string | undefined;
    for (const keyword of rule.keywords) {
      const folded = fold(keyword);
      if (nameHaystack.includes(folded)) {
        const candidate = rule.weight + Math.min(keyword.length, 12) + 40;
        if (candidate > score) {
          score = candidate;
          matched = keyword;
        }
      } else if (categoryHaystack.includes(folded)) {
        const candidate = rule.weight + Math.min(keyword.length, 12);
        if (candidate > score) {
          score = candidate;
          matched = keyword;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = { slug: rule.slug, confidence: Math.min(score / 100, 0.99), matched };
    }
  }

  return best;
}

/**
 * Вытаскивает количество из названия: «SnowPack 6», «на 4 пары», «6 пар», «450 л».
 * Возвращает undefined, если в названии нет однозначного числа.
 */
function numberFromProductName(name: string): number | undefined {
  const direct = name.match(/(?:на\s+)?(\d+)\s*(?:пар|шт|мест)/i);
  if (direct) return Number.parseInt(direct[1], 10);

  // Хвостовое число модели: «SnowPack 6», «Alcor 1», «Motion 3 XL»
  const tail = name.match(/(?:\s|^)(\d{1,2})\s*(?:XL|L|M|S)?\s*$/i);
  if (tail) return Number.parseInt(tail[1], 10);

  return undefined;
}

/** Уточняющая категория внутри ветки: место установки/объём/тип. */
export function matchSubcategory(
  parentSlug: string,
  context: { mountPlace?: string; volumeL?: number; pairs?: number; productName: string },
  known: { slug: string; name: string }[],
): string | undefined {
  const children = known.filter((category) => category.slug.startsWith(`${parentSlug}-`));
  if (children.length === 0) return parentSlug;

  const name = fold(context.productName);

  if (parentSlug === "avtoboksy") {
    if (context.mountPlace === "фаркоп" || name.includes("фаркоп")) {
      return children.find((child) => child.slug.endsWith("na-farkop"))?.slug ?? parentSlug;
    }
    if (context.volumeL !== undefined) {
      const match =
        context.volumeL >= 500
          ? children.find((child) => child.slug.endsWith("500-plus"))
          : context.volumeL >= 440
            ? children.find((child) => child.slug.endsWith("400-480"))
            : children.find((child) => child.slug.endsWith("300-400"));
      if (match) return match.slug;
    }
  }

  if (parentSlug === "veloperekreateli") {
    if (context.mountPlace === "фаркоп" || name.includes("фаркоп")) {
      return children.find((child) => child.slug.endsWith("na-farkop"))?.slug ?? parentSlug;
    }
    if (context.mountPlace === "задняя дверь" || name.includes("задн")) {
      return children.find((child) => child.slug.endsWith("na-zadnyuyu-dver"))?.slug ?? parentSlug;
    }
    if (context.mountPlace === "рейлинги" || name.includes("крыш")) {
      return children.find((child) => child.slug.endsWith("na-kryshu"))?.slug ?? parentSlug;
    }
  }

  if (parentSlug === "bagazhniki") {
    if (context.mountPlace === "рейлинги" || name.includes("рейлинг")) {
      return children.find((child) => child.slug.endsWith("na-rejlingi"))?.slug ?? parentSlug;
    }
    if (context.mountPlace === "штатные места" || name.includes("штатн")) {
      return children.find((child) => child.slug.endsWith("shtatnye-mesta"))?.slug ?? parentSlug;
    }
    if (
      context.mountPlace === "гладкая крыша" ||
      context.mountPlace === "водосточный желоб" ||
      name.includes("гладк") ||
      name.includes("водосток") ||
      name.includes("flush bar")
    ) {
      return children.find((child) => child.slug.endsWith("na-gladkuyu-kryshu"))?.slug ?? parentSlug;
    }
    if (context.mountPlace === "штатные места") {
      return children.find((child) => child.slug.endsWith("shtatnye-mesta"))?.slug ?? parentSlug;
    }
    // Модельные крепления без явного места установки чаще всего штатные
    return children.find((child) => child.slug.endsWith("shtatnye-mesta"))?.slug ?? parentSlug;
  }

  if (parentSlug === "lyzhnye-krepleniya") {
    const name = context.productName;
    const explicitPairs = context.pairs ?? numberFromProductName(name);
    if (explicitPairs !== undefined) {
      const match =
        explicitPairs >= 5
          ? children.find((child) => child.slug.endsWith("6-par"))
          : children.find((child) => child.slug.endsWith("4-pary"));
      if (match) return match.slug;
    }
    return parentSlug;
  }

  if (parentSlug === "farkopy") {
    if (name.includes("съемн") || name.includes("съёмн") || name.includes("быстросъемн")) {
      return children.find((child) => child.slug.endsWith("syemnye"))?.slug ?? parentSlug;
    }
    if (name.includes("электрик")) {
      return children.find((child) => child.slug.endsWith("s-elektrikoy"))?.slug ?? parentSlug;
    }
    if (name.includes("несъемн") || name.includes("несъёмн")) {
      return children.find((child) => child.slug.endsWith("nesemnye"))?.slug ?? parentSlug;
    }
  }

  return parentSlug;
}

// ─────────────────────────────────────────────────────────────────────────────
// Бренды
// ─────────────────────────────────────────────────────────────────────────────

/** Известные варианты написания брендов, встречающиеся в фидах. */
const BRAND_ALIASES: Record<string, string> = {
  "thule": "Thule",
  "thule sweden": "Thule",
  "atera": "Atera",
  "mont blanc": "Mont Blanc",
  "montblanc": "Mont Blanc",
  "menabo": "Menabo",
  "menabò": "Menabo",
  "ficopro": "FicoPro",
  "fico pro": "FicoPro",
  "whispbar": "Whispbar",
  "yakima": "Yakima",
  "lux": "Lux",
  "atlant": "Atlant",
  "piligrim": "Piligrim",
  "rollster": "Rollster",
  "turtle": "Turtle",
  "titan": "Titan",
  "towrus": "TowRus",
  "tow rus": "TowRus",
  "baltex": "Baltex",
  "auto-hak": "Auto-Hak",
  "autohak": "Auto-Hak",
  "auto hak": "Auto-Hak",
  "galia": "Galia",
  "oris": "Oris",
  "westfalia": "Westfalia",
  "brink": "Brink",
  "bizon": "Bizon",
  "garage19": "Garage19",
};

export type BrandMatch = {
  name: string;
  slug: string;
  /** Существует ли бренд в БД (иначе engine создаст новый). */
  exists: boolean;
};

export function matchBrand(raw: string | undefined, knownBrands: { slug: string; name: string }[]): BrandMatch | undefined {
  if (!raw || raw.trim() === "") return undefined;
  const cleaned = raw.trim();

  const alias = BRAND_ALIASES[cleaned.toLowerCase()];
  const canonical = alias ?? cleaned;
  const slug = slugify(canonical, "brand");

  const existing = knownBrands.find(
    (brand) => brand.slug === slug || brand.name.toLowerCase() === canonical.toLowerCase(),
  );

  return { name: existing?.name ?? canonical, slug: existing?.slug ?? slug, exists: Boolean(existing) };
}

export function newBrandSlug(name: string): string {
  return slugify(name, "brand");
}

// ─────────────────────────────────────────────────────────────────────────────
// Автомобили
// ─────────────────────────────────────────────────────────────────────────────

export type CarRef = {
  brandSlug: string;
  modelSlug?: string;
  generationSlug?: string;
  yearFrom?: number;
  yearTo?: number;
};

export type CarDictionary = {
  /** "toyota" → id */
  brandsBySlug: Map<string, { id: string; name: string }>;
  /** "toyota/camry" → { id, slug, generations } */
  models: Map<string, { id: string; slug: string; name: string }>;
  /** "toyota/camry/xv70" → { id, yearFrom, yearTo } */
  generations: Map<string, { id: string; yearFrom: number; yearTo?: number }>;
  /** Все варианты написания марки: «mercedes-benz», «мерседес» */
  brandAliases: Map<string, string>;
  /** Варианты написания моделей: «land cruiser prado», «прадо» */
  modelAliases: Map<string, string>;
};

/** Транслитерация для поиска: «Киа» → «kia». */
export function translit(value: string): string {
  return slugify(value, "");
}

/** Разбирает строку совместимости «Toyota Camry XV70» / «toyota/camry/xv70» / «Kia Sportage QL 2015-2021». */
export function parseCarTarget(raw: string): CarRef | undefined {
  const text = raw.trim();
  if (!text) return undefined;

  const years = text.match(/(19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|н\.?в\.?|наст\.?|present)/i);
  let yearFrom: number | undefined;
  let yearTo: number | undefined;
  let withoutYears = text;
  if (years) {
    yearFrom = Number.parseInt(years[1] + "", 10);
    const tail = years[2];
    yearTo = /^\d{4}$/.test(tail) ? Number.parseInt(tail, 10) : undefined;
    withoutYears = text.replace(years[0], " ");
  }

  // Формат со слэшами уже готов: brand/model/generation
  if (text.includes("/")) {
    const parts = text.split("/").map((part) => slugify(part, "")).filter(Boolean);
    if (parts.length === 0) return undefined;
    return { brandSlug: parts[0], modelSlug: parts[1], generationSlug: parts[2], yearFrom, yearTo };
  }

  const tokens = withoutYears.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;

  // Первый токен — марка (может состоять из двух слов: «Land Rover», «Mercedes Benz»)
  const brandSlug = slugify(tokens[0], "");
  const modelSlug = tokens[1] ? slugify(tokens[1], "") : undefined;
  const generationSlug = tokens[2] ? slugify(tokens[2], "") : undefined;
  return { brandSlug, modelSlug, generationSlug, yearFrom, yearTo };
}

/** Разбирает многострочное/многоэлементное поле совместимости. */
export function parseFitmentList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[;|\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

/**
 * Ищет автомобиль в справочнике: по slug'ам, затем по названиям,
 * затем по годам выпуска внутри модели.
 */
export function resolveCar(ref: CarRef, dictionary: CarDictionary): { key?: string; note?: string } {
  const brandSlug = dictionary.brandAliases.get(ref.brandSlug) ?? ref.brandSlug;
  if (!dictionary.brandsBySlug.has(brandSlug)) {
    return { note: `марка авто «${ref.brandSlug}» не найдена в справочнике` };
  }

  if (!ref.modelSlug) return { key: brandSlug };

  const modelAliasKey = `${brandSlug}/${ref.modelSlug}`;
  const modelSlug = dictionary.modelAliases.get(modelAliasKey) ?? ref.modelSlug;
  const modelKey = `${brandSlug}/${modelSlug}`;
  if (!dictionary.models.has(modelKey)) {
    return { key: brandSlug, note: `модель «${ref.modelSlug}» не найдена, товар привязан к марке` };
  }

  if (!ref.generationSlug) {
    // Пытаемся определить поколение по годам
    if (ref.yearFrom) {
      for (const [key, generation] of dictionary.generations) {
        if (!key.startsWith(`${modelKey}/`)) continue;
        const to = generation.yearTo ?? 9999;
        if (ref.yearFrom >= generation.yearFrom && ref.yearFrom <= to) return { key };
      }
    }
    return { key: modelKey };
  }

  const generationKey = `${modelKey}/${ref.generationSlug}`;
  if (dictionary.generations.has(generationKey)) return { key: generationKey };

  // Поколение не совпало по slug — пробуем по годам
  if (ref.yearFrom) {
    for (const [key, generation] of dictionary.generations) {
      if (!key.startsWith(`${modelKey}/`)) continue;
      const to = generation.yearTo ?? 9999;
      if (ref.yearFrom >= generation.yearFrom && ref.yearFrom <= to) {
        return { key, note: `поколение «${ref.generationSlug}» уточнено по году ${ref.yearFrom}` };
      }
    }
  }

  return { key: modelKey, note: `поколение «${ref.generationSlug}» не найдено, привязка к модели` };
}

// ─────────────────────────────────────────────────────────────────────────────
// Загрузка справочников
// ─────────────────────────────────────────────────────────────────────────────

/** Читает категории, бренды и справочник авто для последующего сопоставления. */
export async function loadDictionaries(prisma: PrismaClient): Promise<{
  categories: { id: string; slug: string; name: string; parentId: string | null }[];
  brands: { id: string; slug: string; name: string }[];
  cars: CarDictionary;
  attributes: { id: string; slug: string; name: string; type: string }[];
  suppliers: { id: string; slug: string; name: string; marginPercent: number }[];
}> {
  const [categories, brands, carBrands, attributes, suppliers] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true, name: true, parentId: true } }),
    prisma.brand.findMany({ select: { id: true, slug: true, name: true } }),
    prisma.brand.findMany({
      where: { models: { some: {} } },
      select: {
        id: true,
        slug: true,
        name: true,
        models: {
          select: {
            id: true,
            slug: true,
            name: true,
            generations: { select: { id: true, slug: true, name: true, yearFrom: true, yearTo: true } },
          },
        },
      },
    }),
    prisma.attribute.findMany({ select: { id: true, slug: true, name: true, type: true } }),
    prisma.supplier.findMany({ select: { id: true, slug: true, name: true, marginPercent: true } }),
  ]);

  const brandsBySlug = new Map<string, { id: string; name: string }>();
  const models = new Map<string, { id: string; slug: string; name: string }>();
  const generations = new Map<string, { id: string; yearFrom: number; yearTo?: number }>();
  const brandAliases = new Map<string, string>();
  const modelAliases = new Map<string, string>();

  for (const brand of carBrands) {
    brandsBySlug.set(brand.slug, { id: brand.id, name: brand.name });
    brandAliases.set(brand.slug, brand.slug);
    brandAliases.set(translit(brand.name), brand.slug);
    for (const model of brand.models) {
      const modelKey = `${brand.slug}/${model.slug}`;
      models.set(modelKey, { id: model.id, slug: model.slug, name: model.name });
      modelAliases.set(modelKey, model.slug);
      modelAliases.set(`${brand.slug}/${translit(model.name)}`, model.slug);
      for (const generation of model.generations) {
        generations.set(`${modelKey}/${generation.slug}`, {
          id: generation.id,
          yearFrom: generation.yearFrom,
          yearTo: generation.yearTo ?? undefined,
        });
      }
    }
  }

  return {
    categories,
    brands,
    cars: { brandsBySlug, models, generations, brandAliases, modelAliases },
    attributes,
    suppliers,
  };
}
