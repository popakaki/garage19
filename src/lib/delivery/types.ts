import type { DeliveryType } from "@/lib/constants";

/**
 * Общие типы модуля доставки.
 * Файл без "server-only": типы используются и клиентскими компонентами
 * (динамический расчёт стоимости на оформлении заказа).
 */

export type DeliveryProvider = "pickup" | "cdek" | "boxberry" | "post" | "own";

export type DeliveryQuote = {
  /** Стоимость доставки в копейках. */
  price: number;
  daysMin: number;
  daysMax: number;
  provider: DeliveryProvider;
  /** Человекочитаемое название тарифа, например «СДЭК — ПВЗ, до 5 кг». */
  tariffName: string;
  /** true — доставка бесплатна (порог бесплатной доставки или нулевой тариф). */
  free: boolean;
};

export type DeliveryRequest = {
  cityId?: string | null;
  deliveryType: DeliveryType;
  /** Вес заказа в граммах. */
  weightGrams: number;
  /** Стоимость товаров в копейках (для порога бесплатной доставки). */
  subtotal: number;
  /** Код пункта выдачи (СДЭК/Boxberry/Почта). */
  pickupPointCode?: string | null;
};

/** Внешний вид способа доставки: провайдер, необходимость ПВЗ/адреса. */
export const DELIVERY_TYPE_META: Record<
  DeliveryType,
  { provider: DeliveryProvider; needsPickupPoint: boolean; needsAddress: boolean; label: string }
> = {
  pickup: { provider: "pickup", needsPickupPoint: false, needsAddress: false, label: "Самовывоз со склада" },
  cdek_pvz: { provider: "cdek", needsPickupPoint: true, needsAddress: false, label: "СДЭК — пункт выдачи" },
  cdek_courier: { provider: "cdek", needsPickupPoint: false, needsAddress: true, label: "СДЭК — курьером" },
  boxberry_pvz: { provider: "boxberry", needsPickupPoint: true, needsAddress: false, label: "Boxberry — пункт выдачи" },
  post: { provider: "post", needsPickupPoint: true, needsAddress: false, label: "Почта России" },
  courier_local: { provider: "own", needsPickupPoint: false, needsAddress: true, label: "Курьер по городу" },
};

export function providerFor(deliveryType: DeliveryType): DeliveryProvider {
  return DELIVERY_TYPE_META[deliveryType].provider;
}
