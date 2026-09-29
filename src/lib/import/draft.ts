/**
 * Сборка черновиков товаров из «сырых» офферов прайса.
 *
 * Здесь сходятся парсеры, нормализаторы и сопоставление со справочниками:
 * на выходе получается объект, который engine.ts пишет в БД практически без логики.
 */

import type { ProductDraft, RawOffer } from "./types";
import {
  applyMargin,
  buildDescription,
  buildProductSlug,
  buildShortDescription,
  buildSku,
  normalizeHookType,
  normalizeMaterial,
  normalizeMountPlace,
  normalizePlugType,
  normalizeProfile,
  parseBool,
  parseLength,
  parsePrice,
  parseStock,
  parseVolume,
  parseWarrantyMonths,
  parseWeight,
} from "./normalize";
import {
  matchBrand,
  matchCategory,
  matchSubcategory,
  parseCarTarget,
  parseFitmentList,
  resolveCar,
  type CarDictionary,
} from "./mapping";

/** Плейсхолдеры по категориям — используются, если в фиде нет картинок. */
const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  bagazhniki: "/images/products/bagazhnik-1.svg",
  avtoboksy: "/images/products/avtoboks-1.svg",
  veloperekreateli: "/images/products/velokreplenie-1.svg",
  "lyzhnye-krepleniya": "/images/products/lyzhnoe-kreplenie-1.svg",
  farkopy: "/images/products/farkop-1.svg",
  "korziny-i-platformy": "/images/products/korzina-1.svg",
  "vodnoe-snaryazhenie": "/images/products/voda-1.svg",
  "krepezh-i-aksessuary": "/images/products/aksessuar-1.svg",
  "elektrika-farkopov": "/images/products/elektrika-1.svg",
};

export const FALLBACK_IMAGE = "/images/placeholder.svg";

/**
 * Категории, товары которых обязательно должны находиться конфигуратором
 * «марка → модель → поколение». Для них импортированный товар без явной
 * совместимости привязывается к «флагманским» авто (см. prisma/data/products.ts).
 */
const CORE_CATEGORY_PREFIXES = ["bagazhniki", "avtoboksy", "veloperekreateli", "lyzhnye-krepleniya", "farkopy"];

/** Ключи совместимости флагманских авто — те же, что в сидере. */
export const FLAGSHIP_FITMENT_KEYS = [
  "toyota/camry/xv70",
  "kia/sportage/ql",
  "lada/vesta/i",
  "haval/jolion/i",
  "jetour/t2/i",
];

/** Нужна ли товару привязка к флагманским авто (категория из ядра каталога). */
export function needsFlagshipFitment(categorySlug: string): boolean {
  return CORE_CATEGORY_PREFIXES.some(
    (prefix) => categorySlug === prefix || categorySlug.startsWith(`${prefix}-`),
  );
}

/** Внутренние ключи, которые парсер CSV кладёт в params. */
const INTERNAL_KEYS = {
  purchasePrice: "__purchasePrice",
  lengthMm: "__lengthMm",
  widthMm: "__widthMm",
  heightMm: "__heightMm",
  warranty: "__warranty",
  capacityKg: "__capacityKg",
  verticalLoadKg: "__verticalLoadKg",
  volumeL: "__volumeL",
  material: "__material",
  mountPlace: "__mountPlace",
  profile: "__profile",
  hookType: "__hookType",
  lockIncluded: "__lockIncluded",
  electricIncluded: "__electricIncluded",
  bumperCut: "__bumperCut",
  doorsCount: "__doorsCount",
  plugType: "__plugType",
  isActive: "__isActive",
} as const;

/** Соответствие названий параметров фида фасетам товара. */
type FacetKey =
  | "capacityKg"
  | "verticalLoadKg"
  | "volumeL"
  | "material"
  | "mountPlace"
  | "profile"
  | "lockIncluded"
  | "electricIncluded"
  | "bumperCut"
  | "doorsCount"
  | "warrantyMonths"
  | "hookType"
  | "plugType"
  | "pairs"
  | "bikes";

