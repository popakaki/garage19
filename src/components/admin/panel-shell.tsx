import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { ADMIN_NAV, type UserRole } from "@/lib/constants";
import { filterNavForUser } from "@/lib/admin/permissions";
import { logoutAdminAction } from "@/lib/actions/admin/auth";
import { AdminNavLinks, AdminCurrentSection } from "@/components/admin/sidebar-nav";
import { AdminTopBar } from "@/components/admin/top-bar";
import type { AdminNavItem } from "@/components/admin/nav";

/**
 * Каркас админки: сайдбар по ADMIN_NAV (с учётом прав), шапка с пользователем
 * и кнопкой «Выйти», мобильное меню на <details> (работает без JavaScript),
 * хлебные крошки и сообщение о результате действия.
 * Атрибут data-admin-shell используется правилом в globals.css, которое
 * скрывает публичные шапку/подвал сайта на страницах админки.
 */

export type PanelUser = { name: string; email: string; role: UserRole };

const NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.map((item) => ({
  href: item.href,
  label: item.label,
  icon: item.icon,
  exact: "exact" in item ? item.exact === true : false,
}));

function LogoutForm() {
  return (
    <form action={logoutAdminAction}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50"
      >
        <LogOut className="size-4" aria-hidden />
        Выйти
      </button>
    </form>
  );
}

export function PanelShell({ user, children }: { user: PanelUser; children: ReactNode; navCount?: number }) {
  const items = filterNavForUser(NAV_ITEMS, { role: user.role });

  return (
    <div data-admin-shell className="min-h-screen bg-ink-50 lg:flex">
      {/* Сайдбар (desktop) */}
      <aside className="hidden w-64 shrink-0 border-r border-ink-100 bg-white lg:flex lg:flex-col">
        <div className="border-b border-ink-100 px-5 py-4">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">
              G19
            </span>
            <span className="text-sm font-bold text-ink-900">Админ-панель</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <AdminNavLinks items={items} showSiteLink />
        </div>
        <div className="border-t border-ink-100 px-4 py-3 text-xs text-ink-400">
          {user.role === "admin" ? "Полный доступ" : "Доступ менеджера"}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Шапка */}
        <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Link href="/admin" className="lg:hidden">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-black text-white">
                  G19
                </span>
              </Link>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">
                  <AdminCurrentSection items={items} />
                </p>
                <p className="hidden truncate text-xs text-ink-400 sm:block">
                  {user.name} · {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-lg bg-ink-100 px-2.5 py-1.5 text-xs font-semibold text-ink-700 sm:inline-flex">
                <ShieldCheck className="size-3.5" aria-hidden />
                {user.role === "admin" ? "Администратор" : "Менеджер"}
              </span>
              <LogoutForm />
            </div>
          </div>

          {/* Мобильное меню — без JavaScript */}
          <details className="group border-t border-ink-100 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-semibold text-ink-700">
              <Menu className="size-4" aria-hidden />
              Разделы
            </summary>
            <div className="border-t border-ink-100 px-3 py-3">
              <AdminNavLinks items={items} showSiteLink />
            </div>
          </details>
        </header>

        <main className="flex-1 px-4 py-5 lg:px-6 lg:py-6">
          <Suspense fallback={null}>
            <AdminTopBar />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
