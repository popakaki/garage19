import Link from "next/link";
import type { Metadata } from "next";
import {
  BadgeRussianRuble,
  Boxes,
  CircleAlert,
  MessageSquareWarning,
  Package,
  PackageCheck,
  PhoneCall,
  ShoppingCart,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { ORDER_STATUSES } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, BarChart, BarList } from "@/components/admin/page-parts";
import { StatCard, StatGrid } from "@/components/admin/stat-card";
import { OrderStatusBadge, ReviewStatusBadge } from "@/components/admin/badges";

export const metadata: Metadata = { title: "Сводка" };

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(date: Date): string {
  return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminDashboardPage() {
  return (
    <AdminPanelPage resource="dashboard">
      {async ({ user }) => {
        const now = new Date();
        const from = new Date(now.getTime() - 30 * DAY_MS);

        const [
          ordersByStatus,
          recentOrders,
          callbacksNew,
          recentCallbacks,
          reviewsPending,
          recentReviews,
          revenueOrders,
          outOfStock,
          withoutFitment,
          universalProducts,
          counts,
          lowStock,
        ] = await Promise.all([
          prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
          prisma.order.findMany({
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
              id: true,
              number: true,
              customerName: true,
              total: true,
              status: true,
              paymentStatus: true,
              createdAt: true,
              _count: { select: { items: true } },
            },
          }),
          prisma.callbackRequest.count({ where: { status: "new" } }),
          prisma.callbackRequest.findMany({
            orderBy: { createdAt: "desc" },
            take: 6,
            select: { id: true, name: true, phone: true, type: true, status: true, createdAt: true },
          }),
          prisma.review.count({ where: { status: "pending" } }),
          prisma.review.findMany({
            orderBy: { createdAt: "desc" },
            where: { status: "pending" },
            take: 5,
            select: {
              id: true,
              authorName: true,
              rating: true,
              text: true,
              createdAt: true,
              product: { select: { id: true, name: true } },
            },
          }),
          prisma.order.findMany({
            where: { createdAt: { gte: from }, status: { not: "canceled" } },
            select: { total: true, createdAt: true, status: true },
          }),
          prisma.product.count({ where: { isActive: true, stock: { lte: 0 } } }),
          prisma.product.count({
            where: {
              isActive: true,
              fitmentType: { not: "universal" },
              fitments: { none: {} },
            },
          }),
          prisma.product.count({ where: { fitmentType: "universal", isActive: true } }),
          Promise.all([
            prisma.order.count(),
            prisma.product.count(),
            prisma.user.count(),
            prisma.review.count(),
            prisma.callbackRequest.count({ where: { status: { in: ["new", "in_progress"] } } }),
          ]),
          prisma.product.findMany({
            where: { isActive: true, stock: { gt: 0, lte: 3 } },
            orderBy: { stock: "asc" },
            take: 5,
            select: { id: true, name: true, stock: true, sku: true },
          }),
        ]);

        const statusCounts = new Map<string, number>(ordersByStatus.map((row) => [row.status, row._count._all]));
        const revenue = revenueOrders.reduce((sum, order) => sum + order.total, 0);
        const [ordersTotal, productsTotal, usersTotal, reviewsTotal, callbacksActive] = counts;

        // Выручка по дням за 30 дней.
        const buckets = new Map<string, { value: number; orders: number }>();
        for (let index = 29; index >= 0; index -= 1) {
          const date = new Date(now.getTime() - index * DAY_MS);
          buckets.set(dayKey(date), { value: 0, orders: 0 });
        }
        for (const order of revenueOrders) {
          const key = dayKey(order.createdAt);
          const bucket = buckets.get(key);
          if (!bucket) continue;
          bucket.value += order.total;
          bucket.orders += 1;
        }
        const chartData = Array.from(buckets.entries()).map(([label, bucket]) => ({
          label,
          value: bucket.value,
          hint: `${bucket.orders} заказ(ов)`,
          highlight: bucket.value > 0,
        }));

        const last7 = chartData.slice(-7).reduce((sum, point) => sum + point.value, 0);
        const prev7 = chartData.slice(-14, -7).reduce((sum, point) => sum + point.value, 0);
        const trend = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;

        const statusBars = Object.entries(ORDER_STATUSES).map(([status, label]) => ({
          label,
          value: statusCounts.get(status) ?? 0,
          href: `/admin/orders?status=${status}`,
          tone:
            status === "done"
              ? "bg-emerald-500"
              : status === "canceled"
                ? "bg-ink-300"
                : status === "new"
                  ? "bg-brand-500"
                  : "bg-blue-400",
        }));

        return (
          <div className="space-y-6">
            <AdminPageHeader
              title={`Добрый день, ${user.name.split(" ")[0] || user.name}!`}
              description="Ключевые показатели магазина, свежие заказы и заявки."
              actions={
                <>
                  <Link
                    href="/admin/orders?status=new"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    <ShoppingCart className="size-4" aria-hidden />
                    Новые заказы
                  </Link>
                  <Link
                    href="/admin/products/new"
                    className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    <Package className="size-4" aria-hidden />
                    Добавить товар
                  </Link>
                </>
              }
            />

            <StatGrid>
              <StatCard
                label="Новые заказы"
                value={statusCounts.get("new") ?? 0}
                hint={`Всего заказов: ${ordersTotal}`}
                href="/admin/orders?status=new"
                tone="brand"
                icon={<ShoppingCart className="size-5" />}
              />
              <StatCard
                label="Выручка за 30 дней"
                value={formatPrice(revenue)}
                hint={
                  trend === null
                    ? "Не отменённые заказы"
                    : `${trend >= 0 ? "+" : ""}${trend}% к предыдущей неделе`
                }
                tone="success"
                icon={<BadgeRussianRuble className="size-5" />}
              />
              <StatCard
                label="Новые заявки"
                value={callbacksNew}
                hint={`В работе: ${callbacksActive}`}
                href="/admin/callbacks?status=new"
                tone={callbacksNew > 0 ? "warning" : "default"}
                icon={<PhoneCall className="size-5" />}
              />
              <StatCard
                label="Отзывы на модерации"
                value={reviewsPending}
                hint={`Всего отзывов: ${reviewsTotal}`}
                href="/admin/reviews?status=pending"
                tone={reviewsPending > 0 ? "warning" : "default"}
                icon={<MessageSquareWarning className="size-5" />}
              />
              <StatCard
                label="Товары без наличия"
                value={outOfStock}
                hint="Активные позиции с нулевым остатком"
                href="/admin/products?stock=out"
                tone={outOfStock > 0 ? "danger" : "default"}
                icon={<CircleAlert className="size-5" />}
              />
              <StatCard
                label="Товары без совместимости"
                value={withoutFitment}
                hint="Не привязаны ни к одному авто"
                href="/admin/products?fitment=none"
                tone={withoutFitment > 0 ? "warning" : "default"}
                icon={<Boxes className="size-5" />}
              />
              <StatCard
                label="Всего товаров"
                value={productsTotal}
                hint={`Универсальных: ${universalProducts}`}
                href="/admin/products"
                icon={<Package className="size-5" />}
              />
              <StatCard
                label="Пользователи"
                value={usersTotal}
                hint="Покупатели и сотрудники"
                href="/admin/users"
                icon={<Users className="size-5" />}
              />
            </StatGrid>

            <div className="grid gap-4 xl:grid-cols-3">
              <AdminCard
                className="xl:col-span-2"
                title="Выручка по дням за 30 дней"
                description="Сумма заказов, кроме отменённых"
                actions={
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <TrendingUp className="size-4" aria-hidden />
                    {formatPrice(last7)} за 7 дней
                  </span>
                }
              >
                <BarChart data={chartData} valueFormatter={(value) => formatPrice(value)} />
              </AdminCard>

              <AdminCard title="Заказы по статусам">
                <BarList items={statusBars} />
              </AdminCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <AdminCard
                className="xl:col-span-2"
                title="Последние заказы"
                padded={false}
                actions={
                  <Link href="/admin/orders" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                    Все заказы →
                  </Link>
                }
              >
                {recentOrders.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-ink-400">Заказов пока нет</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                          <th className="px-5 py-2 text-left font-semibold">Номер</th>
                          <th className="px-3 py-2 text-left font-semibold">Клиент</th>
                          <th className="px-3 py-2 text-left font-semibold">Статус</th>
                          <th className="px-3 py-2 text-right font-semibold">Сумма</th>
                          <th className="px-5 py-2 text-right font-semibold">Дата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                            <td className="px-5 py-2.5">
                              <Link href={`/admin/orders/${order.id}`} className="font-semibold text-brand-700 hover:text-brand-800">
                                {order.number}
                              </Link>
                              <span className="ml-2 text-xs text-ink-400">{order._count.items} поз.</span>
                            </td>
                            <td className="px-3 py-2.5 text-ink-700">{order.customerName}</td>
                            <td className="px-3 py-2.5">
                              <OrderStatusBadge status={order.status} />
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-ink-900">{formatPrice(order.total)}</td>
                            <td className="px-5 py-2.5 text-right text-xs text-ink-500">{formatDate(order.createdAt, true)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AdminCard>

              <div className="space-y-4">
                <AdminCard
                  title="Последние заявки"
                  padded={false}
                  actions={
                    <Link href="/admin/callbacks" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                      Все →
                    </Link>
                  }
                >
                  {recentCallbacks.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-ink-400">Заявок нет</p>
                  ) : (
                    <ul className="divide-y divide-ink-100">
                      {recentCallbacks.map((callback) => (
                        <li key={callback.id} className="px-5 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              href={`/admin/callbacks?status=${callback.status}`}
                              className="text-sm font-semibold text-ink-900 hover:text-brand-700"
                            >
                              {callback.name}
                            </Link>
                            <span className="text-xs text-ink-400">{formatDate(callback.createdAt, true)}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-500">{callback.phone}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </AdminCard>

                <AdminCard title="Отзывы на модерации" padded={false}>
                  {recentReviews.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-ink-400">Отзывов на модерации нет</p>
                  ) : (
                    <ul className="divide-y divide-ink-100">
                      {recentReviews.map((review) => (
                        <li key={review.id} className="px-5 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900">
                              <Star className="size-3.5 text-amber-500" aria-hidden />
                              {review.rating}
                              <span className="font-normal text-ink-500">· {review.authorName}</span>
                            </span>
                            <ReviewStatusBadge status="pending" />
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-ink-500">{review.text}</p>
                          <Link
                            href={`/admin/reviews?status=pending`}
                            className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:text-brand-800"
                          >
                            {review.product.name} →
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </AdminCard>

                {lowStock.length > 0 && (
                  <AdminCard title="Заканчивается на складе" padded={false}>
                    <ul className="divide-y divide-ink-100">
                      {lowStock.map((product) => (
                        <li key={product.id} className="flex items-center justify-between gap-2 px-5 py-2.5">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="truncate text-sm text-ink-700 hover:text-brand-700"
                          >
                            {product.name}
                          </Link>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700">
                            <PackageCheck className="size-3.5" aria-hidden />
                            {product.stock} шт
                          </span>
                        </li>
                      ))}
                    </ul>
                  </AdminCard>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
