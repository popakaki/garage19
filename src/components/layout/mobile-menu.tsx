"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import type { CSSProperties } from "react";

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  _count?: { products: number };
  children?: {
    id: string;
    name: string;
    slug: string;
    _count?: { products: number };
  }[];
};

/** Мега-меню каталога в шапке: колонка корневых категорий + панель подкатегорий. */
export function CatalogMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const active = categories.find((category) => category.id === activeId) ?? categories[0];

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        <Menu className="size-4" />
        Каталог
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 flex w-[min(72rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop"
          onMouseLeave={() => setOpen(false)}
        >
          <ul className="w-72 shrink-0 border-r border-ink-100 bg-ink-50/60 py-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/catalog/${category.slug}`}
                  onMouseEnter={() => setActiveId(category.id)}
                  className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    active?.id === category.id ? "bg-white text-brand-700" : "text-ink-700 hover:bg-white/70"
                  }`}
                >
                  <span>{category.name}</span>
                  <span className="text-xs text-ink-400">{category._count?.products ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="min-h-64 flex-1 p-5">
            {active && (
              <>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <Link href={`/catalog/${active.slug}`} className="text-base font-bold text-ink-900 hover:text-brand-700">
                    {active.name}
                  </Link>
                  <span className="text-xs text-ink-400">{active._count?.products ?? 0} товаров</span>
                </div>
                {active.description && (
                  <p className="mb-4 line-clamp-2 text-sm text-ink-500">{active.description}</p>
                )}
                {active.children && active.children.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 lg:grid-cols-3">
                    {active.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/catalog/${child.slug}`}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-600 hover:bg-brand-50 hover:text-brand-700"
                        >
                          <span>{child.name}</span>
                          <span className="text-xs text-ink-400">{child._count?.products ?? 0}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-400">Товары раздела смотрите на странице категории.</p>
                )}

                <div className="mt-6 flex flex-wrap gap-2 border-t border-ink-100 pt-4 text-xs font-semibold">
                  <Link href="/catalog" className="rounded-lg bg-ink-100 px-3 py-1.5 text-ink-700 hover:bg-ink-200">
                    Весь каталог
                  </Link>
                  <Link href="/podbor" className="rounded-lg bg-brand-50 px-3 py-1.5 text-brand-700 hover:bg-brand-100">
                    Подбор по автомобилю
                  </Link>
                  <Link href="/brands" className="rounded-lg bg-ink-100 px-3 py-1.5 text-ink-700 hover:bg-ink-200">
                    Бренды
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Мобильное меню (шторка). */
export function MobileMenu({
  categories,
  pages,
}: {
  categories: MenuCategory[];
  pages: { slug: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const style: CSSProperties = {};

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-xl border border-ink-200 text-ink-700 lg:hidden"
        aria-label="Открыть меню"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" style={style}>
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <span className="text-sm font-bold text-ink-900">Меню</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-ink-200 text-ink-600"
                aria-label="Закрыть меню"
              >
                <X className="size-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
              <Link href="/podbor" className="mb-2 block rounded-xl bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700">
                Подбор по автомобилю
              </Link>
              {categories.map((category) => (
                <div key={category.id} className="border-b border-ink-50 last:border-0">
                  <div className="flex items-center justify-between">
                    <Link href={`/catalog/${category.slug}`} className="flex-1 px-3 py-2.5 text-sm font-medium text-ink-800">
                      {category.name}
                    </Link>
                    {category.children && category.children.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === category.id ? null : category.id)}
                        className="px-3 py-2 text-ink-400"
                        aria-label={`Подкатегории ${category.name}`}
                      >
                        <ChevronDown className={`size-4 transition-transform ${expanded === category.id ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                  {expanded === category.id && category.children && (
                    <ul className="pb-2 pl-4">
                      {category.children.map((child) => (
                        <li key={child.id}>
                          <Link href={`/catalog/${child.slug}`} className="block px-3 py-1.5 text-sm text-ink-500">
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              <div className="mt-3 space-y-0.5">
                {[
                  { href: "/catalog", label: "Каталог" },
                  { href: "/brands", label: "Бренды" },
                  { href: "/compare", label: "Сравнение" },
                  { href: "/wishlist", label: "Избранное" },
                  { href: "/install", label: "Запись на установку" },
                  { href: "/account", label: "Личный кабинет" },
                  ...pages.map((page) => ({ href: `/${page.slug}`, label: page.title })),
                ].map((item) => (
                  <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-ink-50">
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
