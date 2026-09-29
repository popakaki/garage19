import type { DeliveryType } from "@/lib/constants";
import type { DeliveryProvider, DeliveryQuote } from "./types";

/**
 * Моковые правила расчёта доставки.
 *
 * Используются, когда:
 *  1) `DELIVERY_MOCK=true` (ключи интеграций не заданы) — основной режим разработки;
 *  2) в БД нет подходящего тарифа `DeliveryTariff`;
 *  3) внешний API не ответил (таймаут/ошибка) — сайт обязан продолжить работу.
 *
 * Правила (в копейках):
 *  • самовывоз — всегда 0 ₽;
 *  • курьер по городу — 0 ₽ от порога бесплатной доставки, иначе фикс (по умолчанию 490 ₽);
 *  • СДЭК ПВЗ — базовый тариф + ставка за каждый полный килограмм (округление вверх);
 *  • СДЭК курьер — базовый тариф ПВЗ + надбавка «до двери»;
 *  • Boxberry ПВЗ — базовый тариф + ставка за кг;
 *  • Почта России — базовый тариф + ставка за кг, срок больше.
 */

export type MockRule = {
  basePrice: number;
  pricePerKg: number;
  minDays: number;
  maxDays: number;
  /** Дополнительные дни по городу (регион → +N дней). */
  cityExtraDays?: number;
};

export const MOCK_RULES: Record<DeliveryType, MockRule> = {
  pickup: { basePrice: 1_000, pricePerKg: 0, minDays: 0, maxDays: 0 },
  courier_local: { basePrice: 49_000, pricePerKg: 0, minDays: 0, maxDays: 1 },
  cdek_pvz: { basePrice: 39_000, pricePerKg: 90, minDays: 2, maxDays: 5 },
  cdek_courier: { basePrice: 49_000, pricePerKg: 100, minDays: 2, maxDays: 5 },
  boxberry_pvz: { basePrice: 35_000, pricePerKg: 95, minDays: 3, maxDays: 7 },
  post: { basePrice: 30_000, pricePerKg: 120, minDays: 5, maxDays: 14 },
};

export const MOCK_TARIFF_NAMES: Record<DeliveryType, string> = {
  pickup: "Самовывоз со склада",
  courier_local: "Курьер по городу",
  cdek_pvz: "СДЭК — пункт выдачи",
  cdek_courier: "СДЭК — курьером до двери",
  boxberry_pvz: "Boxberry — пункт выдачи",
  post: "Почта России — до востребования / ПВЗ",
};

/** Тариф «до двери» дороже ПВЗ на эту величину. */
const COURIER_SURCHARGE = 30_000;

export type MockCity = {
  /** Дней доставки по умолчанию из справочника городов (`City.deliveryDays`). */
  deliveryDays?: number | null;
  /** Порог бесплатной доставки в копейках (`City.freeDeliveryFrom`). */
  freeDeliveryFrom?: number | null;
  name?: string | null;
};

export function billableKg(weightGrams: number): number {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) return 1;
  // Габаритные товары: считаем минимум 1 кг и округляем вверх.
  return Math.max(1, Math.ceil(weightGrams / 1000));
}

/**
 * Правила по городу: сроки сдвигаются на `City.deliveryDays`,
 * порог бесплатной доставки берётся из города (или из настроек сайта на уровне страницы).
 */
export function mockQuote(
  deliveryType: DeliveryType,
  weightGrams: number,
  options?: { city?: MockCity | null; subtotal?: number; freeFrom?: number | null },
): DeliveryQuote {
  const rule = MOCK_RULES[deliveryType];
  const provider: DeliveryProvider =
    deliveryType === "pickup"
      ? "pickup"
      : deliveryType === "courier_local"
        ? "own"
        : deliveryType === "post"
          ? "post"
          : deliveryType.startsWith("boxberry")
            ? "boxberry"
            : "cdek";

  const kg = billableKg(weightGrams);
  const cityDays = Math.max(0, options?.city?.deliveryDays ?? 0);
  const extra = deliveryType === "pickup" || deliveryType === "courier_local" ? 0 : cityDays;

  let price = rule.basePrice + rule.pricePerKg * kg;
  if (deliveryType === "cdek_courier") price += COURIER_SURCHARGE;

  const freeFrom = options?.freeFrom ?? options?.city?.freeDeliveryFrom ?? null;
  const subtotal = options?.subtotal ?? 0;
  const free =
    deliveryType === "pickup" ||
    (freeFrom !== null && freeFrom !== undefined && freeFrom > 0 && subtotal >= freeFrom);

  if (free) price = 0;
  if (deliveryType === "pickup") price = 0;

  return {
    price,
    daysMin: rule.minDays + extra,
    daysMax: rule.maxDays + extra,
    provider,
    tariffName: MOCK_TARIFF_NAMES[deliveryType],
    free,
  };
}
