import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import { getRecentAudit } from "@/lib/admin/audit";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard } from "@/components/admin/page-parts";
import { OrderStatusBadge, RoleBadge, StatusBadge } from "@/components/admin/badges";
import { UserEditForm } from "@/components/admin/user-forms";
import { changeUserRoleAction, toggleUserActiveAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Пользователь" };

export const dynamic = "force-dynamic";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPanelPage resource="users" requireAdminRole>
      {async ({ user }) => {
        const profile = await prisma.user.findUnique({
          where: { id },
          include: {
            city: { select: { id: true, name: true } },
            orders: {
              orderBy: { createdAt: "desc" },
              take: 10,
              select: { id: true, number: true, total: true, status: true, createdAt: true },
            },
            _count: { select: { orders: true, reviews: true, sessions: true, savedCars: true } },
          },
        });
        if (!profile) notFound();

        const auditTrail = await getRecentAudit(10, profile.id);
        const isSelf = profile.id === user.id;

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={profile.name}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={profile.role} />
                  <StatusBadge tone={profile.isActive ? "success" : "danger"}>
                    {profile.isActive ? "активен" : "заблокирован"}
                  </StatusBadge>
                  <span className="text-xs text-ink-400">{profile.email}</span>
                  {profile.city && <span className="text-xs text-ink-400">город: {profile.city.name}</span>}
                  {isSelf && <StatusBadge tone="brand">это вы</StatusBadge>}
                </span>
              }
              actions={
                <Link
                  href="/admin/users"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  К пользователям
                </Link>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="g19-card xl:col-span-2">
                <UserEditForm
                  userId={profile.id}
                  name={profile.name}
                  phone={profile.phone ?? ""}
                  isActive={profile.isActive}
                />
              </div>

              <div className="space-y-4">
                <AdminCard title="Роль и доступ">
                  <form action={changeUserRoleAction} className="space-y-3">
                    <input type="hidden" name="id" value={profile.id} />
                    <div>
                      <label className="g19-label" htmlFor="role">
                        Роль
                      </label>
                      <select
                        id="role"
                        name="role"
                        defaultValue={profile.role}
                        disabled={isSelf}
                        className="g19-input cursor-pointer disabled:opacity-60"
                      >
                        <option value="customer">Покупатель</option>
                        <option value="manager">Менеджер</option>
                        <option value="admin">Администратор</option>
                      </select>
                      {isSelf && (
                        <p className="mt-1 text-xs text-amber-600">Собственную роль изменить нельзя.</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSelf}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                      Сохранить роль
                    </button>
                  </form>

                  <form action={toggleUserActiveAction} className="mt-3 border-t border-ink-100 pt-3">
                    <input type="hidden" name="id" value={profile.id} />
                    <button
                      type="submit"
                      disabled={isSelf}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
                    >
                      {profile.isActive ? "Заблокировать" : "Разблокировать"}
                    </button>
                  </form>
                </AdminCard>

                <AdminCard title="Статистика">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Заказов</dt>
                      <dd className="font-semibold text-ink-900">{profile._count.orders}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Отзывов</dt>
                      <dd className="font-semibold text-ink-900">{profile._count.reviews}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Авто в гараже</dt>
                      <dd className="font-semibold text-ink-900">{profile._count.savedCars}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Активных сессий</dt>
                      <dd className="font-semibold text-ink-900">{profile._count.sessions}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Последний вход</dt>
                      <dd className="text-ink-800">{profile.lastLoginAt ? formatDate(profile.lastLoginAt, true) : "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Регистрация</dt>
                      <dd className="text-ink-800">{formatDate(profile.createdAt, true)}</dd>
                    </div>
                  </dl>
                </AdminCard>

                <AdminCard title="Последние заказы" padded={false}>
                  {profile.orders.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-ink-400">Заказов нет</p>
                  ) : (
                    <ul className="divide-y divide-ink-100">
                      {profile.orders.map((order) => (
                        <li key={order.id} className="flex items-center justify-between gap-2 px-5 py-2.5">
                          <div className="min-w-0">
                            <Link href={`/admin/orders/${order.id}`} className="text-sm font-medium text-brand-700">
                              {order.number}
                            </Link>
                            <p className="text-xs text-ink-400">{formatDate(order.createdAt, true)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-ink-900">{formatPrice(order.total)}</p>
                            <OrderStatusBadge status={order.status} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </AdminCard>

                <AdminCard title="Журнал действий" padded={false}>
                  {auditTrail.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-ink-400">Записей нет</p>
                  ) : (
                    <ul className="divide-y divide-ink-100">
                      {auditTrail.map((entry) => (
                        <li key={entry.id} className="px-5 py-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <StatusBadge tone="outline">{entry.action}</StatusBadge>
                            <span className="text-ink-400">{formatDate(entry.createdAt, true)}</span>
                          </div>
                          <p className="mt-1 text-ink-500">
                            {entry.entity}
                            {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
