import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Склейка CSS-классов с приоритетом последних утилит Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 499000 → «4 990 ₽». Цены в проекте хранятся в копейках. */
export function formatPrice(kopecks: number | null | undefined, options?: { withCurrency?: boolean; from?: boolean }): string {
  const value = kopecks ?? 0;
  const rubles = value / 100;
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: rubles % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rubles);
  const prefix = options?.from ? "от " : "";
  return options?.withCurrency === false ? `${prefix}${formatted}` : `${prefix}${formatted} ₽`;
}

/** Разбор пользовательского ввода цены («4 990,50», «4990.5» → копейки). */
export function parsePriceToKopecks(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "number") return Math.round(input * 100);
  const normalized = input.replace(/\s|₽|руб\.?/gi, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

/** Копейки → строка для input[type=number] («4990» или «4990.5»). */
export function kopecksToInput(kopecks: number | null | undefined): string {
  if (kopecks === null || kopecks === undefined) return "";
  const rubles = kopecks / 100;
  return rubles % 1 === 0 ? String(rubles) : rubles.toFixed(2);
}

/** Транслитерация + slug. */
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};

export function slugify(input: string, fallback = "item"): string {
  const lower = (input || "").toLowerCase().trim();
  const translit = lower
    .split("")
    .map((char) => TRANSLIT[char] ?? char)
    .join("");
  const slug = translit
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return slug || fallback;
}

/** Уникальный slug с суффиксом. */
export function slugifyUnique(input: string, suffix?: string | number): string {
  const base = slugify(input);
  return suffix === undefined ? base : `${base}-${suffix}`;
}

/** 12 → «12 товаров», 1 → «1 товар». */
export function plural(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function pluralize(count: number, forms: [string, string, string]): string {
  return `${count} ${plural(count, forms[0], forms[1], forms[2])}`;
}

/** «12.05.2025». */
export function formatDate(date: Date | string | null | undefined, withTime = false): string {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(value);
}

/** «12 мая 2025». */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(value);
}

/** Год(ы) выпуска поколения: «2018–2021», «с 2018». */
export function formatYears(yearFrom?: number | null, yearTo?: number | null): string {
  if (!yearFrom && !yearTo) return "";
  if (yearFrom && yearTo) return `${yearFrom}–${yearTo}`;
  if (yearFrom) return `с ${yearFrom}`;
  return `до ${yearTo}`;
}

/** «2 ч 15 мин» из минут. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

/** Нормализация телефона для tel:-ссылок. */
export function phoneHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

/** Маска телефона «+7 (999) 123-45-67» по мере ввода. */
export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith("7")) digits = `7${digits}`;
  digits = digits.slice(0, 11);
  const parts = [
    "+7",
    digits.slice(1, 4),
    digits.slice(4, 7),
    digits.slice(7, 9),
    digits.slice(9, 11),
  ].filter(Boolean);
  let result = parts[0];
  if (parts[1]) result += ` (${parts[1]}`;
  if (parts[1] && parts[1].length === 3) result += ")";
  if (parts[2]) result += ` ${parts[2]}`;
  if (parts[3]) result += `-${parts[3]}`;
  if (parts[4]) result += `-${parts[4]}`;
  return result;
}

/** Проверка корректности телефона (11 цифр, начинается с 7). */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"));
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Скидка в процентах (0, если её нет). */
export function discountPercent(price: number, oldPrice?: number | null): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

/** Номер заказа вида G19-000123. */
export function formatOrderNumber(sequence: number): string {
  return `G19-${String(sequence).padStart(6, "0")}`;
}

/** Склонение цены/веса для карточек доставки. */
export function formatWeight(grams?: number | null): string {
  if (!grams) return "—";
  return grams >= 1000 ? `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} кг` : `${grams} г`;
}

export function formatDimensions(lengthMm?: number | null, widthMm?: number | null, heightMm?: number | null): string {
  if (!lengthMm || !widthMm || !heightMm) return "—";
  return `${lengthMm} × ${widthMm} × ${heightMm} мм`;
}

/** Безопасный парсинг целых чисел из query-параметров и форм. */
export function toInt(value: unknown, fallback?: number): number | undefined {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function toFloat(value: unknown, fallback?: number): number | undefined {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function toStr(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str === "" ? undefined : str;
}

export function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1" || value === 1;
}

/** Убираем пустые значения — удобно для where-условий Prisma. */
export function compactObject<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as Partial<T>;
}

/** Первое изображение товара или плейсхолдер. */
export function primaryImage(images?: { url: string; isPrimary?: boolean }[] | null): string | null {
  if (!images || images.length === 0) return null;
  return (images.find((image) => image.isPrimary) ?? images[0]).url;
}

export const PLACEHOLDER_IMAGE = "/images/placeholder.svg";

export function productImage(images?: { url: string; isPrimary?: boolean }[] | null): string {
  return primaryImage(images) ?? PLACEHOLDER_IMAGE;
}

/** Склонение «товар/товара/товаров» для счётчиков. */
export function productWord(count: number): string {
  return plural(count, "товар", "товара", "товаров");
}

/** Простой таймаут для промисов (используется в API доставки). */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Безопасный разбор JSON с фолбэком. */
export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Относительное время: «5 минут назад». */
export function timeAgo(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - value.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} ${plural(minutes, "минуту", "минуты", "минут")} назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${plural(hours, "час", "часа", "часов")} назад`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} ${plural(days, "день", "дня", "дней")} назад`;
  return formatDate(value);
}

/** Хлебные крошки для SEO-разметки. */
export function buildBreadcrumbs(items: { name: string; href?: string }[]) {
  return items;
}

/** Собирает query-строку, отбрасывая пустые параметры. */
export function buildQuery(params: Record<string, string | number | undefined | null | string[]>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)));
    } else {
      search.set(key, String(value));
    }
  }
  const result = search.toString();
  return result ? `?${result}` : "";
}

export function truncate(text: string, length = 120): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trimEnd()}…`;
}
