import "server-only";
import type { City } from "@prisma/client";
import prisma from "@/lib/prisma";
import { deliveryCost } from "@/lib/cart";
import { getDefaultCity } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { DELIVERY_TYPES, type DeliveryType } from "@/lib/constants";
import { getCdekQuote, isCdekConfigured } from "./cdek";
import { getBoxberryQuote, isBoxberryConfigured } from "./boxberry";
import { getPostQuote, isPostConfigured } from "./post";
import { MOCK_TARIFF_NAMES, mockQuote } from "./mock";
import { DELIVERY_TYPE_META, providerFor, type DeliveryProvider, type DeliveryQuote, type DeliveryRequest } from "./types";
import type { ProviderQuoteOptions } from "./context";

export { DELIVERY_TYPE_META, providerFor } from "./types";
export type { DeliveryProvider, DeliveryQuote, DeliveryRequest } from "./types";

/**
 * Единая точка расчёта доставки.
 *
 * Порядок работы (сайт обязан работать без ключей интеграций):
 *  1) самовывоз — всегда 0 ₽;
 *  2) тариф из БД (`DeliveryTariff` по городу и провайдеру) — источник правды для цен,
 *     заданных менеджером;
 *  3) внешний API (СДЭК/Boxberry/Почта) — если заданы ключи и `DELIVERY_MOCK !== "true"`;
 *  4) моковые правила — если ничего из перечисленного не сработало.
 *
 * Порог бесплатной доставки применяется к любой доставке, кроме самовывоза
 * (`City.freeDeliveryFrom` → настройка `delivery.freeFrom`).
 */

export const MOCK_MODE = (): boolean => process.env.DELIVERY_MOCK === "true";

export function isDeliveryType(value: unknown): value is DeliveryType {
  return typeof value === "string" && value in DELIVERY_TYPES;
}

export function listDeliveryTypes(): { value: DeliveryType; label: string }[] {
  return (Object.keys(DELIVERY_TYPES) as DeliveryType[]).map((value) => ({
    value,
    label: DELIVERY_TYPES[value],
  }));
}

/** Доступен ли способ доставки для города (склад/курьер/ПВЗ). */
export function isDeliveryTypeAvailable(deliveryType: DeliveryType, city: City | null): boolean {
  if (!city) return true;
  if (deliveryType === "pickup") return city.pickupAvailable;
  return city.deliveryAvailable;
}

type TariffRow = {
  provider: string;
  name: string;
  price: number;
  minDays: number;
  maxDays: number;
  minOrderTotal: number | null;
  maxWeight: number | null;
};

/** Подбор тарифа из БД: сначала тариф города, затем общий. */
async function findTariff(
  cityId: string | null,
  provider: DeliveryProvider,
  weightGrams: number,
  subtotal: number,
): Promise<TariffRow | null> {
  try {
    const rows = await prisma.deliveryTariff.findMany({
      where: {
        isActive: true,
        provider,
        OR: [{ cityId }, { cityId: null }],
      },
      orderBy: [{ cityId: "desc" }, { sortOrder: "asc" }, { price: "asc" }],
    });

    const suitable = rows.find((row) => {
      if (row.maxWeight !== null && row.maxWeight !== undefined && weightGrams > row.maxWeight) return false;
      if (row.minOrderTotal !== null && row.minOrderTotal !== undefined && subtotal < row.minOrderTotal) return false;
      return true;
    });

    if (!suitable) return null;
    return {
      provider: suitable.provider,
      name: suitable.name,
      price: suitable.price,
      minDays: suitable.minDays,
      maxDays: suitable.maxDays,
      minOrderTotal: suitable.minOrderTotal,
      maxWeight: suitable.maxWeight,
    };
  } catch {
    // БД недоступна — работаем по моковым правилам
    return null;
  }
}

/** Код города во внешней системе (для СДЭК/Boxberry/Почты). */
async function externalCityCode(cityId: string | null, provider: DeliveryProvider): Promise<string | null> {
  if (!cityId || provider === "own" || provider === "pickup") return null;
  try {
    const point = await prisma.pickupPoint.findFirst({
      where: { cityId, provider, isActive: true },
      select: { code: true },
      orderBy: { code: "asc" },
    });
    return point?.code ?? null;
  } catch {
    return null;
  }
}

export async function calculateDelivery(request: DeliveryRequest): Promise<DeliveryQuote> {
  const deliveryType = isDeliveryType(request.deliveryType) ? request.deliveryType : "pickup";
  const provider = providerFor(deliveryType);
  const weightGrams = Math.max(0, Math.round(request.weightGrams || 0));
  const subtotal = Math.max(0, Math.round(request.subtotal || 0));

  let city: City | null = null;
  if (request.cityId) {
    try {
      city = await prisma.city.findFirst({ where: { id: request.cityId, isActive: true } });
    } catch {
      city = null;
    }
  }
  if (!city) {
    try {
      city = await getDefaultCity();
    } catch {
      city = null;
    }
  }

  // Самовывоз — всегда бесплатно, сроки не считаем.
  if (deliveryType === "pickup") {
    return {
      price: 0,
      daysMin: 0,
      daysMax: 0,
      provider: "pickup",
      tariffName: MOCK_TARIFF_NAMES.pickup,
      free: true,
    };
  }

  const settings = await getSettings().catch(() => ({}) as Record<string, string>);
  const settingsFreeFrom = Number(settings["delivery.freeFrom"] ?? "") || null;
  const freeFrom = city?.freeDeliveryFrom ?? settingsFreeFrom ?? null;

  const options: ProviderQuoteOptions = {
    ...request,
    deliveryType,
    weightGrams,
    subtotal,
    city,
    freeFrom,
    externalCityCode: await externalCityCode(city?.id ?? null, provider),
    declaredCost: subtotal,
  };

  // 1. Тариф из БД
  const tariff = await findTariff(city?.id ?? null, provider, weightGrams, subtotal);
  if (tariff) {
    const price = deliveryCost(subtotal, tariff.price, freeFrom);
    return {
      price,
      daysMin: tariff.minDays,
      daysMax: tariff.maxDays,
      provider,
      tariffName: tariff.name,
      free: price === 0,
    };
  }

  // 2. Внешний API провайдера
  try {
    const apiQuote =
      provider === "cdek"
        ? await getCdekQuote(options)
        : provider === "boxberry"
          ? await getBoxberryQuote(options)
          : provider === "post"
            ? await getPostQuote(options)
            : null;

    if (apiQuote) {
      const price = deliveryCost(subtotal, apiQuote.price, freeFrom);
      return { ...apiQuote, price, free: price === 0 };
    }
  } catch {
    // падаем в моковые правила ниже
  }

  // 3. Моковые правила
  return mockQuote(deliveryType, weightGrams, { city, subtotal, freeFrom });
}

/** Какие интеграции подключены — для отладочной страницы/логов. */
export function deliveryIntegrations(): { cdek: boolean; boxberry: boolean; post: boolean; mock: boolean } {
  return {
    cdek: isCdekConfigured(),
    boxberry: isBoxberryConfigured(),
    post: isPostConfigured(),
    mock: MOCK_MODE(),
  };
}

/**
 * Стоимость установки в сервисе из настроек (`install.price`).
 * Значение по умолчанию — 4 990 ₽.
 */
export async function getInstallPrice(): Promise<number> {
  const settings = await getSettings().catch(() => ({}) as Record<string, string>);
  const price = Number(settings["install.price"] ?? "");
  return Number.isFinite(price) && price > 0 ? Math.round(price) : 499_000;
}
