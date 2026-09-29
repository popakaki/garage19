import "server-only";
import { getSettings } from "@/lib/settings";

/**
 * Промокоды.
 *
 * Полноценная система скидок — задача админки, поэтому здесь простая схема
 * на настройках сайта (таблица `Setting`):
 *
 *   promo.code            — код промокода, например GARAGE10
 *   promo.discountPercent — размер скидки в процентах (1…50)
 *   promo.active          — "true" включает промокод
 *   promo.minTotal        — минимальная сумма заказа в копейках (необязательно)
 *   promo.description     — текст-описание для интерфейса (необязательно)
 *
 * Проверка выполняется только на сервере; скидка пересчитывается при создании заказа.
 */

export type PromoResult =
  | {
      ok: true;
      code: string;
      percent: number;
      discount: number;
      description: string;
    }
  | { ok: false; error: string };

export const PROMO_COOKIE = "g19_promo";

export function normalizePromoCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

/** Проверка кода и расчёт скидки для конкретной суммы заказа. */
export async function resolvePromo(rawCode: string, subtotal: number): Promise<PromoResult> {
  const code = normalizePromoCode(rawCode);
  if (!code) return { ok: false, error: "Введите промокод" };

  const settings = await getSettings();
  const configured = normalizePromoCode(settings["promo.code"] ?? "");
  const active = (settings["promo.active"] ?? "false").toLowerCase() === "true";
  const percent = Math.min(50, Math.max(0, Number(settings["promo.discountPercent"] ?? 0)));
  const minTotal = Number(settings["promo.minTotal"] ?? 0) || 0;

  if (!configured || !active || percent <= 0) {
    return { ok: false, error: "Промокоды сейчас не действуют" };
  }
  if (code !== configured) {
    return { ok: false, error: `Промокод «${rawCode.trim()}» не найден` };
  }
  if (minTotal > 0 && subtotal < minTotal) {
    return {
      ok: false,
      error: `Промокод действует от суммы ${(minTotal / 100).toLocaleString("ru-RU")} ₽`,
    };
  }

  return {
    ok: true,
    code: configured,
    percent,
    discount: Math.round((subtotal * percent) / 100),
    description: settings["promo.description"] || `Скидка ${percent}% по промокоду`,
  };
}

/** Активна ли акция (для подсказки на странице корзины). */
export async function promoHint(): Promise<string | null> {
  const settings = await getSettings();
  const active = (settings["promo.active"] ?? "false").toLowerCase() === "true";
  if (!active) return null;
  const percent = Number(settings["promo.discountPercent"] ?? 0);
  if (percent <= 0) return null;
  return settings["promo.description"] || `Скидка ${percent}% по промокоду`;
}
