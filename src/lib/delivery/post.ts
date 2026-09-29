import { withTimeout } from "@/lib/utils";
import type { DeliveryQuote } from "./types";
import type { ProviderQuoteOptions } from "./context";
import { billableKg } from "./mock";

/**
 * Почта России — расчёт по API «Отправления» (tariff.pochta.ru).
 *
 * Авторизация: `RUSSIAN_POST_LOGIN` + `RUSSIAN_POST_PASSWORD` (Basic),
 * либо готовый `RUSSIAN_POST_TOKEN` (Bearer), который имеет приоритет.
 *
 * Код города-получателя берётся из `options.externalCityCode` (индекс/код из
 * справочника городов). Без ключей или при ошибке — `null` (фолбэк на тариф из БД).
 */

const API_URL = "https://tariff.pochta.ru/v2/calculate/tariff/delivery";
const REQUEST_TIMEOUT_MS = 4000;

/** Индекс склада отправителя (Москва) — переопределяется в .env. */
const DEFAULT_FROM_INDEX = "101000";

export function isPostConfigured(): boolean {
  return Boolean(
    process.env.RUSSIAN_POST_TOKEN || (process.env.RUSSIAN_POST_LOGIN && process.env.RUSSIAN_POST_PASSWORD),
  );
}

function authHeader(): Record<string, string> {
  if (process.env.RUSSIAN_POST_TOKEN) {
    return { Authorization: `Bearer ${process.env.RUSSIAN_POST_TOKEN}` };
  }
  const login = process.env.RUSSIAN_POST_LOGIN ?? "";
  const password = process.env.RUSSIAN_POST_PASSWORD ?? "";
  return { Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}` };
}

type PostTariffRow = {
  "srv"?: number;
  "days"?: number;
  "cost"?: number;
  "paynds"?: number;
  "error"?: { code?: number; msg?: string };
};

export async function getPostQuote(options: ProviderQuoteOptions): Promise<DeliveryQuote | null> {
  if (process.env.DELIVERY_MOCK === "true" || !isPostConfigured()) return null;

  const to = Number(String(options.externalCityCode ?? "").replace(/\D/g, ""));
  const from = Number(String(process.env.RUSSIAN_POST_FROM_INDEX ?? DEFAULT_FROM_INDEX).replace(/\D/g, ""));
  if (!Number.isFinite(to) || to <= 0) return null;

  const params = new URLSearchParams({
    object: "27030", // посылка «Онлайн» — базовый тариф для интернет-магазина
    from: String(Number.isFinite(from) && from > 0 ? from : Number(DEFAULT_FROM_INDEX)),
    to: String(to),
    weight: String(billableKg(options.weightGrams) * 1000),
    sumoc: String(Math.round((options.declaredCost ?? 0) / 100)),
    "is-sumoc": "true",
    "is-avia": "false",
    "is-vat": "false",
  });

  const fallback: DeliveryQuote | null = null;
  const request = fetch(`${API_URL}?${params.toString()}`, {
    headers: authHeader(),
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = (await response.json()) as { "transfers"?: PostTariffRow[] } & PostTariffRow;
      if (data.error) return null;
      const row = Array.isArray(data.transfers) ? data.transfers[0] : data;
      const cost = Number(row?.cost ?? Number.NaN);
      if (!Number.isFinite(cost) || cost <= 0) return null;

      const days = Number(row?.days ?? Number.NaN);
      return {
        price: Math.round(cost * 100),
        daysMin: Number.isFinite(days) ? Math.max(2, Math.round(days) - 1) : 5,
        daysMax: Number.isFinite(days) ? Math.max(3, Math.round(days) + 1) : 14,
        provider: "post" as const,
        tariffName: "Почта России — посылка",
        free: false,
      } satisfies DeliveryQuote;
    })
    .catch(() => null);

  return withTimeout(request, REQUEST_TIMEOUT_MS, fallback);
}
