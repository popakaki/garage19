import { withTimeout } from "@/lib/utils";
import type { DeliveryQuote } from "./types";
import type { ProviderQuoteOptions } from "./context";
import { billableKg } from "./mock";

/**
 * Boxberry — расчёт доставки через API (`/api/Orders/List`).
 * Авторизация: `BOXBERRY_TOKEN` (передаётся параметром `token`).
 *
 * Реальный API Boxberry работает с конкретными пунктами выдачи, поэтому расчёт
 * ведём по коду выбранного ПВЗ (`options.pickupPointCode`): получаем список
 * доступных услуг с ценой и сроком. Без токена или при ошибке — `null`
 * (фолбэк на тариф из БД/моковые правила).
 */

const TEST_URL = "https://api.boxberry.de/json.php";
const PROD_URL = "https://api.boxberry.ru/json.php";
const REQUEST_TIMEOUT_MS = 4000;

type DeliveryCostRow = {
  TotalPrice?: string | number;
  DeliveryPeriod?: string | number;
  Name?: string;
  Error?: string;
};

export function isBoxberryConfigured(): boolean {
  return Boolean(process.env.BOXBERRY_TOKEN);
}

function endpoint(): string {
  return process.env.BOXBERRY_TEST_MODE === "false" ? PROD_URL : TEST_URL;
}

export async function getBoxberryQuote(options: ProviderQuoteOptions): Promise<DeliveryQuote | null> {
  if (process.env.DELIVERY_MOCK === "true" || !isBoxberryConfigured()) return null;
  if (!options.pickupPointCode) return null;

  const target = options.city?.name ?? "";
  const params = new URLSearchParams({
    token: String(process.env.BOXBERRY_TOKEN),
    method: "DeliveryCosts",
    weight: String(billableKg(options.weightGrams) * 1000),
    target: target || options.pickupPointCode,
    ordersum: String(Math.round((options.declaredCost ?? 0) / 100)),
    paysum: "0",
    deliverysum: "0",
    zip: "0",
  });

  const fallback: DeliveryQuote | null = null;
  const request = fetch(`${endpoint()}?${params.toString()}`, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = (await response.json()) as DeliveryCostRow[] | DeliveryCostRow;
      const rows = Array.isArray(data) ? data : [data];
      const row = rows.find((item) => !item.Error && item.TotalPrice !== undefined);
      if (!row) return null;

      const price = Math.round(Number(row.TotalPrice ?? 0) * 100);
      if (!Number.isFinite(price) || price <= 0) return null;

      const days = Number(row.DeliveryPeriod ?? 0);
      return {
        price,
        daysMin: Number.isFinite(days) && days > 0 ? Math.max(1, Math.round(days) - 1) : 3,
        daysMax: Number.isFinite(days) && days > 0 ? Math.max(2, Math.round(days)) : 7,
        provider: "boxberry" as const,
        tariffName: row.Name ?? "Boxberry — пункт выдачи",
        free: false,
      } satisfies DeliveryQuote;
    })
    .catch(() => null);

  return withTimeout(request, REQUEST_TIMEOUT_MS, fallback);
}
