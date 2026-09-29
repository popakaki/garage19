import Link from "next/link";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Панель фильтров: GET-форма со всеми полями и быстрые фильтры-ссылки.
 * Все значения уходят в query-параметры, поэтому ссылки на пагинацию и
 * сортировку сохраняют активные фильтры.
 */

export function FilterBar({
  action,
  children,
  className,
  resetHref,
  submitLabel = "Применить",
}: {
  action: string;
  children: ReactNode;
  className?: string;
  resetHref?: string;
  submitLabel?: string;
}) {
  return (
    <form
      action={action}
      method="get"
      className={cn(
        "g19-card mb-4 flex flex-wrap items-end gap-3 px-4 py-4 sm:px-5",
        className,
      )}
    >
      {children}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          {submitLabel}
        </button>
        {resetHref && (
          <Link
            href={resetHref}
            className="inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50"
          >
            <X className="size-3.5" aria-hidden />
            Сбросить
          </Link>
        )}
      </div>
    </form>
  );
}

export function FilterItem({
  label,
  htmlFor,
  children,
  width = "md",
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}) {
  const widths = {
    sm: "w-32",
    md: "w-44",
    lg: "w-60",
    xl: "w-72",
  } as const;
  return (
    <div className={widths[width]}>
      <label className="g19-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function QuickFilters({
  items,
  className,
}: {
  items: { label: string; href: string; active?: boolean; count?: number }[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-2", className)}>
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
            item.active
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700",
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className={cn("rounded px-1", item.active ? "bg-white/20" : "bg-ink-100 text-ink-500")}>
              {item.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export const FILTER_INPUT_CLASS = "g19-input";
