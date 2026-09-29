import { ADMIN_PER_PAGE } from "@/lib/constants";

/**
 * Работа с query-параметрами админки: фильтры, сортировка, пагинация.
 * Значения читаются из `searchParams` страницы, поэтому все фильтры
 * сохраняются в ссылках (пагинация и сортировка не сбрасывают фильтры).
 */

export type SearchParamsInput = Record<string, string | string[] | undefined>;
export type SearchParamsRecord = Record<string, string | string[]>;

/** Значение одного параметра (последнее, если параметр повторяется). */
export function getParam(params: SearchParamsInput, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[value.length - 1];
  return value;
}

/** Значение одного параметра без пустых строк. */
export function getStr(params: SearchParamsInput, key: string): string | undefined {
  const value = getParam(params, key);
  return value && value !== "" ? value : undefined;
}

/** Все значения параметра (для чекбоксов мультивыбора без JS). */
export function getAllParams(params: SearchParamsInput, key: string): string[] {
  const value = params[key];
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.filter((item) => item !== "");
}

export function getInt(params: SearchParamsInput, key: string, fallback?: number): number | undefined {
  const raw = getStr(params, key);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function getFloat(params: SearchParamsInput, key: string, fallback?: number): number | undefined {
  const raw = getStr(params, key);
  if (raw === undefined) return fallback;
  const parsed = Number.parseFloat(raw.replace(",", "."));
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function getBoolFlag(params: SearchParamsInput, key: string): boolean | undefined {
  const raw = getStr(params, key);
  if (raw === undefined) return undefined;
  if (raw === "1" || raw === "true" || raw === "on") return true;
  if (raw === "0" || raw === "false") return false;
  return undefined;
}

/** Номер страницы (минимум 1). */
export function getPage(params: SearchParamsInput, key = "page"): number {
  const raw = getStr(params, key);
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getPerPage(params: SearchParamsInput, fallback = ADMIN_PER_PAGE): number {
  return getInt(params, "perPage", fallback) ?? fallback;
}

export type SortDirection = "asc" | "desc";
export type SortState = { field: string; dir: SortDirection };

/**
 * Текущая сортировка с проверкой по списку разрешённых полей
 * (защита от подстановки произвольных колонок в Prisma).
 */
export function getSort(
  params: SearchParamsInput,
  allowed: readonly string[],
  fallbackField: string,
  fallbackDir: SortDirection = "desc",
): SortState {
  const rawField = getStr(params, "sort");
  const field = rawField && allowed.includes(rawField) ? rawField : fallbackField;
  const rawDir = getStr(params, "dir");
  const dir: SortDirection = rawDir === "asc" ? "asc" : rawDir === "desc" ? "desc" : fallbackDir;
  return { field, dir };
}

/** Значение следующей сортировки по клику на заголовок колонки. */
export function toggleSort(current: SortState, field: string): SortDirection {
  if (current.field !== field) return "asc";
  return current.dir === "asc" ? "desc" : "asc";
}

export type PaginationInfo = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
};

export function buildPagination(page: number, perPage: number, total: number): PaginationInfo {
  const safePerPage = perPage > 0 ? perPage : ADMIN_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(total / safePerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * safePerPage + 1;
  const to = Math.min(total, safePage * safePerPage);
  return { page: safePage, perPage: safePerPage, total, totalPages, from, to };
}

export function skipTake(page: number, perPage: number): { skip: number; take: number } {
  const safePerPage = perPage > 0 ? perPage : ADMIN_PER_PAGE;
  return { skip: (Math.max(1, page) - 1) * safePerPage, take: safePerPage };
}

/**
 * Строит новый URL с сохранением текущих параметров.
 * `null` в patch удаляет параметр, `page` при смене фильтра сбрасывается вручную.
 */
export function buildHref(
  basePath: string,
  params: SearchParamsRecord,
  patch: Record<string, string | number | null | undefined> = {},
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== "") search.append(key, item);
      });
    } else {
      search.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(patch)) {
    search.delete(key);
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Есть ли в наборе параметров хотя бы один из перечисленных ключей. */
export function hasAny(params: SearchParamsInput, keys: string[]): boolean {
  return keys.some((key) => getStr(params, key) !== undefined || getAllParams(params, key).length > 0);
}

/** Хлебные крошки раздела (item берётся из ADMIN_NAV). */
export function crumb(label: string, href?: string): { name: string; href?: string } {
  return href ? { name: label, href } : { name: label };
}
