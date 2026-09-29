"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Car,
  LayoutDashboard,
  LogOut,
  Package,
  Star,
  User,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/account";
import { ACCOUNT_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Навигация личного кабинета + выход.
 * Пункты берутся из `ACCOUNT_NAV`, «Гараж» добавляется отдельно —
 * это наша ключевая функция, поэтому она на виду.
 */

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Package,
  User,
  Star,
  Car,
};

type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function AccountNav() {
  const pathname = usePathname();
  const items: NavItem[] = [
    ...ACCOUNT_NAV.map((item) => ({ href: item.href, label: item.label, icon: item.icon as keyof typeof ICONS })),
    { href: "/account/garage", label: "Гараж", icon: "Car" },
  ];

  return (
    <nav aria-label="Навигация личного кабинета" className="space-y-2">
      <ul className="g19-card divide-y divide-ink-100 overflow-hidden">
        {items.map((item) => {
          const base = item.href.split("#")[0];
          const active = pathname === base || (base !== "/account" && pathname.startsWith(`${base}/`));
          const Icon = ICONS[item.icon] ?? Package;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition",
                  active ? "bg-brand-50 text-brand-800" : "text-ink-700 hover:bg-ink-50",
                )}
              >
                <Icon className={cn("size-4", active ? "text-brand-600" : "text-ink-400")} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-600 transition hover:border-danger-500/40 hover:text-danger-600"
        >
          <LogOut className="size-4" aria-hidden />
          Выйти из аккаунта
        </button>
      </form>
    </nav>
  );
}
