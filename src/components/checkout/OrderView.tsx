import Link from "next/link";
import { Badge, ButtonLink, Card, Price } from "@/components/ui";
import { RepeatOrderButton } from "@/components/account/RepeatOrderButton";
import {
  DELIVERY_PROVIDERS,
  DELIVERY_TYPES,
  ORDER_STATUSES,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
} from "@/lib/constants";
import { formatDate, formatPrice, productImage } from "@/lib/utils";
import { orderHistory } from "@/lib/actions/order";
import type { Order, OrderItem } from "@prisma/client";

/**
 * Подтверждение/детали заказа — общий вид для страницы заказа и личного кабинета.
 * Все суммы уже посчитаны сервером при создании заказа.
 */

export type OrderWithItems = Order & { items: OrderItem[] };

const PAYMENT_INSTRUCTIONS: Record<string, string[]> = {
  cash: ["Оплата наличными при получении.", "Курьер или пункт выдачи выдаст чек."],
  card_on_delivery: [
    "Оплата картой при получении.",
    "Терминал есть у курьера и в пункте выдачи.",
  ],
  card_online: [
    "После подтверждения заказа менеджер пришлёт ссылку на оплату.",
    "Онлайн-оплата картой: Мир, Visa, Mastercard.",
  ],
  invoice: [
    "Счёт на организацию выставим на указанный e-mail.",
    "Оплата по реквизитам, зачисление 1–2 рабочих дня.",
  ],
};

