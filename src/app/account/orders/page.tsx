import Link from "next/link";
import type { Metadata } from "next";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { RepeatOrderButton } from "@/components/account/RepeatOrderButton";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ORDER_STATUSES, ORDER_STATUS_COLORS } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";

/**
 * /account/orders — история заказов: статусы, суммы, повтор заказа.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Мои заказы — Garage19",
    description: "История заказов: статусы, состав, повтор заказа в один клик.",
    path: "/account/orders",
    noIndex: true,
  });
}

export default async function AccountOrdersPage() {
  const user = await requireUser();

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      number: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      total: true,
      itemsTotal: true,
      discount: true,
      cityName: true,
      deliveryType: true,
      items: { select: { name: true, qty: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Мои заказы</h1>
          <p className="mt-1 text-sm text-ink-500">Всего заказов: {orders.length}</p>
        </div>
        <ButtonLink href="/catalog" variant="outline" size="sm">
          В каталог
        </ButtonLink>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Заказов пока нет"
          description="Оформите первый заказ — багажник, автобокс, велокрепление или фаркоп под ваш автомобиль."
          action={<ButtonLink href="/catalog">Перейти в каталог</ButtonLink>}
        />
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const statusClass =
              ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] ?? "bg-ink-100 text-ink-700";
            const positions = order.items.reduce((sum, item) => sum + item.qty, 0);

            return (
              <li key={order.id}>
                <Card className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/account/orders/${order.number}`}
                          className="text-lg font-bold text-ink-900 hover:text-brand-700"
                        >
                          № {order.number}
                        </Link>
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                          {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] ?? order.status}
                        </span>
                        {order.paymentStatus !== "paid" && <Badge variant="outline">Ожидает оплаты</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-ink-400">
                        {formatDate(order.createdAt, true)} · {order.cityName} · {positions} поз.
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-ink-900">{formatPrice(order.total)}</p>
                      {order.discount > 0 && (
                        <p className="text-xs text-success-600">скидка {formatPrice(order.discount)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <ul className="min-w-0 flex-1 space-y-0.5 text-sm text-ink-600">
                      {order.items.slice(0, 3).map((item) => (
                        <li key={`${order.id}-${item.name}`} className="truncate">
                          {item.name} × {item.qty}
                        </li>
                      ))}
                      {order.items.length > 3 && (
                        <li className="text-xs text-ink-400">и ещё {order.items.length - 3} поз.</li>
                      )}
                    </ul>

                    <div className="flex flex-wrap items-center gap-2">
                      <ButtonLink href={`/account/orders/${order.number}`} variant="outline" size="sm">
                        Детали
                      </ButtonLink>
                      <RepeatOrderButton orderId={order.id} size="sm" />
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-ink-400">
        Заказ можно оформить и без регистрации — тогда статус смотрится на странице заказа по номеру и телефону.
      </p>
    </div>
  );
}
