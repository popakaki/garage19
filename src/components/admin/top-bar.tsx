"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ADMIN_NAV } from "@/lib/constants";
import { AdminToastBar } from "@/components/admin/toast";
import { resolveToast } from "@/lib/admin/toast";

/**
 * Шапка админки: хлебные крошки по текущему пути и сообщение о результате
 * действия из query-параметров (`toast` + `toastType`).
 * Крошки строятся по ADMIN_NAV, поэтому не требуют ручной передачи props.
 * Компонент клиентский (usePathname/useSearchParams), обёрнут в Suspense
 * на уровне layout.
 */

type Crumb = { name: string; href?: string };

const LABELS: Record<string, string> = {
  new: "Создание",
  models: "Модели",
  generations: "Поколения",
};

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean); // ["admin", "orders", "123"]
  const crumbs: Crumb[] = [];
  let href = "";
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    href += `/${segment}`;
    if (index === 0) continue; // «admin» — корень панели

    const navItem = ADMIN_NAV.find((item) => item.href === href);
    if (navItem) {
      crumbs.push({ name: navItem.label, href });
      continue;
    }
    if (segment === "new") {
      crumbs.push({ name: "Новый товар" });
      continue;
    }
    if (LABELS[segment]) {
      crumbs.push({ name: LABELS[segment], href });
      continue;
    }
    // Идентификатор записи: показываем как есть (на страницах есть название сущности).
    const isLast = index === segments.length - 1;
    crumbs.push({ name: isLast ? "Карточка" : segment, href: isLast ? undefined : href });
  }
  return crumbs;
}

export function AdminTopBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = resolveToast(searchParams.get("toast"));
  const crumbs = buildCrumbs(pathname);

  return (
    <>
      {crumbs.length > 0 && (
        <nav aria-label="Хлебные крошки" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
          <Link href="/admin" className="hover:text-brand-700">
            Админка
          </Link>
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.name}-${index}`} className="flex items-center gap-1.5">
              <ChevronRight className="size-3 text-ink-300" aria-hidden />
              {crumb.href && index < crumbs.length - 1 ? (
                <Link href={crumb.href} className="hover:text-brand-700">
                  {crumb.name}
                </Link>
              ) : (
                <span className="font-medium text-ink-700">{crumb.name}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {toast && <AdminToastBar toast={toast} clearHref={pathname} className="mb-4" />}
    </>
  );
}
