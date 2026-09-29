"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui";

/**
 * Мобильный фильтр: кнопка «Фильтры» открывает выдвижную панель,
 * внутри — тот же сайдбар, что и на десктопе (передаётся как children).
 */
export function MobileFilterDrawer({
  children,
  activeCount = 0,
  total,
  basePath,
}: {
  children: ReactNode;
  activeCount?: number;
  total?: number;
  basePath: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:border-brand-300 lg:hidden"
        aria-expanded={open}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Фильтры
        {activeCount > 0 && <Badge variant="brand">{activeCount}</Badge>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Фильтры каталога">
          <button
            type="button"
            aria-label="Закрыть фильтры"
            className="absolute inset-0 bg-ink-950/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(22rem,88vw)] flex-col bg-ink-50 shadow-pop">
            <div className="flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3">
              <span className="font-semibold text-ink-900">
                Фильтры{total !== undefined ? ` · ${total} товаров` : ""}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть фильтры"
                className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4" onClick={() => undefined}>
              {children}
            </div>
            <div className="border-t border-ink-100 bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Показать товары
              </button>
              <a href={basePath} className="mt-2 block text-center text-xs text-ink-500 hover:text-brand-700">
                Сбросить фильтры
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
