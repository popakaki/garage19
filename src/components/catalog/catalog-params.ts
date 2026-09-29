import { SORT_OPTIONS, type SortOption } from "@/lib/constants";
import type { CatalogQuery } from "@/lib/queries";

/**
 * Разбор и сборка query-параметров листинга каталога.
 * Файл намеренно не содержит "use server"/"use client" — чистые функции
 * пригодны и на сервере (RSC), и в клиентских фильтрах.
 *
 * Поддерживаемые параметры:
 *  z        — производитель (повторяемый)
 *  price    — «от-до» в рублях, напр. 5000-15000
 *  stock=1  — только в наличии
 *  place    — место установки (повторяемый)
 *  material — материал (повторяемый)
 *  capacity — «от-до» в кг
 *  volume   — «от-до» в л
 *  lock=1 / electric=1 / bumper=1 / new=1 / hit=1
 *  a        — каталожные атрибуты «slug:значение» (повторяемый)
 *  marka / model / pokolenie / mod — подбор по автомобилю
 *  sort / page / view — сортировка, страница, вид
 */

export type FilterView = "grid" | "list";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type CatalogQueryState = {
  category: string;
  view: FilterView;
  sort: SortOption;
  page: number;
  manufacturers: string[];
  priceMin?: number; // копейки
  priceMax?: number; // копейки
  inStock: boolean;
  mountPlaces: string[];
  materials: string[];
  capacityMin?: number;
  capacityMax?: number;
  volumeMin?: number;
  volumeMax?: number;
  lock: boolean;
  electric: boolean;
  bumper: boolean;
  isNew: boolean;
  isHit: boolean;
  /** Только универсальные товары (fitment=universal). */
  universalOnly: boolean;
  attributes: { slug: string; value: string }[];
  car: {
    brandSlug?: string;
    modelSlug?: string;
    generationSlug?: string;
    modificationId?: string;
  };
};

export type AttributeFilter = { slug: string; values: string[] };

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .flatMap((item) => item.split("|"))
    .map((item) => item.trim())
    .filter(Boolean);
}

/** «5000-15000» → [500000, 1500000] (в копейках). */
export function parseRange(value: string | undefined, toKopecks = false): [number | undefined, number | undefined] {
  if (!value) return [undefined, undefined];
  const matches = value.match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length === 0) return [undefined, undefined];
  const factor = toKopecks ? 100 : 1;
  const first = Math.round(Number.parseFloat(matches[0].replace(",", ".")) * factor);
  const second = matches[1]
    ? Math.round(Number.parseFloat(matches[1].replace(",", ".")) * factor)
    : undefined;
  if (!Number.isFinite(first)) return [undefined, second];
  if (second === undefined) return [first, undefined];
  return first <= second ? [first, second] : [second, first];
}

export function serializeRange(min?: number, max?: number, toKopecks = false): string | undefined {
  const factor = toKopecks ? 100 : 1;
  const from = min === undefined ? undefined : Math.round(min / factor);
  const to = max === undefined ? undefined : Math.round(max / factor);
  if (from === undefined && to === undefined) return undefined;
  return `${from ?? ""}-${to ?? ""}`;
}

export function parseAttributes(values: string[]): { slug: string; value: string }[] {
  return values
    .map((item) => {
      const separator = item.indexOf(":");
      if (separator <= 0) return null;
      const slug = item.slice(0, separator).trim();
      const value = item.slice(separator + 1).trim();
      if (!slug || !value) return null;
      return { slug, value };
    })
    .filter((item): item is { slug: string; value: string } => Boolean(item));
}

export function formatAttributeToken(slug: string, value: string): string {
  return `${slug}:${value}`;
}

/** Группирует «slug:значение» в фильтры для buildProductWhere. */
export function groupAttributeFilters(attributes: { slug: string; value: string }[]): AttributeFilter[] {
  const map = new Map<string, Set<string>>();
  for (const attribute of attributes) {
    const set = map.get(attribute.slug) ?? new Set<string>();
    set.add(attribute.value);
    map.set(attribute.slug, set);
  }
  return [...map.entries()].map(([slug, values]) => ({ slug, values: [...values] }));
}

