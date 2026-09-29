/**
 * Приведение «сырых» значений прайса к типам схемы Garage19.
 *
 * Правила проекта (docs/ARCHITECTURE.md): деньги — копейки, вес — граммы,
 * габариты — миллиметры. Функции модуля не обращаются к БД.
 */

import { slugify } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Цены
// ─────────────────────────────────────────────────────────────────────────────

export type ParsedPrice = {
  /** Значение в копейках. */
  kopecks: number;
  /** Явно ли в источнике указано, что это копейки. */
  wasKopecks: boolean;
};

/**
 * Разбирает цену из фида: «12 990,50 ₽», «12990.5», «12 990 руб», «129,90 коп».
 *
 * По умолчанию значение считается рублями — так устроены все реальные прайсы.
 * Копейки распознаются только при явном указании («коп», «коп.»).
 */
export function parsePrice(raw: string | undefined | null): ParsedPrice | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (text === "") return null;

  const isKopecks = /коп/i.test(text);
  const isThousandsSeparator = /[\s\u00a0]/.test(text);

  // Убираем всё, кроме цифр, разделителей и знака
  let cleaned = text
    .replace(/[^\d.,-]/g, "")
    .replace(/\s/g, "")
    .trim();
  if (cleaned === "" || cleaned === "-") return null;

  // Формат «12,990.50» (английский) или «12.990,50» (русский)
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // 12.990,50 → 12990.50
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // 12,990.50 → 12990.50
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    cleaned = cleaned.replace(",", ".");
  }

  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return null;

  void isThousandsSeparator;
  return {
    kopecks: Math.round(isKopecks ? value : value * 100),
    wasKopecks: isKopecks,
  };
}

/** Применяет наценку поставщика (в процентах) к закупочной цене в копейках. */
export function applyMargin(kopecks: number, marginPercent: number): number {
  if (!Number.isFinite(marginPercent) || marginPercent === 0) return kopecks;
  return Math.round(kopecks * (1 + marginPercent / 100));
}

// ─────────────────────────────────────────────────────────────────────────────
// Склад, вес, габариты
// ─────────────────────────────────────────────────────────────────────────────

/** «45», «В наличии 45 шт», «под заказ» → 45 / 0 / undefined. */
export function parseStock(raw: string | undefined | null): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const text = String(raw).trim().toLowerCase();
  if (text === "") return undefined;
  if (/^(нет|отсутствует|под заказ|preorder|out of stock|false|no)$/.test(text)) return 0;
  if (/^(в наличии|есть|true|yes|instock|in stock|да)$/.test(text)) return 1;
  const match = text.match(/-?\d+/);
  if (!match) return undefined;
  const value = Number.parseInt(match[0], 10);
  if (Number.isNaN(value)) return undefined;
  return Math.max(0, value);
}

/** Вес в граммах: «4,2 кг», «4200 г», «4.2» (кг по умолчанию для прайсов). */
export function parseWeight(raw: string | undefined | null): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const text = String(raw).trim().toLowerCase().replace(",", ".");
  if (text === "") return undefined;

  const value = Number.parseFloat(text.replace(/[^\d.]/g, ""));
  if (Number.isNaN(value)) return undefined;

  if (/кг|kg|килограмм/.test(text)) return Math.round(value * 1000);
  if (/г\b|гр|gram|\bg\b/.test(text)) return Math.round(value);
  // Без единиц: значения больше 100 считаем граммами, иначе килограммами
  return value > 100 ? Math.round(value) : Math.round(value * 1000);
}

/** Линейный размер в миллиметрах: «1520 мм», «152 см», «1.52 м», «152». */
export function parseLength(raw: string | undefined | null): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const text = String(raw).trim().toLowerCase().replace(",", ".");
  if (text === "") return undefined;

  const value = Number.parseFloat(text.replace(/[^\d.]/g, ""));
  if (Number.isNaN(value)) return undefined;

  if (/мм|mm/.test(text)) return Math.round(value);
  if (/см|cm/.test(text)) return Math.round(value * 10);
  if (/м\b|m\b|метр/.test(text) && !/мм|mm|см|cm/.test(text)) return Math.round(value * 1000);
  // Без единиц: до 100 считаем сантиметрами, иначе миллиметрами
  return value <= 100 ? Math.round(value * 10) : Math.round(value);
}

/** Объём в литрах: «450 л», «0.45 м3», «450». */
export function parseVolume(raw: string | undefined | null): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const text = String(raw).trim().toLowerCase().replace(",", ".");
  if (text === "") return undefined;

  const value = Number.parseFloat(text.replace(/[^\d.]/g, ""));
  if (Number.isNaN(value)) return undefined;

  if (/м3|m3|куб/.test(text)) return Math.round(value * 1000);
  if (/мл|ml/.test(text)) return Math.round(value / 1000);
  return Math.round(value);
}

