import type { ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  Car,
  Factory,
  FileText,
  FileUp,
  FolderTree,
  Images,
  LayoutDashboard,
  Link2,
  MapPin,
  Package,
  PhoneCall,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Навигация админки: иконки берём из lucide-react (уже в зависимостях),
 * строки разделов — из ADMIN_NAV в @/lib/constants.
 */

export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
};

export const ADMIN_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  FolderTree,
  SlidersHorizontal,
  Car,
  Link2,
  FileUp,
  Factory,
  Star,
  PhoneCall,
  Images,
  FileText,
  MapPin,
  Users,
  Settings,
  BarChart3,
};

export function AdminIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ADMIN_ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} aria-hidden />;
}

export function isNavItemActive(pathname: string, item: { href: string; exact?: boolean }): boolean {
  if (item.exact || item.href === "/admin") return pathname === "/admin";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export type NavSection = { title: string; items: AdminNavItem[] };

/** Группировка разделов для сайдбара. */
export const ADMIN_NAV_SECTIONS: { title: string; hrefs: string[] }[] = [
  { title: "Продажи", hrefs: ["/admin", "/admin/orders", "/admin/callbacks", "/admin/reviews"] },
  { title: "Каталог", hrefs: ["/admin/products", "/admin/categories", "/admin/attributes", "/admin/cars", "/admin/compatibility"] },
  { title: "Закупки", hrefs: ["/admin/import", "/admin/suppliers"] },
  { title: "Контент", hrefs: ["/admin/banners", "/admin/pages", "/admin/cities"] },
  { title: "Система", hrefs: ["/admin/users", "/admin/settings"] },
];

export function buildNavSections(items: AdminNavItem[]): NavSection[] {
  const used = new Set<string>();
  const sections: NavSection[] = [];
  for (const section of ADMIN_NAV_SECTIONS) {
    const sectionItems = section.hrefs
      .map((href) => items.find((item) => item.href === href))
      .filter((item): item is AdminNavItem => Boolean(item));
    sectionItems.forEach((item) => used.add(item.href));
    if (sectionItems.length > 0) sections.push({ title: section.title, items: sectionItems });
  }
  const rest = items.filter((item) => !used.has(item.href));
  if (rest.length > 0) sections.push({ title: "Прочее", items: rest });
  return sections;
}

export type AdminTableColumn<T> = {
  key: string;
  title: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  cell: (row: T) => ReactNode;
};
