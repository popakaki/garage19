"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminIcon, buildNavSections, isNavItemActive, type AdminNavItem } from "@/components/admin/nav";

/**
 * Навигация админки. Активный раздел определяется по usePathname,
 * поэтому layout остаётся серверным и не знает о текущем URL.
 */

export function AdminNavLinks({
  items,
  showSiteLink = false,
  className,
}: {
  items: AdminNavItem[];
  showSiteLink?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const sections = buildNavSections(items);

  return (
    <nav className={cn("flex flex-col gap-4", className)} aria-label="Разделы админки">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isNavItemActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
                    )}
                  >
                    <AdminIcon name={item.icon} className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {showSiteLink && (
        <Link
          href="/"
          prefetch={false}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-100 hover:text-ink-800"
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          Открыть сайт
        </Link>
      )}
    </nav>
  );
}

/** Название текущего раздела для шапки. */
export function AdminCurrentSection({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  const current = items.find((item) => isNavItemActive(pathname, item));
  return <>{current?.label ?? "Админ-панель"}</>;
}