const FACET_BY_PARAM: { pattern: RegExp; facet: FacetKey }[] = [
  { pattern: /грузоподъ|нагрузка на крышу|capacity|макс.*нагрузк/i, facet: "capacityKg" },
  { pattern: /вертикальн/i, facet: "verticalLoadKg" },
  { pattern: /объ[её]м/i, facet: "volumeL" },
  { pattern: /материал|material/i, facet: "material" },
  { pattern: /место установки|установка|монтаж|mount/i, facet: "mountPlace" },
  { pattern: /профиль|profile/i, facet: "profile" },
  { pattern: /тип крюка|крюк/i, facet: "hookType" },
  { pattern: /замок|lock/i, facet: "lockIncluded" },
  { pattern: /электрик|electric/i, facet: "electricIncluded" },
  { pattern: /вырез/i, facet: "bumperCut" },
  { pattern: /двер/i, facet: "doorsCount" },
  { pattern: /разъ[её]м|pin/i, facet: "plugType" },
  { pattern: /гарант|warranty/i, facet: "warrantyMonths" },
  { pattern: /количество пар|пар лыж|pairs/i, facet: "pairs" },
  { pattern: /количество велосипед|bikes/i, facet: "bikes" },
];

export type DraftContext = {
  categories: { id: string; slug: string; name: string; parentId: string | null }[];
  brands: { id: string; slug: string; name: string }[];
  attributes: { id: string; slug: string; name: string; type: string }[];
  cars: CarDictionary;
  /** Slug категории по умолчанию (для товаров без категории). */
  defaultCategorySlug?: string;
  /** Наценка поставщика в процентах. */
  marginPercent?: number;
  /** Slug поставщика — используется в SKU по умолчанию. */
  supplierSlug?: string;
  /** Куда привязывать новые категории из фида. */
  categoriesParentSlug?: string;
};

function numberFromString(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseFloat(value.replace(",", ".").replace(/[^\d.\-]/g, ""));
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Нормализованное имя параметра для поиска совпадений. */
function foldKey(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, "");
}

/**
 * Строит черновик товара.
 * Возвращает либо черновик, либо ошибку с описанием причины.
 */