export function OrderView({
  order,
  created = false,
  compact = false,
}: {
  order: OrderWithItems;
  created?: boolean;
  compact?: boolean;
}) {
  const history = orderHistory(order.statusHistory);
  const statusLabel = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] ?? order.status;
  const statusClass = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] ?? "bg-ink-100 text-ink-700";
  const deliveryLabel = DELIVERY_TYPES[order.deliveryType as keyof typeof DELIVERY_TYPES] ?? order.deliveryType;
  const paymentLabel = PAYMENT_TYPES[order.paymentType as keyof typeof PAYMENT_TYPES] ?? order.paymentType;
  const providerLabel = order.deliveryProvider
    ? DELIVERY_PROVIDERS[order.deliveryProvider as keyof typeof DELIVERY_PROVIDERS] ?? order.deliveryProvider
    : null;
  const instructions = PAYMENT_INSTRUCTIONS[order.paymentType] ?? PAYMENT_INSTRUCTIONS.cash;

  return (
    <div className="space-y-6">
      {created && (
        <div className="rounded-2xl border border-success-500/30 bg-success-50 px-5 py-4">
          <p className="text-base font-semibold text-success-600">Заказ оформлен!</p>
          <p className="mt-1 text-sm text-emerald-900">
            Номер заказа <span className="font-bold">{order.number}</span>. Менеджер свяжется с вами в рабочее время
            для подтверждения. Сохраните номер — по нему можно проверить статус.
          </p>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-400">Заказ</p>
            <h2 className="text-2xl font-bold text-ink-900">{order.number}</h2>
            <p className="mt-1 text-sm text-ink-500">
              от {formatDate(order.createdAt, true)} · {order.items.length}{" "}
              {order.items.length === 1 ? "позиция" : "позиции"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
              {statusLabel}
            </span>
            <Badge variant={order.paymentStatus === "paid" ? "success" : "outline"}>
              {PAYMENT_STATUSES[order.paymentStatus as keyof typeof PAYMENT_STATUSES] ?? order.paymentStatus}
            </Badge>
          </div>
        </div>

        <ul className="divide-y divide-ink-100 px-5">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-4">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image ?? "/images/placeholder.svg"}
                  alt={item.name}
                  className="size-full object-contain p-1.5"
                />
              </div>
              <div className="min-w-0 flex-1">
                {item.slug ? (
                  <Link href={`/product/${item.slug}`} className="font-medium text-ink-900 hover:text-brand-700">
                    {item.name}
                  </Link>
                ) : (
                  <span className="font-medium text-ink-900">{item.name}</span>
                )}
                <p className="mt-0.5 text-xs text-ink-400">
                  {item.sku ? `Артикул: ${item.sku} · ` : ""}
                  {item.qty} × {formatPrice(item.price)}
                </p>
              </div>
              <p className="shrink-0 font-semibold text-ink-900">{formatPrice(item.total)}</p>
            </li>
          ))}
        </ul>
      </Card>

      <div className={compact ? "space-y-6" : "grid gap-6 lg:grid-cols-2"}>
        <Card className="px-5 py-4">
          <h3 className="text-sm font-semibold text-ink-900">Доставка</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Способ</dt>
              <dd className="text-right font-medium text-ink-800">
                {deliveryLabel}
                {providerLabel ? ` · ${providerLabel}` : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Город</dt>
              <dd className="text-right font-medium text-ink-800">{order.cityName}</dd>
            </div>
            {order.pickupPointAddress && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Пункт выдачи</dt>
                <dd className="max-w-[60%] text-right font-medium text-ink-800">
                  {order.pickupPointAddress}
                  {order.pickupPointCode ? ` (${order.pickupPointCode})` : ""}
                </dd>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Адрес</dt>
                <dd className="max-w-[60%] text-right font-medium text-ink-800">{order.deliveryAddress}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Срок</dt>
              <dd className="text-right font-medium text-ink-800">
                {order.deliveryDaysMax
                  ? `${order.deliveryDaysMin ?? 0}–${order.deliveryDaysMax} дн.`
                  : "уточнит менеджер"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Стоимость</dt>
              <dd className="text-right font-medium text-ink-800">
                {order.deliveryPrice === 0 ? "бесплатно" : formatPrice(order.deliveryPrice)}
              </dd>
            </div>
            {order.deliveryComment && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Комментарий</dt>
                <dd className="max-w-[60%] text-right text-ink-600">{order.deliveryComment}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="px-5 py-4">
          <h3 className="text-sm font-semibold text-ink-900">Оплата</h3>
          <p className="mt-2 text-sm font-medium text-ink-800">{paymentLabel}</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-500">
            {instructions.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>

          {order.installRequested && (
            <div className="mt-4 rounded-xl bg-brand-50 px-3 py-3 text-sm text-brand-900">
              <p className="font-semibold">Установка в сервисе</p>
              <p className="mt-1 text-xs">
                {order.installAddress ?? "адрес уточнит менеджер"} · {formatPrice(order.installPrice ?? 0)}
              </p>
              <p className="mt-1 text-xs">Записаться на удобное время можно на странице «Установка».</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="px-5 py-4">
          <h3 className="text-sm font-semibold text-ink-900">История заказа</h3>
          <ol className="mt-3 space-y-3">
            {(history.length > 0 ? history : [{ status: order.status, at: order.createdAt.toISOString() }]).map(
              (entry, index) => (
                <li key={`${entry.status}-${index}`} className="flex gap-3">
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-ink-800">
                      {ORDER_STATUSES[entry.status as keyof typeof ORDER_STATUSES] ?? entry.status}
                    </p>
                    <p className="text-xs text-ink-400">
                      {formatDate(entry.at, true)}
                      {entry.comment ? ` · ${entry.comment}` : ""}
                    </p>
                  </div>
                </li>
              ),
            )}
          </ol>
        </Card>

        <Card className="h-fit px-5 py-4">
          <h3 className="text-sm font-semibold text-ink-900">Суммы</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Товары</dt>
              <dd className="font-medium text-ink-800">{formatPrice(order.itemsTotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-success-600">Скидка {order.promoCode ?? ""}</dt>
                <dd className="font-medium text-success-600">−{formatPrice(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500">Доставка</dt>
              <dd className="font-medium text-ink-800">
                {order.deliveryPrice === 0 ? "бесплатно" : formatPrice(order.deliveryPrice)}
              </dd>
            </div>
            {order.installRequested && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Установка</dt>
                <dd className="font-medium text-ink-800">{formatPrice(order.installPrice ?? 0)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-dashed border-ink-200 pt-3">
              <dt className="font-semibold text-ink-700">Итого</dt>
              <dd className="text-2xl font-bold text-ink-900">{formatPrice(order.total)}</dd>
            </div>
          </dl>

          <div className="mt-4 space-y-2">
            <RepeatOrderButton orderId={order.id} className="w-full" />
            <ButtonLink href="/install" variant="outline" size="sm" className="w-full">
              Записаться на установку
            </ButtonLink>
            <ButtonLink href="/catalog" variant="ghost" size="sm" className="w-full">
              Продолжить покупки
            </ButtonLink>
          </div>
        </Card>
      </div>

      <Card className="px-5 py-4">
        <h3 className="text-sm font-semibold text-ink-900">Получатель</h3>
        <div className="mt-2 grid gap-2 text-sm text-ink-600 sm:grid-cols-3">
          <p>{order.customerName}</p>
          <p>{order.customerPhone}</p>
          <p>{order.customerEmail ?? "—"}</p>
        </div>
        {order.carInfo && <p className="mt-2 text-sm text-ink-500">Автомобиль: {order.carInfo}</p>}
        {order.comment && (
          <p className="mt-2 whitespace-pre-line text-sm text-ink-500">Комментарий: {order.comment}</p>
        )}
      </Card>
    </div>
  );
}

/** Компактная строка заказа для списков в личном кабинете. */
export function OrderRow({
  order,
}: {
  order: { number: string; createdAt: Date; status: string; total: number; itemsTotal: number; items: { name: string }[] };
}) {
  const statusClass = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] ?? "bg-ink-100 text-ink-700";
  return (
    <Link
      href={`/account/orders/${order.number}`}
      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-ink-50/60"
    >
      <div className="min-w-0">
        <p className="font-semibold text-ink-900">№ {order.number}</p>
        <p className="mt-0.5 text-xs text-ink-400">
          {formatDate(order.createdAt)} · {order.items.length} поз. · {formatPrice(order.itemsTotal)}
        </p>
      </div>
      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
        {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] ?? order.status}
      </span>
      <Price price={order.total} size="sm" />
    </Link>
  );
}
