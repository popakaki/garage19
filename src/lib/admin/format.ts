import {
  ATTRIBUTE_TYPES,
  BANNER_POSITIONS,
  CALLBACK_STATUSES,
  CALLBACK_TYPES,
  DELIVERY_PROVIDERS,
  DELIVERY_TYPES,
  FITMENT_TYPES,
  IMPORT_MODES,
  IMPORT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  REVIEW_STATUSES,
  USER_ROLES,
} from "@/lib/constants";
import { formatDate, formatPrice, formatWeight } from "@/lib/utils";

/**
 * Форматирование и подписи для админки.
 * Все строковые значения берутся из @/lib/constants — не хардкодим в разметке.
 */

export type LabelMap = Record<string, string>;

/** Безопасная подпись по словарю (в БД может оказаться неизвестное значение). */
export function labelOf(map: LabelMap, value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  return map[value] ?? value;
}

export function orderStatusLabel(value: string | null | undefined): string {
  return labelOf(ORDER_STATUSES, value);
}

export function paymentStatusLabel(value: string | null | undefined): string {
  return labelOf(PAYMENT_STATUSES, value);
}

export function paymentTypeLabel(value: string | null | undefined): string {
  return labelOf(PAYMENT_TYPES, value);
}

export function deliveryTypeLabel(value: string | null | undefined): string {
  return labelOf(DELIVERY_TYPES, value);
}

export function deliveryProviderLabel(value: string | null | undefined): string {
  return labelOf(DELIVERY_PROVIDERS, value);
}

export function reviewStatusLabel(value: string | null | undefined): string {
  return labelOf(REVIEW_STATUSES, value);
}

export function callbackStatusLabel(value: string | null | undefined): string {
  return labelOf(CALLBACK_STATUSES, value, "—");
}

export function callbackTypeLabel(value: string | null | undefined): string {
  return labelOf(CALLBACK_TYPES, value);
}

export function importStatusLabel(value: string | null | undefined): string {
  return labelOf(IMPORT_STATUSES, value);
}

export function importModeLabel(value: string | null | undefined): string {
  return labelOf(IMPORT_MODES, value);
}

export function userRoleLabel(value: string | null | undefined): string {
  return labelOf(USER_ROLES, value);
}

export function bannerPositionLabel(value: string | null | undefined): string {
  return labelOf(BANNER_POSITIONS, value);
}

export function fitmentTypeLabel(value: string | null | undefined): string {
  return labelOf(FITMENT_TYPES, value);
}

export function attributeTypeLabel(value: string | null | undefined): string {
  return labelOf(ATTRIBUTE_TYPES, value);
}

/** Цена в копейках → «4 990 ₽»; пусто → «—». */
export function money(kopecks: number | null | undefined): string {
  if (kopecks === null || kopecks === undefined) return "—";
  return formatPrice(kopecks);
}

/** Вес в граммах; для больших значений — килограммы. */
export function weight(grams: number | null | undefined): string {
  if (!grams) return "—";
  return formatWeight(grams);
}

/** Габариты в миллиметрах: «1900 × 800 × 400 мм». */
export function dimensions(
  lengthMm: number | null | undefined,
  widthMm: number | null | undefined,
  heightMm: number | null | undefined,
): string {
  if (!lengthMm && !widthMm && !heightMm) return "—";
  return `${lengthMm ?? "—"} × ${widthMm ?? "—"} × ${heightMm ?? "—"} мм`;
}

export function dateTime(date: Date | string | null | undefined): string {
  return formatDate(date, true);
}

export function dateOnly(date: Date | string | null | undefined): string {
  return formatDate(date, false);
}

/** 12.5 → «12,5 %». */
export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const rounded = Math.round(value * 100) / 100;
  return `${String(rounded).replace(".", ",")} %`;
}

/** «Вариант1, Вариант2» из Json-массива опций характеристики. */
export function optionsToString(options: unknown): string {
  if (!Array.isArray(options)) return "";
  return options.filter((item): item is string => typeof item === "string").join(", ");
}

export function parseOptions(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

/** «2024-05-01» или «2024-05-01T10:00» → Date (для datetime-local). */
export function parseDateInput(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Date → значение для input[type=datetime-local] в локальном времени. */
export function toDateTimeLocal(date: Date | null | undefined): string {
  if (!date) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

/** Date → значение для input[type=date]. */
export function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

/** Склонение: `pluralRu(5, "заказ", "заказа", "заказов")`. */
export function pluralRu(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/** Значение Json-поля статус-истории заказа. */
export type OrderStatusHistoryEntry = {
  status?: string;
  paymentStatus?: string;
  comment?: string;
  at?: string;
  by?: string;
};

/** Безопасный разбор statusHistory заказа (Json-поле). */
export function parseStatusHistory(value: unknown): OrderStatusHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is OrderStatusHistoryEntry => typeof item === "object" && item !== null);
}

/** Строка для аудита: «было → стало». */
export function changeSummary(before: unknown, after: unknown): string {
  return `${String(before ?? "—")} → ${String(after ?? "—")}`;
}