export function buildDraft(offer: RawOffer, context: DraftContext): ProductDraft | { error: string } {
  if (!offer.name || offer.name.trim().length < 3) {
    return { error: `строка ${offer.row}: пустое или слишком короткое название` };
  }

  const priceInfo = parsePrice(offer.price);
  if (!priceInfo || priceInfo.kopecks <= 0) {
    return { error: `строка ${offer.row}: некорректная или отсутствующая цена («${offer.price ?? ""}»)` };
  }

  // ── Категория ────────────────────────────────────────────────────────────
  const match = matchCategory(offer.categoryName, offer.name, context.categories);
  // Если категория не распознана — используем категорию по умолчанию из настроек импорта.
  let categorySlug: string = match.slug ?? "";
  let categoryName: string | undefined = offer.categoryName;

  // Характеристики нужны для уточнения подкатегории, поэтому разбираем их заранее
  const paramFacets: Partial<Record<FacetKey, string | number | boolean>> = {};
  for (const [key, value] of Object.entries(offer.params)) {
    if (key.startsWith("__")) continue;
    const folded = foldKey(key);
    for (const rule of FACET_BY_PARAM) {
      if (rule.pattern.test(key) || rule.pattern.test(folded)) {
        if (paramFacets[rule.facet] === undefined && value !== "") paramFacets[rule.facet] = value;
        break;
      }
    }
  }

  const rawMountPlace = normalizeMountPlace(
    (offer.params[INTERNAL_KEYS.mountPlace] ?? paramFacets.mountPlace ?? undefined) as string | undefined,
  );
  const rawVolume = parseVolume(
    (offer.params[INTERNAL_KEYS.volumeL] ?? (paramFacets.volumeL as string) ?? undefined) as string | undefined,
  );
  const rawPairs = numberFromString(
    (offer.params["Количество пар лыж"] ?? (paramFacets.pairs as string) ?? undefined) as string | undefined,
  );
  const rawBikes = numberFromString(
    (offer.params["Количество велосипедов"] ?? (paramFacets.bikes as string) ?? undefined) as string | undefined,
  );

  if (categorySlug) {
    categorySlug =
      matchSubcategory(
        categorySlug,
        { mountPlace: rawMountPlace, volumeL: rawVolume, pairs: rawPairs, productName: offer.name },
        context.categories,
      ) ?? categorySlug;
  } else if (context.defaultCategorySlug) {
    categorySlug = context.defaultCategorySlug;
  } else {
    categoryName = offer.categoryName ?? "Без категории";
    categorySlug = "";
  }

  // ── Бренд ────────────────────────────────────────────────────────────────
  const brandRaw = offer.vendor ?? offer.params["Производитель"] ?? offer.params["Бренд"];
  const brand = matchBrand(brandRaw, context.brands);

  // ── Фасеты ───────────────────────────────────────────────────────────────
  const capacityKg = numberFromString(
    (offer.params[INTERNAL_KEYS.capacityKg] ?? (paramFacets.capacityKg as string) ?? undefined) as string | undefined,
  );
  const verticalLoadKg = numberFromString(
    (offer.params[INTERNAL_KEYS.verticalLoadKg] ?? (paramFacets.verticalLoadKg as string) ?? undefined) as string | undefined,
  );
  const volumeL = rawVolume;
  const material = normalizeMaterial(
    (offer.params[INTERNAL_KEYS.material] ?? (paramFacets.material as string) ?? undefined) as string | undefined,
  );
  const mountPlace = rawMountPlace;
  const profile = normalizeProfile(
    (offer.params[INTERNAL_KEYS.profile] ?? (paramFacets.profile as string) ?? undefined) as string | undefined,
  );
  const hookType = normalizeHookType(
    (offer.params[INTERNAL_KEYS.hookType] ?? (paramFacets.hookType as string) ?? undefined) as string | undefined,
  );
  const lockIncluded = parseBool(
    (offer.params[INTERNAL_KEYS.lockIncluded] ?? (paramFacets.lockIncluded as string) ?? undefined) as string | undefined,
  );
  const electricIncluded = parseBool(
    (offer.params[INTERNAL_KEYS.electricIncluded] ?? (paramFacets.electricIncluded as string) ?? undefined) as string | undefined,
  );
  const bumperCut = parseBool(
    (offer.params[INTERNAL_KEYS.bumperCut] ?? (paramFacets.bumperCut as string) ?? undefined) as string | undefined,
  );
  const doorsCount = numberFromString(
    (offer.params[INTERNAL_KEYS.doorsCount] ?? (paramFacets.doorsCount as string) ?? undefined) as string | undefined,
  );
  const plugType = normalizePlugType(
    (offer.params[INTERNAL_KEYS.plugType] ?? (paramFacets.plugType as string) ?? undefined) as string | undefined,
  );
  const warrantyMonths = parseWarrantyMonths(
    (offer.params[INTERNAL_KEYS.warranty] ?? (paramFacets.warrantyMonths as string) ?? undefined) as string | undefined,
  );

  // ── Цены ─────────────────────────────────────────────────────────────────
  const marginPercent = context.marginPercent ?? 0;
  const price = applyMargin(priceInfo.kopecks, marginPercent);
  const oldPriceInfo = parsePrice(offer.oldPrice);
  const oldPrice = oldPriceInfo && oldPriceInfo.kopecks > price ? applyMargin(oldPriceInfo.kopecks, marginPercent) : undefined;
  const explicitPurchase = parsePrice(offer.params[INTERNAL_KEYS.purchasePrice]);
  const purchasePrice = explicitPurchase?.kopecks ?? (marginPercent !== 0 ? priceInfo.kopecks : undefined);

  // ── Габариты и вес ───────────────────────────────────────────────────────
  const weight = parseWeight(offer.weight);
  const lengthMm = parseLength(offer.params[INTERNAL_KEYS.lengthMm]);
  const widthMm = parseLength(offer.params[INTERNAL_KEYS.widthMm]);
  const heightMm = parseLength(offer.params[INTERNAL_KEYS.heightMm]);

  // ── Изображения ──────────────────────────────────────────────────────────
  const images = offer.pictures.length
    ? offer.pictures.slice(0, 8)
    : [CATEGORY_PLACEHOLDERS[categorySlug.split("-")[0]] ?? FALLBACK_IMAGE];

  // ── Совместимость ────────────────────────────────────────────────────────
  const fitmentKeys: string[] = [];
  const fitmentNotes: string[] = [];

  const explicitTargets = parseFitmentList(offer.fitment);
  const rawTargets = [...explicitTargets];
  if (offer.carBrand) {
    rawTargets.push([offer.carBrand, offer.carModel, offer.carGeneration].filter(Boolean).join(" "));
  }

  for (const target of rawTargets) {
    const ref = parseCarTarget(target);
    if (!ref) continue;
    if (offer.carYearFrom && !ref.yearFrom) ref.yearFrom = Number.parseInt(offer.carYearFrom, 10) || undefined;
    if (offer.carYearTo && !ref.yearTo) ref.yearTo = Number.parseInt(offer.carYearTo, 10) || undefined;
    const resolved = resolveCar(ref, context.cars);
    if (resolved.key && !fitmentKeys.includes(resolved.key)) fitmentKeys.push(resolved.key);
    if (resolved.note) fitmentNotes.push(resolved.note);
  }

  // Ядро каталога без явной совместимости привязываем к флагманским авто,
  // иначе импортированный товар не найдётся в конфигураторе на главной.
  if (fitmentKeys.length === 0 && categorySlug && needsFlagshipFitment(categorySlug)) {
    for (const key of FLAGSHIP_FITMENT_KEYS) if (!fitmentKeys.includes(key)) fitmentKeys.push(key);
    fitmentNotes.push("совместимость не была указана в прайсе — проверьте привязку к авто");
  }

  // ── Значения характеристик (ProductAttribute) ────────────────────────────
  const attributes: ProductDraft["attributes"] = [];
  const attributeBySlug = new Map(context.attributes.map((attribute) => [attribute.slug, attribute]));
  const pushAttribute = (
    slug: string,
    value: string | number | boolean | undefined,
  ): void => {
    if (value === undefined || value === null || value === "") return;
    const attribute = attributeBySlug.get(slug);
    if (!attribute) return;
    if (attributes.some((item) => item.slug === slug)) return;
    if (typeof value === "boolean") attributes.push({ slug, valueBool: value });
    else if (typeof value === "number") attributes.push({ slug, valueNumber: value });
    else attributes.push({ slug, valueString: String(value) });
  };

  // Стандартные значения из фасетов
  pushAttribute("mesto-ustanovki", mountPlace);
  pushAttribute("material", material);
  pushAttribute("profil", profile);
  pushAttribute("tip-kryuka", hookType);
  pushAttribute("gruzopodyomnost", capacityKg);
  pushAttribute("vertikalnaya-nagruzka", verticalLoadKg);
  pushAttribute("obyom", volumeL);
  pushAttribute("zamok-v-komplekte", lockIncluded);
  pushAttribute("vyrez-bampera", bumperCut);
  pushAttribute("elektrika-v-komplekte", electricIncluded);
  pushAttribute("kolichestvo-dverey", doorsCount);
  pushAttribute("tip-razema", plugType);
  pushAttribute("garantiya", warrantyMonths);
  pushAttribute("kolichestvo-par-lyzh", rawPairs);
  pushAttribute("kolichestvo-velosipedov", rawBikes);

  // Остальные параметры фида сопоставляем с характеристиками по названию
  for (const [name, value] of Object.entries(offer.params)) {
    if (name.startsWith("__") || value === "") continue;
    const folded = foldKey(name);
    const attribute = context.attributes.find(
      (candidate) => foldKey(candidate.name) === folded || candidate.slug === foldKey(name),
    );
    if (!attribute) continue;
    if (attribute.type === "number") pushAttribute(attribute.slug, numberFromString(value));
    else if (attribute.type === "bool") pushAttribute(attribute.slug, parseBool(value));
    else pushAttribute(attribute.slug, value);
  }

  const sku = offer.sku?.trim() || buildSku(offer.externalId, context.supplierSlug, offer.row);
  const slug = buildProductSlug(offer.name, sku);
  const shortDescription = buildShortDescription(offer.description, offer.name);

  return {
    row: offer.row,
    sku,
    name: offer.name.trim().slice(0, 250),
    slug,
    categorySlug,
    categoryName,
    brandName: brand?.name,
    manufacturerSlug: brand?.slug,
    price,
    oldPrice,
    purchasePrice,
    stock: parseStock(offer.stock) ?? 0,
    weight,
    lengthMm,
    widthMm,
    heightMm,
    warrantyMonths,
    description: buildDescription(offer.description, offer.name),
    shortDescription,
    images,
    capacityKg,
    verticalLoadKg,
    volumeL,
    material,
    mountPlace,
    profile,
    lockIncluded,
    electricIncluded,
    bumperCut,
    doorsCount,
    rentAvailable: undefined,
    attributes,
    fitmentKeys,
    fitmentNote: fitmentNotes.length ? fitmentNotes.slice(0, 3).join("; ") : undefined,
    isActive: parseBool(offer.params[INTERNAL_KEYS.isActive]) ?? true,
    seoTitle: `${offer.name.trim()} — купить | Garage19`,
    seoDescription: shortDescription.slice(0, 300),
    externalId: offer.externalId,
  };
}

/** Slug марки авто по названию из фида (для отчёта о нераспознанных марках). */
export function unresolvedCarTargets(draft: ProductDraft): string[] {
  return draft.fitmentNote ? [draft.fitmentNote] : [];
}