export function parseCatalogQuery(params: RawSearchParams, categorySlug = ""): CatalogQueryState {
  const rawSort = (Array.isArray(params.sort) ? params.sort[0] : params.sort) ?? "";
  const sort: SortOption = Object.prototype.hasOwnProperty.call(SORT_OPTIONS, rawSort)
    ? (rawSort as SortOption)
    : "popular";
  const rawView = (Array.isArray(params.view) ? params.view[0] : params.view) ?? "";
  const view: FilterView = rawView === "list" ? "list" : "grid";
  const rawPage = Number.parseInt(String(Array.isArray(params.page) ? params.page[0] : params.page ?? "1"), 10);

  const [priceMin, priceMax] = parseRange(
    Array.isArray(params.price) ? params.price[0] : params.price,
    true,
  );
  const [capacityMin, capacityMax] = parseRange(Array.isArray(params.capacity) ? params.capacity[0] : params.capacity);
  const [volumeMin, volumeMax] = parseRange(Array.isArray(params.volume) ? params.volume[0] : params.volume);

  const flag = (key: string) => {
    const value = Array.isArray(params[key]) ? (params[key] as string[])[0] : params[key];
    return value === "1" || value === "true" || value === "on";
  };

  const single = (key: string): string | undefined => {
    const value = Array.isArray(params[key]) ? (params[key] as string[])[0] : params[key];
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };

  return {
    category: categorySlug,
    view,
    sort,
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    manufacturers: toArray(params.z),
    priceMin,
    priceMax,
    inStock: flag("stock"),
    mountPlaces: toArray(params.place),
    materials: toArray(params.material),
    capacityMin,
    capacityMax,
    volumeMin,
    volumeMax,
    lock: flag("lock"),
    electric: flag("electric"),
    bumper: flag("bumper"),
    isNew: flag("new"),
    isHit: flag("hit"),
    universalOnly: single("fitment") === "universal",
    attributes: parseAttributes(toArray(params.a)),
    car: {
      brandSlug: single("marka"),
      modelSlug: single("model"),
      generationSlug: single("pokolenie"),
      modificationId: single("mod"),
    },
  };
}

/**
 * Приводит состояние фильтров к аргументу getProducts()/getFacets()
 * из @/lib/queries. Используется серверными страницами листинга.
 */
export function toCatalogQuery(query: CatalogQueryState, options?: { perPage?: number }): CatalogQuery {
  return {
    categorySlug: query.category || undefined,
    manufacturerSlugs: query.manufacturers.length ? query.manufacturers : undefined,
    priceMin: query.priceMin,
    priceMax: query.priceMax,
    inStock: query.inStock || undefined,
    mountPlace: query.mountPlaces.length ? query.mountPlaces : undefined,
    material: query.materials.length ? query.materials : undefined,
    capacityMin: query.capacityMin,
    capacityMax: query.capacityMax,
    volumeMin: query.volumeMin,
    volumeMax: query.volumeMax,
    lockIncluded: query.lock ? true : undefined,
    electricIncluded: query.electric ? true : undefined,
    bumperCut: query.bumper ? true : undefined,
    isNew: query.isNew || undefined,
    isHit: query.isHit || undefined,
    fitmentType: query.universalOnly ? "universal" : undefined,
    car: query.car.brandSlug ? query.car : undefined,
    attributeFilters: query.attributes.length ? groupAttributeFilters(query.attributes) : undefined,
    sort: query.sort,
    page: query.page,
    perPage: options?.perPage,
  };
}

/** Счётчик активных фильтров (без сортировки/страницы/вида) — для бейджа «Фильтры». */
export function countActiveFilters(state: CatalogQueryState): number {
  let count = 0;
  count += state.manufacturers.length;
  count += state.mountPlaces.length;
  count += state.materials.length;
  count += state.attributes.length;
  if (state.priceMin !== undefined || state.priceMax !== undefined) count += 1;
  if (state.capacityMin !== undefined || state.capacityMax !== undefined) count += 1;
  if (state.volumeMin !== undefined || state.volumeMax !== undefined) count += 1;
  if (state.inStock) count += 1;
  if (state.lock) count += 1;
  if (state.electric) count += 1;
  if (state.bumper) count += 1;
  if (state.isNew) count += 1;
  if (state.isHit) count += 1;
  if (state.universalOnly) count += 1;
  if (state.car.brandSlug) count += 1;
  return count;
}

type ParamValue = string | string[] | undefined | null;

function appendParam(search: URLSearchParams, key: string, value: ParamValue): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.filter(Boolean).forEach((item) => search.append(key, item));
    return;
  }
  if (value === "") return;
  search.append(key, value);
}

/**
 * Собирает href листинга: исходные параметры + изменения.
 * Значение null удаляет параметр, undefined — оставляет как есть.
 */
export function buildCatalogHref(
  basePath: string,
  current: RawSearchParams,
  changes: Record<string, ParamValue> = {},
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (key in changes) continue;
    appendParam(search, key, value);
  }
  for (const [key, value] of Object.entries(changes)) {
    appendParam(search, key, value);
  }

  // Пустая страница/сортировка по умолчанию не нужны в URL
  if (search.get("page") === "1") search.delete("page");
  if (search.get("sort") === "popular") search.delete("sort");
  if (search.get("view") === "grid") search.delete("view");
  if (search.get("marka") === "") search.delete("marka");

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Публичный URL листинга каталога для категории. */
export function catalogPath(categorySlug: string): string {
  return categorySlug ? `/catalog/${categorySlug}` : "/catalog";
}

/** Отображаемое имя значения фасета. */
export function humanizeFacetValue(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
