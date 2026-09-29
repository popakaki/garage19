"use client";

import Link from "next/link";
import { RotateCcw, X } from "lucide-react";
import { buildCatalogHref, type RawSearchParams } from "@/components/catalog/catalog-params";
import { paramValues } from "@/components/catalog/param-utils";
import { useSearchParams } from "next/navigation";

function useRawParams(): RawSearchParams {
  const searchParams = useSearchParams();
  const raw: RawSearchParams = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    raw[key] = values.length > 1 ? values : values[0];
  }
  return raw;
}

type Chip = { key: string; label: string; href: string };

/**
 * Активные фильтры в виде «чипсов» с удалением.
 * Каждый чипс — ссылка с сохранением остальных параметров (работает без JS).
 */
export function ActiveFilterChips({
  basePath,
  labels,
  carLabel,
}: {
  basePath: string;
  labels?: Record<string, string>;
  carLabel?: string;
}) {
  const params = useRawParams();
  const chips: Chip[] = [];

  const multi: { key: string; humanize?: (value: string) => string }[] = [
    { key: "z" },
    { key: "place" },
    { key: "material" },
    { key: "a", humanize: (value) => value.replace(":", ": ") },
  ];

  for (const group of multi) {
    for (const value of paramValues(params, group.key)) {
      const rest = paramValues(params, group.key).filter((item) => item !== value);
      chips.push({
        key: `${group.key}-${value}`,
        label: labels?.[`${group.key}:${value}`] ?? group.humanize?.(value) ?? value,
        href: buildCatalogHref(basePath, params, { [group.key]: rest.length ? rest : null, page: null }),
      });
    }
  }

  const ranges: { key: string; title: string; suffix: string }[] = [
    { key: "price", title: "Цена", suffix: " ₽" },
    { key: "capacity", title: "Грузоподъёмность", suffix: " кг" },
    { key: "volume", title: "Объём", suffix: " л" },
  ];
  for (const group of ranges) {
    const raw = paramValues(params, group.key)[0];
    if (!raw) continue;
    const [from, to] = raw.split("-");
    const label = `${group.title}: ${from ? `от ${from}` : ""}${from && to ? " " : ""}${to ? `до ${to}` : ""}${group.suffix}`;
    chips.push({
      key: group.key,
      label,
      href: buildCatalogHref(basePath, params, { [group.key]: null, page: null }),
    });
  }

  const flags: { key: string; label: string; value?: string }[] = [
    { key: "stock", label: "Только в наличии" },
    { key: "lock", label: "С замком" },
    { key: "electric", label: "С электрикой" },
    { key: "bumper", label: "Без выреза бампера" },
    { key: "new", label: "Новинки" },
    { key: "hit", label: "Хиты" },
    { key: "fitment", label: "Только универсальные", value: "universal" },
  ];
  for (const flag of flags) {
    if (flag.value) {
      if (!paramValues(params, flag.key).includes(flag.value)) continue;
    } else if (!paramValues(params, flag.key)[0]) {
      continue;
    }
    chips.push({
      key: flag.key,
      label: flag.label,
      href: buildCatalogHref(basePath, params, { [flag.key]: null, page: null }),
    });
  }

  if (params.marka) {
    chips.push({
      key: "car",
      label: carLabel ?? "Подбор по автомобилю",
      href: buildCatalogHref(basePath, params, {
        marka: null,
        model: null,
        pokolenie: null,
        mod: null,
        page: null,
      }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Выбрано:</span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 hover:border-brand-400"
        >
          {chip.label}
          <X className="size-3.5" aria-hidden />
          <span className="sr-only">Удалить фильтр {chip.label}</span>
        </Link>
      ))}
      <Link
        href={basePath}
        scroll={false}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1 text-xs font-medium text-ink-600 hover:border-danger-500 hover:text-danger-600"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        Сбросить всё
      </Link>
    </div>
  );
}
