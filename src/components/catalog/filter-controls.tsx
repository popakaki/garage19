"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { SORT_OPTIONS } from "@/lib/constants";
import {
  buildCatalogHref,
  formatAttributeToken,
  type RawSearchParams,
} from "@/components/catalog/catalog-params";

/** SearchParams (readonly) → наш RawSearchParams. */
export function useRawParams(): RawSearchParams {
  const searchParams = useSearchParams();
  const raw: RawSearchParams = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    raw[key] = values.length > 1 ? values : values[0];
  }
  return raw;
}

/** Значения параметра как массив (для повторяемых фильтров). */
export function paramValues(raw: RawSearchParams, key: string): string[] {
  const value = raw[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Навигация по каталогу с сохранением всех активных фильтров. */
export function useCatalogNavigate(basePath: string) {
  const router = useRouter();
  const params = useRawParams();
  return {
    params,
    href: (changes: Record<string, string | string[] | null | undefined>) =>
      buildCatalogHref(basePath, params, changes),
    push: (changes: Record<string, string | string[] | null | undefined>) => {
      router.push(buildCatalogHref(basePath, params, changes), { scroll: false });
    },
    /**
     * Переключает одно значение в повторяемом фильтре (чекбоксы производителя,
     * места установки, материала, атрибутов) и сбрасывает страницу.
     */
    toggle: (key: string, value: string) => {
      const values = paramValues(params, key);
      const next = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      router.push(
        buildCatalogHref(basePath, params, { [key]: next.length ? next : null, page: null }),
        { scroll: false },
      );
    },
  };
}

/** Диапазон цены в рублях: два поля + «Применить». */
export function PriceRangeFilter({ basePath }: { basePath: string }) {
  const params = useRawParams();
  const { push } = useCatalogNavigate(basePath);
  const current = paramValues(params, "price")[0] ?? "";
  const [from, setFrom] = useState(() => current.split("-")[0] ?? "");
  const [to, setTo] = useState(() => current.split("-")[1] ?? "");

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const min = from.trim();
        const max = to.trim();
        push({ price: min || max ? `${min}-${max}` : null, page: null });
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          placeholder="от"
          aria-label="Цена от, рублей"
          className="h-10"
        />
        <span className="text-ink-400">—</span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="до"
          aria-label="Цена до, рублей"
          className="h-10"
        />
      </div>
      <Button type="submit" variant="outline" size="sm">
        Применить
      </Button>
    </form>
  );
}

/** Чекбокс со счётчиком: значение повторяемого фильтра или флаг (=1). */
export function FilterCheckbox({
  basePath,
  param,
  value,
  label,
  count,
  checked,
}: {
  basePath: string;
  param: string;
  /** Для флагов (stock/lock/electric/bumper/new/hit) не задаётся — пишется «1». */
  value?: string;
  label: string;
  count?: number;
  checked: boolean;
}) {
  const { toggle, push } = useCatalogNavigate(basePath);

  return (
    <label className="flex cursor-pointer items-start gap-2 py-1 text-sm text-ink-700 hover:text-ink-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {
          if (value === undefined) {
            push({ [param]: checked ? null : "1", page: null });
            return;
          }
          toggle(param, value);
        }}
        className="mt-0.5 size-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
      />
      <span className="flex-1">
        {label}
        {count !== undefined && <span className="ml-1 text-ink-400">({count})</span>}
      </span>
    </label>
  );
}

/** Атрибут каталога (slug:значение) — чекбокс в сайдбаре. */
export function AttributeFilterCheckbox({
  basePath,
  slug,
  value,
  count,
  checked,
}: {
  basePath: string;
  slug: string;
  value: string;
  count: number;
  checked: boolean;
}) {
  const { toggle } = useCatalogNavigate(basePath);
  return (
    <FilterCheckbox
      basePath={basePath}
      param="a"
      value={formatAttributeToken(slug, value)}
      label={value}
      count={count}
      checked={checked}
    />
  );
}

/** Выбор сортировки: сохраняет фильтры, сбрасывает страницу. */
export function SortSelect({ basePath }: { basePath: string }) {
  const { params, push } = useCatalogNavigate(basePath);
  const current = paramValues(params, "sort")[0] ?? "popular";

  return (
    <label className="flex items-center gap-2 text-sm text-ink-500">
      <span className="hidden sm:inline">Сортировка:</span>
      <select
        value={current}
        onChange={(event) => push({ sort: event.target.value, page: null })}
        className="g19-input h-10 w-auto cursor-pointer py-0 text-sm"
        aria-label="Сортировка товаров"
      >
        {Object.entries(SORT_OPTIONS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Переключатель вид «плитка / список» (query view). */
export function ViewSwitcher({ basePath }: { basePath: string }) {
  const { params, push } = useCatalogNavigate(basePath);
  const current = paramValues(params, "view")[0] === "list" ? "list" : "grid";

  const items = [
    { value: "grid", label: "Плитка", icon: "▦" },
    { value: "list", label: "Список", icon: "☰" },
  ] as const;

  return (
    <div className="inline-flex rounded-xl border border-ink-200 bg-white p-0.5" role="group" aria-label="Вид каталога">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => push({ view: item.value === "grid" ? null : item.value })}
          aria-pressed={current === item.value}
          className={
            current === item.value
              ? "rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white"
              : "rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:text-brand-700"
          }
        >
          <span aria-hidden className="mr-1">
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
