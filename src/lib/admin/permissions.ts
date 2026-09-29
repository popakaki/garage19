import type { SessionUser } from "@/lib/auth";
import type { UserRole } from "@/lib/constants";

/**
 * Права доступа админки.
 *  * admin  — всё;
 *  * manager — заказы, заявки, отзывы, товары, категории, характеристики,
 *    совместимость, автомобили, баннеры, страницы, города (без удаления
 *    пользователей и без доступа к настройкам/пользователям/импорту).
 * Менеджер не видит разделы «Пользователи», «Настройки», «Импорт прайсов»
 * и «Поставщики» (поставщики содержат закупочные данные).
 */

export const ADMIN_RESOURCES = [
  "dashboard",
  "orders",
  "products",
  "categories",
  "attributes",
  "cars",
  "compatibility",
  "import",
  "suppliers",
  "reviews",
  "callbacks",
  "banners",
  "pages",
  "cities",
  "users",
  "settings",
] as const;

export type AdminResource = (typeof ADMIN_RESOURCES)[number];

/** Ресурсы, доступные менеджеру. */
const MANAGER_RESOURCES: readonly AdminResource[] = [
  "dashboard",
  "orders",
  "products",
  "categories",
  "attributes",
  "cars",
  "compatibility",
  "reviews",
  "callbacks",
  "banners",
  "pages",
  "cities",
];

export function isAdminRole(role: UserRole): boolean {
  return role === "admin";
}

export function isStaffRole(role: UserRole): boolean {
  return role === "admin" || role === "manager";
}

export function isManagerOnly(user: Pick<SessionUser, "role">): boolean {
  return user.role === "manager";
}

/** Может ли пользователь работать с разделом. */
export function canManage(user: Pick<SessionUser, "role"> | null | undefined, resource: AdminResource): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "manager") return false;
  return MANAGER_RESOURCES.includes(resource);
}

/** Только администратор: пользователи, настройки, импорт, поставщики. */
export function isAdminOnlyResource(resource: AdminResource): boolean {
  return !MANAGER_RESOURCES.includes(resource);
}

/** Первый сегмент пути /admin/xxx → ресурс раздела. */
export function resourceFromPath(pathname: string): AdminResource | null {
  const segments = pathname.split("/").filter(Boolean);
  const segment = segments[1];
  if (!segment) return "dashboard";
  const found = ADMIN_RESOURCES.find((resource) => resource === segment);
  return found ?? null;
}

/** Навигация админки с учётом роли (менеджер не видит закрытые разделы). */
export function filterNavForUser<T extends { href: string }>(
  items: readonly T[],
  user: Pick<SessionUser, "role">,
): T[] {
  return items.filter((item) => {
    const resource = resourceFromPath(item.href);
    if (!resource) return true;
    return canManage(user, resource);
  });
}
