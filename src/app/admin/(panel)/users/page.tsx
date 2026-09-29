import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck, Ban, Trash2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { USER_ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { buildHref, buildPagination, getPage, getPerPage, getSort, getStr, skipTake, type SearchParamsRecord } from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { RoleBadge, StatusBadge } from "@/components/admin/badges";
import { FilterBar, FilterItem, QuickFilters } from "@/components/admin/filters";
import { TablePagination } from "@/components/admin/data-table";
import { UserCreateForm } from "@/components/admin/user-forms";
import { changeUserRoleAction, deleteUserAction, toggleUserActiveAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Пользователи" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const SORT_FIELDS = ["createdAt", "name", "email", "lastLoginAt", "role"] as const;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="users" requireAdminRole>
      {async ({ user }) => {
        const search = getStr(params, "q")?.trim();
        const role = getStr(params, "role");
        const active = getStr(params, "active");
        const page = getPage(params);
        const perPage = getPerPage(params, 30);
        const sort = getSort(params, SORT_FIELDS, "createdAt", "desc");

        const where: Prisma.UserWhereInput = {
          ...(role && role in USER_ROLES ? { role } : {}),
          ...(active === "yes" ? { isActive: true } : active === "no" ? { isActive: false } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { phone: { contains: search } },
                ],
              }
            : {}),
        };

        const [total, users, counters] = await Promise.all([
          prisma.user.count({ where }),
          prisma.user.findMany({
            where,
            orderBy: { [sort.field]: sort.dir },
            ...skipTake(page, perPage),
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              role: true,
              isActive: true,
              lastLoginAt: true,
              createdAt: true,
              city: { select: { name: true } },
              _count: { select: { orders: true, reviews: true } },
            },
          }),
          prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
        ]);

        const pagination = buildPagination(page, perPage, total);
        const record: SearchParamsRecord = {
          ...(search ? { q: search } : {}),
          ...(role ? { role } : {}),
          ...(active ? { active } : {}),
          sort: sort.field,
          dir: sort.dir,
        };
        const roleMap = new Map(counters.map((row) => [row.role, row._count._all]));

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Пользователи"
              description="Роли, блокировка и создание сотрудников. Администратор не может понизить сам себя."
              actions={
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
                  <ShieldCheck className="size-4 text-brand-600" aria-hidden />
                  Вы вошли как {user.email}
                </span>
              }
            />

            <QuickFilters
              items={[
                {
                  label: "Все",
                  href: buildHref("/admin/users", record, { role: null, active: null, page: 1 }),
                  active: !role && !active,
                  count: Array.from(roleMap.values()).reduce((sum, value) => sum + value, 0),
                },
                ...Object.entries(USER_ROLES).map(([key, label]) => ({
                  label,
                  href: buildHref("/admin/users", record, { role: key, page: 1 }),
                  active: role === key,
                  count: roleMap.get(key) ?? 0,
                })),
                {
                  label: "Заблокированные",
                  href: buildHref("/admin/users", record, { active: "no", page: 1 }),
                  active: active === "no",
                },
              ]}
            />

            <FilterBar action="/admin/users" resetHref="/admin/users">
              <FilterItem label="Поиск" htmlFor="q" width="lg">
                <input id="q" name="q" defaultValue={search ?? ""} placeholder="Имя, email, телефон" className="g19-input" />
              </FilterItem>
            </FilterBar>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <AdminCard title={`Пользователи (${total})`} padded={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[52rem] text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                          <th className="px-5 py-2.5 text-left font-semibold">
                            <Link href={buildHref("/admin/users", record, { sort: "name", dir: sort.field === "name" && sort.dir === "asc" ? "desc" : "asc", page: 1 })}>
                              Пользователь
                            </Link>
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold">Роль</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Заказы</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Активность</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Регистрация</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((row) => (
                          <tr key={row.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                            <td className="px-5 py-2.5">
                              <Link href={`/admin/users/${row.id}`} className="font-medium text-ink-800 hover:text-brand-700">
                                {row.name}
                              </Link>
                              <p className="text-xs text-ink-400">{row.email}</p>
                              {row.phone && <p className="text-xs text-ink-400">{row.phone}</p>}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col items-start gap-1">
                                <RoleBadge role={row.role} />
                                {!row.isActive && <StatusBadge tone="danger">заблокирован</StatusBadge>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center text-ink-600">{row._count.orders}</td>
                            <td className="px-3 py-2.5 text-xs text-ink-500">
                              {row.lastLoginAt ? `Вход: ${formatDate(row.lastLoginAt, true)}` : "не входил"}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-ink-500">{formatDate(row.createdAt)}</td>
                            <td className="px-5 py-2.5">
                              <div className="flex flex-wrap items-center justify-end gap-1">
                                <form action={changeUserRoleAction} className="flex items-center gap-1">
                                  <input type="hidden" name="id" value={row.id} />
                                  <select
                                    name="role"
                                    defaultValue={row.role}
                                    aria-label={`Роль ${row.name}`}
                                    className="g19-input w-32 py-1.5 text-xs"
                                  >
                                    {Object.entries(USER_ROLES).map(([key, label]) => (
                                      <option key={key} value={key}>
                                        {label}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="submit"
                                    className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                  >
                                    ОК
                                  </button>
                                </form>

                                <form action={toggleUserActiveAction}>
                                  <input type="hidden" name="id" value={row.id} />
                                  <button
                                    type="submit"
                                    disabled={row.id === user.id}
                                    title={row.id === user.id ? "Нельзя заблокировать себя" : undefined}
                                    className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-40"
                                  >
                                    <Ban className="size-3.5" aria-hidden />
                                    {row.isActive ? "Блок" : "Разблок"}
                                  </button>
                                </form>

                                {row.id !== user.id && (
                                  <ConfirmButton
                                    action={deleteUserAction}
                                    id={row.id}
                                    title="Удалить пользователя?"
                                    description={
                                      row._count.orders > 0
                                        ? "У пользователя есть заказы — они останутся, но потеряют связь с аккаунтом."
                                        : "Аккаунт и сессии будут удалены."
                                    }
                                  />
                                )}
                                {row.id === user.id && (
                                  <span className="inline-flex items-center gap-1 text-xs text-ink-400">
                                    <Trash2 className="size-3.5" aria-hidden />
                                    это вы
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-12 text-center text-sm text-ink-500">
                              Пользователи не найдены.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 pb-4">
                    <TablePagination basePath="/admin/users" params={record} pagination={pagination} />
                  </div>
                </AdminCard>
              </div>

              <div className="space-y-4">
                <AdminCard title="Создание сотрудника">
                  <UserCreateForm />
                </AdminCard>
                <AdminCard title="Права доступа" padded={false}>
                  <ul className="divide-y divide-ink-100 text-sm text-ink-600">
                    <li className="px-5 py-3">
                      <span className="font-semibold text-ink-900">Администратор</span> — все разделы, включая настройки,
                      пользователей, импорт и поставщиков.
                    </li>
                    <li className="px-5 py-3">
                      <span className="font-semibold text-ink-900">Менеджер</span> — заказы, заявки, отзывы, товары,
                      категории, характеристики, автомобили, совместимость, контент и города.
                    </li>
                    <li className="px-5 py-3">
                      <span className="font-semibold text-ink-900">Покупатель</span> — доступ только в личный кабинет.
                    </li>
                  </ul>
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
