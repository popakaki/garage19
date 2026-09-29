import { withTimeout } from "@/lib/utils";
import type { DeliveryQuote } from "./types";
import type { ProviderQuoteOptions } from "./context";
import { billableKg } from "./mock";

/**
 * СДЭК — расчёт стоимости доставки через API v2.
 *
 * Авторизация: OAuth (`/v2/oauth/token`), пара `CDEK_ACCOUNT` + `CDEK_SECURE_PASSWORD`.
 * Расчёт: `/v2/calculator/tariff` с кодами городов отправителя и получателя.
 *
 * Коды городов СДЭК: у города-получателя берём из сохранённых пунктов выдачи
 * (`PickupPoint.code` вида `MSK123` → город `MSK`), у города отправителя — из `.env`.
 * Если код определить не удалось или ключи не заданы — возвращаем `null`,
 * вызывающий код уходит на тарифы из БД/моковые правила (сайт не падает).
 */

const TEST_URL = "https://api.edu.cdek.ru/v2";
const PROD_URL = "https://api.cdek.ru/v2";

const TOKEN_TTL_MS = 25 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4000;

/** Коды городов СДЭК по умолчанию для складов Garage19. */
const DEFAULT_FROM_CITY_CODE = 44; // Москва

/** Тарифы СДЭК: 136 — пункт выдачи, 137 — до двери. */
const TARIFF_PVZ = 136;
const TARIFF_COURIER = 137;

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

export function isCdekConfigured(): boolean {
  return Boolean(process.env.CDEK_ACCOUNT && process.env.CDEK_SECURE_PASSWORD);
}

function baseUrl(): string {
  return process.env.CDEK_TEST_MODE === "false" ? PROD_URL : TEST_URL;
}

/**
 * Извлекает код города СДЭК из кода пункта выдачи.
 * «MSK123», «msk_123», «MSK-123» → «MSK».
 */
export function cityCodeFromPickupPoint(pointCode?: string | null): string | null {
  if (!pointCode) return null;
  const match = /^([A-Za-zА-Яа-я]{2,6})[-_]?\d+/.exec(pointCode.trim());
  if (match) return match[1].toUpperCase();
  const letters = pointCode.trim().replace(/[^A-Za-zА-Яа-я]/g, "");
  return letters ? letters.slice(0, 6).toUpperCase() : null;
}

async function getToken(): Promise<string | null> {
  if (!isCdekConfigured()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const fallback: string | null = null;
  const request = fetch(`${baseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: String(process.env.CDEK_ACCOUNT),
      client_secret: String(process.env.CDEK_SECURE_PASSWORD),
    }),
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = (await response.json()) as { access_token?: string; expires_in?: number };
      if (!data.access_token) return null;
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + Math.min(TOKEN_TTL_MS, (data.expires_in ?? 3600) * 1000 - 60_000),
      };
      return cachedToken.token;
    })
    .catch(() => null);

  return withTimeout(request, REQUEST_TIMEOUT_MS, fallback);
}

type CalculatorResult = {
  price?: number;
  period_min?: number;
  period_max?: number;
  tariff_code?: number;
  errors?: { code?: string; message?: string }[];
};

export async function getCdekQuote(options: ProviderQuoteOptions): Promise<DeliveryQuote | null> {
  if (process.env.DELIVERY_MOCK === "true" || !isCdekConfigured()) return null;

  const token = await getToken();
  if (!token) return null;

  const fromCode = Number(process.env.CDEK_FROM_CITY_CODE ?? DEFAULT_FROM_CITY_CODE);
  const toCode = options.externalCityCode ? cityCodeFromPickupPoint(options.externalCityCode) : null;
  if (!toCode) return null;

  const courier = options.deliveryType === "cdek_courier";
  const fallback: DeliveryQuote | null = null;

  const body = {
    type: 1,
    date: new Date().toISOString(),
    currency: 1, // рубли
    lang: "rus",
    tariff_code: courier ? TARIFF_COURIER : TARIFF_PVZ,
    from_location: { code: Number.isFinite(fromCode) ? fromCode : DEFAULT_FROM_CITY_CODE },
    to_location: { code: toCode },
    packages: [
      {
        weight: billableKg(options.weightGrams) * 1000,
        ...(options.declaredCost ? { cost: Math.round(options.declaredCost / 100) } : {}),
      },
    ],
  };

  const request = fetch(`${baseUrl()}/calculator/tariff`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = (await response.json()) as CalculatorResult;
      if (data.errors?.length || typeof data.price !== "number") return null;
      return {
        price: Math.round(data.price * 100),
        daysMin: data.period_min ?? 2,
        daysMax: data.period_max ?? data.period_min ?? 5,
        provider: "cdek" as const,
        tariffName: courier ? "СДЭК — курьером до двери" : "СДЭК — пункт выдачи",
        free: false,
      } satisfies DeliveryQuote;
    })
    .catch(() => null);

  return withTimeout(request, REQUEST_TIMEOUT_MS, fallback);
}
