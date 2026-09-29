import { ButtonLink, Card } from "@/components/ui";
import { clearCartAction } from "@/lib/actions/cart";
import { formatPrice, formatWeight, plural } from "@/lib/utils";
import { PromoForm } from "@/components/cart/PromoForm";
import { DELIVERY_TYPES, type DeliveryType } from "@/lib/constants";

/**
 * Итоги корзины: сумма, вес, скидка, предварительная доставка.
 * Все суммы приходят уже посчитанными на сервере.
 */
export function CartSummary({
  positions,
  subtotal,
  weight,
  discount,
  promo,
  promoHint,
  delivery,
}: {
  positions: number;
  subtotal: number;
  weight: number;
  discount: number;
  promo: { code: string; percent: number } | null;
  promoHint?: string | null;
  delivery?: {
    price: number;
    daysMin: number;
    daysMax: number;
    tariffName: string;
    deliveryType: DeliveryType;
    cityName: string;
    freeFrom: number | null;
  } | null;
}) {
  const deliveryPrice = delivery?.price ?? 0;
  const total = Math.max(0, subtotal - discount) + deliveryPrice;

  return (
    <Card className="overflow-hidden lg:sticky lg:top-24">
      <div className="border-b border-ink-100 px-5 py-4">
        <h2 className="text-base font-semibold text-ink-900">Итого</h2>
        <p className="mt-1 text-sm text-ink-500">
          {positions} {plural(positions, "товар", "товара", "товаров")}
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">Товары</span>
          <span className="font-semibold text-ink-900">{formatPrice(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-success-600">Скидка по промокоду {promo?.code}</span>
            <span className="font-semibold text-success-600">−{formatPrice(discount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">Вес заказа</span>
          <span className="font-medium text-ink-700">{formatWeight(weight)}</span>
        </div>

        {delivery && (
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="text-ink-500">
              {DELIVERY_TYPES[delivery.deliveryType]}
              <span className="block text-xs text-ink-400">
                {delivery.cityName}
                {delivery.daysMax > 0 ? ` · ${delivery.daysMin}–${delivery.daysMax} дн.` : ""}
              </span>
            </span>
            <span className="text-right font-semibold text-ink-900">
              {delivery.price === 0 ? <span className="text-success-600">бесплатно</span> : formatPrice(delivery.price)}
            </span>
          </div>
        )}

        {delivery?.freeFrom && delivery.price > 0 && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
            Бесплатная доставка от {formatPrice(delivery.freeFrom)} — до порога не хватает{" "}
            {formatPrice(Math.max(0, delivery.freeFrom - subtotal))}
          </p>
        )}

        <div className="border-t border-dashed border-ink-200 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink-700">К оплате</span>
            <span className="text-2xl font-bold text-ink-900">{formatPrice(total)}</span>
          </div>
        </div>

        <PromoForm applied={promo} hint={promoHint} />
      </div>

      <div className="space-y-2 border-t border-ink-100 bg-ink-50/60 px-5 py-4">
        <ButtonLink href="/checkout" size="lg" className="w-full">
          Оформить заказ
        </ButtonLink>
        <ButtonLink href="/catalog" variant="ghost" size="sm" className="w-full">
          Продолжить покупки
        </ButtonLink>
        <form action={clearCartAction}>
          <button
            type="submit"
            className="w-full rounded-xl px-3 py-2 text-xs font-medium text-ink-400 transition hover:text-danger-600"
          >
            Очистить корзину
          </button>
        </form>
      </div>
    </Card>
  );
}
