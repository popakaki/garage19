import type { City } from "@prisma/client";
import type { DeliveryQuote, DeliveryRequest } from "./types";

/**
 * Контекст расчёта: данные города из БД, доступные всем провайдерам
 * (внешний код города, базовые сроки, порог бесплатной доставки).
 */
export type DeliveryContext = {
  city: City | null;
  /** Код города во внешней системе (СДЭК/Boxberry/Почта), если известен. */
  externalCityCode?: string | null;
  /** Порог бесплатной доставки в копейках (город или настройки сайта). */
  freeFrom?: number | null;
  /** Оформленный заказ: объявленная ценность для страховки. */
  declaredCost?: number;
};

export type ProviderQuoteOptions = DeliveryRequest & DeliveryContext;

/**
 * Каждый провайдер возвращает `DeliveryQuote` либо `null`,
 * если интеграция недоступна (нет ключей, таймаут, ошибка API) —
 * тогда вызывающий код использует тариф из БД или моковые правила.
 */
export type ProviderQuoteFn = (options: ProviderQuoteOptions) => Promise<DeliveryQuote | null>;