/** «36», «36 мес», «3 года», «пожизненная» → месяцы. */
export function parseWarrantyMonths(raw: string | undefined | null): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const text = String(raw).trim().toLowerCase().replace(",", ".");
  if (text === "") return undefined;

  const value = Number.parseFloat(text.replace(/[^\d.]/g, ""));
  if (Number.isNaN(value)) return undefined;

  if (/год|лет|year/.test(text)) return Math.round(value * 12);
  if (/мес|month/.test(text)) return Math.round(value);
  if (/пожизн|life/.test(text)) return 120;
  return Math.round(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Логические значения и справочные значения
// ─────────────────────────────────────────────────────────────────────────────

const TRUE_VALUES = new Set(["true", "1", "да", "есть", "yes", "y", "+", "в комплекте", "включен", "включён"]);
const FALSE_VALUES = new Set(["false", "0", "нет", "no", "n", "-", "отсутствует", "не входит", "без замка"]);

export function parseBool(raw: string | undefined | null): boolean | undefined {
  if (raw === null || raw === undefined) return undefined;
  const text = String(raw).trim().toLowerCase();
  if (text === "") return undefined;
  if (TRUE_VALUES.has(text)) return true;
  if (FALSE_VALUES.has(text)) return false;
  if (/^(требуется|нужен|есть вырез)/.test(text)) return true;
  if (/^(не требуется|без выреза|нет)/.test(text)) return false;
  return undefined;
}

/** Значения поля «Место установки» — приводим к словарю схемы. */
const MOUNT_PLACE_MAP: { pattern: RegExp; value: string }[] = [
  { pattern: /рейлинг/i, value: "рейлинги" },
  { pattern: /интегрированн\w* рейлинг/i, value: "интегрированные рейлинги" },
  { pattern: /штатн/i, value: "штатные места" },
  { pattern: /гладк/i, value: "гладкая крыша" },
  { pattern: /водосток|желоб/i, value: "водосточный желоб" },
  { pattern: /фаркоп|шар\b|тсу/i, value: "фаркоп" },
  { pattern: /задн\w* двер|дверь багажника|багажник.*двер/i, value: "задняя дверь" },
];

export function normalizeMountPlace(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  for (const item of MOUNT_PLACE_MAP) if (item.pattern.test(raw)) return item.value;
  return undefined;
}

/** Значения поля «Материал» — приводим к словарю схемы. */
export function normalizeMaterial(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const text = raw.toLowerCase();
  if (/алюмин|aluminium|aluminum|al\b/.test(text)) return "алюминий";
  if (/стал|steel|нержав/.test(text)) return "сталь";
  if (/abs|пластик|plastic/.test(text)) return "ABS-пластик";
  if (/комбинир|композит|composite/.test(text)) return "комбинированный";
  return undefined;
}

/** Значения поля «Профиль» — приводим к словарю схемы. */
export function normalizeProfile(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const text = raw.toLowerCase();
  if (/wingbar|крыл|аэродинам|aerodynamic/.test(text)) {
    return /wingbar|крыл/.test(text) ? "WingBar" : "аэродинамический";
  }
  if (/прямоугол|square|box/.test(text)) return "прямоугольный";
  if (/овал|oval/.test(text)) return "овальный";
  return undefined;
}

/** Тип крюка ТСУ. */
export function normalizeHookType(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const text = raw.toLowerCase();
  if (/быстросъёмн|быстросъемн/.test(text)) return "быстросъёмный с замком";
  if (/вертикальн/.test(text)) return "вертикальный съёмный";
  if (/фланц/.test(text)) return "фланцевый";
  if (/съёмн|съемн|removable|detachable/.test(text)) return "съёмный";
  if (/несъёмн|несъемн|fixed/.test(text)) return "несъёмный";
  return undefined;
}

/** Тип разъёма электрики. */
export function normalizePlugType(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const text = raw.toLowerCase().replace(/\s/g, "");
  if (/13.?7|13→7/.test(text)) return "13→7";
  if (/7.?13/.test(text)) return "13→7";
  if (/13/.test(text)) return "13-pin";
  if (/7/.test(text)) return "7-pin";
  if (/usb/.test(text)) return "USB";
  if (/универсал/.test(text)) return "универсальный";
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Slug'и и SKU
// ─────────────────────────────────────────────────────────────────────────────

/** Slug товара: транслит русского названия (см. slugify из @/lib/utils). */
export function buildProductSlug(name: string, sku?: string): string {
  const base = slugify(name, "tovar");
  if (!sku) return base.slice(0, 80);
  const suffix = slugify(sku, "");
  if (!suffix) return base.slice(0, 80);
  const combined = `${base}-${suffix}`.slice(0, 90);
  return combined.replace(/-+$/, "");
}

/** SKU по умолчанию, если в прайсе он не указан: из внешнего id поставщика. */
export function buildSku(externalId: string | undefined, supplierSlug: string | undefined, row: number): string {
  const base = externalId && externalId.trim() !== "" ? externalId.trim() : `ROW-${row}`;
  const prefix = supplierSlug ? `${supplierSlug.toUpperCase()}-` : "IMP-";
  return `${prefix}${base}`.slice(0, 60);
}

/** Короткое описание из HTML-описания (первые ~200 символов без тегов). */
export function buildShortDescription(description: string | undefined, fallbackName: string): string {
  if (!description) return fallbackName.slice(0, 200);
  const plain = description
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= 200) return plain || fallbackName.slice(0, 200);
  return `${plain.slice(0, 197).trimEnd()}...`;
}

/** Описание в HTML для карточки: абзацы из текста, если пришёл plain text. */
export function buildDescription(description: string | undefined, name: string): string {
  if (!description || description.trim() === "") {
    return `<p>${name}</p><p>Характеристики и совместимость уточняйте у менеджера: подберём крепление под ваш автомобиль.</p>`;
  }
  if (/<[a-z][\s\S]*>/i.test(description)) return description.trim();
  const paragraphs = description
    .split(/\n{2,}|\r\n\r\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
}

/** Безопасное имя файла изображения из URL. */
export function imageFileName(url: string): string {
  const clean = url.split("?")[0].split("#")[0];
  const parts = clean.split("/");
  return parts[parts.length - 1] || "image";
}
