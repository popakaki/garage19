import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Package, Phone, User } from "lucide-react";
import prisma from "@/lib/prisma";
import { DELIVERY_TYPES, PAYMENT_TYPES } from "@/lib/constants";
import { formatDate, formatPrice, phoneHref } from "@/lib/utils";
import { parseStatusHistory } from "@/lib/admin/format";
import { getRecentAudit } from "@/lib/admin/audit";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { OrderStatusBadge, PaymentStatusBadge, StatusBadge } from "@/components/admin/badges";
import { OrderDetailsForm, OrderStatusForms, PrintOrderButton } from "@/components/admin/order-forms";
import { deleteOrderAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Заказ" };

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPanelPage resource="orders">
      {async ({ user }) => {
        const order = await prisma.order.findUnique({
          where: { id },
          include: {
            items: true,
            city: { select: { id: true, name: true, phone: true, address: true } },
            user: { select: { id: true, email: true, name: true, role: true } },
            reviews: { select: { id: true, status: true, rating: true } },
          },
        });

        if (!order) notFound();

        const history = parseStatusHistory(order.statusHistory);
        const auditTrail = await getRecentAudit(8, order.id);

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={
                <span className="flex flex-wrap items-center gap-3">
                  Заказ {order.number}
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.paymentStatus} />
                </span>
              }
              description={`Оформлен ${formatDate(order.createdAt, true)}${order.source ? ` · источник: ${order.source}` : ""}`}
              actions={
                <div className="flex flex-wrap items-center gap-2" data-print-hidden>
                  <Link
                    href="/admin/orders"
                    className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    К списку
                  </Link>
                  <PrintOrderButton />
                  {user.role === "admin" && (
                    <ConfirmButton
                      action={deleteOrderAction}
                      id={order.id}
                      variant="button"
                      label="Удалить"
                      title="Удалить заказ?"
                      description="Заказ и его состав будут удалены безвозвратно."
                    />
                  )}
                </div>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <AdminCard title="Состав заказа" padded={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                          <th className="px-5 py-2.5 text-left font-semibold">Товар</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Цена</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Кол-во</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Сумма</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id} className="border-b border-ink-100 last:border-0">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                {item.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.image}
                                    alt=""
                                    className="size-10 shrink-0 rounded-lg border border-ink-200 object-cover"
                                  />
                                ) : (
                                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-400">
                                    <Package className="size-4" aria-hidden />
                                  </span>
                                )}
                                <div className="min-w-0">
                                  {item.productId ? (
                                    <Link
                                      href={`/admin/products/${item.productId}`}
                                      className="font-medium text-ink-800 hover:text-brand-700"
                                    >
                                      {item.name}
                                    </Link>
                                  ) : (
                                    <span className="font-medium text-ink-800">{item.name}</span>
                                  )}
                                  {item.sku && <p className="text-xs text-ink-400">Арт. {item.sku}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right text-ink-700">{formatPrice(item.price)}</td>
                            <td className="px-3 py-3 text-center text-ink-700">{item.qty}</td>
                            <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-ink-900">
                              {formatPrice(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-ink-100 px-5 py-4">
                    <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-ink-500">Товары</dt>
                        <dd className="font-medium text-ink-800">{formatPrice(order.itemsTotal)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-500">Доставка</dt>
                        <dd className="font-medium text-ink-800">{formatPrice(order.deliveryPrice)}</dd>
                      </div>
                      {order.installPrice ? (
                        <div className="flex justify-between">
                          <dt className="text-ink-500">Установка</dt>
                          <dd className="font-medium text-ink-800">{formatPrice(order.installPrice)}</dd>
                        </div>
                      ) : null}
                      {order.discount > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <dt>Скидка{order.promoCode ? ` (${order.promoCode})` : ""}</dt>
                          <dd className="font-medium">−{formatPrice(order.discount)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-ink-100 pt-2 text-base">
                        <dt className="font-semibold text-ink-900">Итого</dt>
                        <dd className="font-bold text-ink-900">{formatPrice(order.total)}</dd>
                      </div>
                    </dl>
                  </div>
                </AdminCard>

                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminCard title="Доставка">
                    <dl className="space-y-2.5 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Способ</dt>
                        <dd className="text-ink-800">
                          {DELIVERY_TYPES[order.deliveryType as keyof typeof DELIVERY_TYPES] ?? order.deliveryType}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Город</dt>
                        <dd className="text-ink-800">{order.cityName}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Адрес / ПВЗ</dt>
                        <dd className="flex items-start gap-1.5 text-ink-800">
                          <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden />
                          <span>
                            {order.deliveryAddress || order.pickupPointAddress || "—"}
                            {order.pickupPointCode ? ` (код ${order.pickupPointCode})` : ""}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Срок</dt>
                        <dd className="flex items-center gap-1.5 text-ink-800">
                          <Clock className="size-3.5 text-ink-400" aria-hidden />
                          {order.deliveryDaysMin ?? "—"}–{order.deliveryDaysMax ?? "—"} дн.
                        </dd>
                      </div>
                      {order.deliveryComment && (
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Комментарий</dt>
                          <dd className="text-ink-600">{order.deliveryComment}</dd>
                        </div>
                      )}
                      {order.installRequested && (
                        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          Запрошена установка{order.installAddress ? `: ${order.installAddress}` : ""}
                        </div>
                      )}
                    </dl>
                  </AdminCard>

                  <AdminCard title="Оплата и клиент">
                    <dl className="space-y-2.5 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Способ оплаты</dt>
                        <dd className="text-ink-800">
                          {PAYMENT_TYPES[order.paymentType as keyof typeof PAYMENT_TYPES] ?? order.paymentType}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Статус оплаты</dt>
                        <dd>
                          <PaymentStatusBadge status={order.paymentStatus} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Клиент</dt>
                        <dd className="text-ink-800">
                          <User className="mr-1 inline size-3.5 text-ink-400" aria-hidden />
                          {order.customerName}
                          {order.userId && (
                            <Link href={`/admin/users?q=${order.customerEmail ?? ""}`} className="ml-1 text-xs text-brand-700">
                              (зарегистрирован)
                            </Link>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Телефон</dt>
                        <dd>
                          <a href={phoneHref(order.customerPhone)} className="inline-flex items-center gap-1.5 text-brand-700">
                            <Phone className="size-3.5" aria-hidden />
                            {order.customerPhone}
                          </a>
                        </dd>
                      </div>
                      {order.customerEmail && (
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Email</dt>
                          <dd className="text-ink-800">{order.customerEmail}</dd>
                        </div>
                      )}
                      {order.carInfo && (
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Автомобиль</dt>
                          <dd className="text-ink-800">{order.carInfo}</dd>
                        </div>
                      )}
                    </dl>
                  </AdminCard>
                </div>

                <AdminCard title="Редактирование заказа" description="Контакты, доставка, комментарии">
                  <OrderDetailsForm
                    defaults={{
                      id: order.id,
                      customerName: order.customerName,
                      customerPhone: order.customerPhone,
                      customerEmail: order.customerEmail ?? "",
                      cityName: order.cityName,
                      deliveryType: order.deliveryType,
                      deliveryProvider: order.deliveryProvider ?? "",
                      deliveryAddress: order.deliveryAddress ?? "",
                      pickupPointAddress: order.pickupPointAddress ?? "",
                      paymentType: order.paymentType,
                      comment: order.comment ?? "",
                      managerComment: order.managerComment ?? "",
                      carInfo: order.carInfo ?? "",
                    }}
                    deliveryTypes={DELIVERY_TYPES}
                    paymentTypes={PAYMENT_TYPES}
                  />
                </AdminCard>
              </div>

              <div className="space-y-4">
                <AdminCard title="Статусы" className="no-print">
                  <OrderStatusForms orderId={order.id} status={order.status} paymentStatus={order.paymentStatus} />
                </AdminCard>

                <AdminCard title="История статусов" padded={false}>
                  {history.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-ink-400">Изменений ещё не было</p>
                  ) : (
                    <ol className="divide-y divide-ink-100">
                      {[...history].reverse().map((entry, index) => (
                        <li key={`${entry.at}-${index}`} className="px-5 py-3">
                          <div className="flex items-center justify-between gap-2">
                            {entry.status?.startsWith("payment:") ? (
                              <PaymentStatusBadge status={entry.status.replace("payment:", "")} />
                            ) : (
                              <OrderStatusBadge status={entry.status ?? "new"} />
                            )}
                            <span className="text-xs text-ink-400">{formatDate(entry.at, true)}</span>
                          </div>
                          {entry.comment && <p className="mt-1 text-xs text-ink-600">{entry.comment}</p>}
                          <p className="mt-1 text-[11px] text-ink-400">{entry.by}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </AdminCard>

                {order.managerComment && (
                  <AdminCard title="Комментарий менеджера">
                    <p className="text-sm text-ink-700">{order.managerComment}</p>
                  </AdminCard>
                )}

                <AdminCard title="Журнал изменений" padded={false} className="no-print">
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
                          <p className="mt-1 text-ink-500">{entry.user?.name ?? "система"}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </AdminCard>

                {order.reviews.length > 0 && (
                  <AdminCard title="Отзывы по заказу">
                    <ul className="space-y-2 text-sm">
                      {order.reviews.map((review) => (
                        <li key={review.id} className="flex items-center justify-between gap-2">
                          <span className="text-ink-700">Оценка {review.rating}</span>
                          <StatusBadge tone={review.status === "published" ? "success" : "warning"}>
                            {review.status}
                          </StatusBadge>
                        </li>
                      ))}
                    </ul>
                  </AdminCard>
                )}

                <AdminCard title="Печать" className="no-print">
                  <p className="mb-3 text-xs text-ink-500">
                    При печати скрываются панель управления и служебные блоки — остаётся состав заказа и данные
                    доставки.
                  </p>
                  <PrintOrderButton />
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
