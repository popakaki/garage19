import type { RawSearchParams } from "@/components/catalog/catalog-params";

/**
 * Утилиты для серверного кода: значения повторяемых параметров фильтров.
 * Не содержит "use client" — можно использовать и в RSC, и в клиентских фильтрах.
 */
export function paramValues(raw: RawSearchParams, key: string): string[] {
  const value = raw[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Первое значение параметра (или undefined). */
export function paramValue(raw: RawSearchParams, key: string): string | undefined {
  return paramValues(raw, key)[0];
}

/** Флаг-параметр (stock=1, lock=1 …). */
export function paramFlag(raw: RawSearchParams, key: string): boolean {
  const value = paramValue(raw, key);
  return value === "1" || value === "true" || value === "on";
}
