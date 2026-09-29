/**
 * Генератор плейсхолдеров проекта Garage19.
 *
 * Запуск:  npx tsx prisma/data/tools/generate-assets.ts
 *
 * Что создаётся (идемпотентно, файлы перезаписываются):
 *   public/images/products/*.svg    — 800×600, силуэт категории + подпись
 *   public/images/banners/hero-*.svg — 1600×600, градиент + заголовок
 *   public/images/banners/promo-*.svg
 *   public/images/placeholder.svg   — фолбэк productImage()
 *   public/docs/*.pdf               — минимальные валидные одностраничные PDF
 *
 * Скрипт не требует БД и зависимостей — только fs/path из Node.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type PdfTextLine, buildPdfWithFont, readFontFile } from "./pdf-font";

// ─────────────────────────────────────────────────────────────────────────────
// Палитра проекта
// ─────────────────────────────────────────────────────────────────────────────

const BRAND = "#f97316"; // оранжевый акцент
const INK = "#1e2430"; // графит
const BG = "#f6f7f9"; // светлый фон
const WHITE = "#ffffff";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PRODUCTS_DIR = join(ROOT, "public", "images", "products");
const BANNERS_DIR = join(ROOT, "public", "images", "banners");
const IMAGES_DIR = join(ROOT, "public", "images");
const DOCS_DIR = join(ROOT, "public", "docs");

mkdirSync(PRODUCTS_DIR, { recursive: true });
mkdirSync(BANNERS_DIR, { recursive: true });
mkdirSync(IMAGES_DIR, { recursive: true });
mkdirSync(DOCS_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// Общие части SVG-плейсхолдера товара
// ─────────────────────────────────────────────────────────────────────────────

const W = 800;
const H = 600;

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Текстовая «шапка» плейсхолдера: бренд + подпись категории. */
function caption(category: string, variantLabel: string): string {
  return `
  <g font-family="'Segoe UI', Roboto, Arial, sans-serif">
    <text x="40" y="66" font-size="26" font-weight="700" fill="${INK}">Garage19</text>
    <text x="40" y="98" font-size="17" fill="#6b7280">${esc(category)}</text>
    <text x="760" y="66" text-anchor="end" font-size="17" font-weight="600" fill="${BRAND}">${esc(variantLabel)}</text>
  </g>`;
}

const FLOOR = `
  <line x1="90" y1="472" x2="710" y2="472" stroke="${INK}" stroke-opacity="0.18" stroke-width="3" stroke-linecap="round" />`;

/** Силуэты по типам товара (рисуются в системе 800×600). */
const SILHOUETTES: Record<string, string> = {
  // Багажник на крышу: две поперечины с упорами
  bagazhnik: `
    <g stroke="${INK}" stroke-width="9" stroke-linecap="round" fill="none">
      <path d="M170 300 H630" />
      <path d="M210 400 H590" />
    </g>
    <g fill="${BRAND}">
      <rect x="140" y="282" width="52" height="36" rx="9" />
      <rect x="608" y="282" width="52" height="36" rx="9" />
      <rect x="186" y="384" width="46" height="32" rx="8" />
      <rect x="568" y="384" width="46" height="32" rx="8" />
    </g>
    <g fill="${INK}" fill-opacity="0.85">
      <path d="M150 318 L196 318 L186 380 L176 380 Z" />
      <path d="M650 318 L604 318 L614 380 L624 380 Z" />
    </g>`,

  // Автобокс: обтекаемый короб с крышкой
  avtoboks: `
    <path d="M120 392 C120 320 190 268 300 262 H520 C640 268 700 320 700 392 C700 414 690 424 668 424 H152 C130 424 120 414 120 392 Z"
      fill="${INK}" fill-opacity="0.9" />
    <path d="M150 384 C150 330 206 292 300 288 H520 C618 292 672 330 672 384 Z" fill="${BRAND}" fill-opacity="0.9" />
    <path d="M262 288 H558" stroke="${WHITE}" stroke-opacity="0.35" stroke-width="6" stroke-linecap="round" />
    <rect x="352" y="352" width="96" height="26" rx="13" fill="${INK}" fill-opacity="0.75" />
    <circle cx="400" cy="365" r="7" fill="${BG}" />`,

  // Велокрепление: велосипед на рейке
  velokreplenie: `
    <g stroke="${INK}" stroke-width="10" fill="none" stroke-linecap="round">
      <circle cx="250" cy="392" r="66" />
      <circle cx="560" cy="392" r="66" />
      <path d="M250 392 L356 392 L428 306 L500 392 M356 392 L420 306 M420 306 L500 392 M470 286 H540" />
    </g>
    <g fill="${BRAND}">
      <rect x="150" y="452" width="500" height="22" rx="11" />
      <rect x="330" y="330" width="70" height="20" rx="10" />
    </g>
    <g stroke="${INK}" stroke-width="8" stroke-linecap="round">
      <path d="M196 440 L300 440 M510 440 L614 440" />
    </g>`,

  // Лыжное крепление: дуги с лыжами
  lyzhi: `
    <g fill="${INK}" fill-opacity="0.9">
      <rect x="200" y="330" width="420" height="20" rx="10" transform="rotate(-6 410 340)" />
      <rect x="200" y="360" width="420" height="20" rx="10" transform="rotate(-3 410 370)" />
      <rect x="200" y="390" width="420" height="20" rx="10" transform="rotate(0 410 400)" />
    </g>
    <g fill="${BRAND}">
      <rect x="150" y="300" width="70" height="130" rx="14" />
      <rect x="600" y="300" width="70" height="130" rx="14" />
    </g>
    <path d="M150 300 H670" stroke="${INK}" stroke-width="8" stroke-linecap="round" />`,

  // Фаркоп (ТСУ): балка с шаром
  farkop: `
    <g fill="${INK}">
      <rect x="130" y="290" width="540" height="34" rx="17" />
      <rect x="196" y="324" width="30" height="70" rx="10" />
      <rect x="560" y="324" width="30" height="70" rx="10" />
      <rect x="380" y="324" width="46" height="52" rx="8" />
    </g>
    <path d="M396 376 H410 V412" stroke="${INK}" stroke-width="18" stroke-linecap="round" />
    <circle cx="410" cy="436" r="30" fill="${BRAND}" />
    <circle cx="410" cy="436" r="12" fill="${INK}" fill-opacity="0.55" />`,

  // Корзина / платформа
  korzina: `
    <g stroke="${INK}" stroke-width="8" fill="none" stroke-linejoin="round">
      <path d="M170 320 H630 L606 428 H194 Z" />
      <path d="M240 320 V428 M320 320 V428 M400 320 V428 M480 320 V428 M560 320 V428" stroke-opacity="0.5" />
      <path d="M170 374 H630" stroke-opacity="0.5" />
    </g>
    <g fill="${BRAND}">
      <rect x="150" y="418" width="46" height="26" rx="8" />
      <rect x="604" y="418" width="46" height="26" rx="8" />
    </g>`,

  // Водное снаряжение: SUP/каяк
  voda: `
    <path d="M130 400 C260 330 540 330 670 400 C540 470 260 470 130 400 Z" fill="${INK}" fill-opacity="0.9" />
    <path d="M210 400 C300 356 500 356 590 400 C500 444 300 444 210 400 Z" fill="${BRAND}" />
    <g fill="${INK}">
      <rect x="366" y="252" width="18" height="126" rx="9" />
      <rect x="322" y="248" width="106" height="22" rx="11" />
    </g>
    <g stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-opacity="0.65">
      <path d="M240 442 q40 26 80 0 M480 442 q40 26 80 0" fill="none" />
    </g>`,

  // Аксессуар / крепёж
  aksessuar: `
    <g fill="${INK}">
      <rect x="300" y="286" width="200" height="42" rx="14" />
      <rect x="286" y="336" width="228" height="26" rx="10" fill-opacity="0.85" />
    </g>
    <g fill="${BRAND}">
      <circle cx="330" cy="386" r="32" />
      <circle cx="470" cy="386" r="32" />
    </g>
    <g stroke="${INK}" stroke-width="9" stroke-linecap="round" fill="none">
      <path d="M330 386 L400 344 L470 386" />
      <path d="M400 344 V300" />
    </g>`,

  // Электрика фаркопов
  elektrika: `
    <g fill="${INK}">
      <rect x="280" y="266" width="240" height="150" rx="24" />
      <rect x="238" y="302" width="42" height="52" rx="10" />
      <rect x="520" y="302" width="42" height="52" rx="10" />
    </g>
    <g fill="${BRAND}">
      <circle cx="360" cy="318" r="16" />
      <circle cx="440" cy="318" r="16" />
      <circle cx="360" cy="362" r="16" />
      <circle cx="440" cy="362" r="16" />
    </g>
    <path d="M400 416 V438 M400 438 q-52 0 -84 -20 M400 438 q52 0 84 -20"
      stroke="${INK}" stroke-width="12" fill="none" stroke-linecap="round" />`,
};

const VARIANT_TINTS = ["#f97316", "#0f766e", "#1d4ed8", "#b91c1c", "#7c3aed", "#0b7285"];

export type ProductPlaceholderSpec = {
  file: string;
  category: string;
  silhouette: keyof typeof SILHOUETTES | string;
  variantLabel: string;
  tint?: string;
};

function productSvg(spec: ProductPlaceholderSpec): string {
  const tint = spec.tint ?? VARIANT_TINTS[0];
  const silhouette = SILHOUETTES[spec.silhouette] ?? SILHOUETTES.aksessuar;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(
    `${spec.category} — плейсхолдер`,
  )}">
  <defs>
    <linearGradient id="ph-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BG}" />
      <stop offset="100%" stop-color="#e7eaef" />
    </linearGradient>
    <radialGradient id="ph-glow" cx="50%" cy="38%" r="62%">
      <stop offset="0%" stop-color="${tint}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${tint}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#ph-bg)" />
  <rect width="${W}" height="${H}" fill="url(#ph-glow)" />
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="22" fill="none" stroke="${INK}" stroke-opacity="0.1" stroke-width="2" />
  ${caption(spec.category, spec.variantLabel)}
  ${silhouette}
  ${FLOOR}
  <g font-family="'Segoe UI', Roboto, Arial, sans-serif">
    <text x="400" y="540" text-anchor="middle" font-size="20" fill="${INK}" fill-opacity="0.55">Изображение-плейсхолдер · фото добавляется в админке</text>
  </g>
</svg>
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Спецификация плейсхолдеров товаров
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCT_PLACEHOLDERS: ProductPlaceholderSpec[] = [
  { file: "bagazhnik-1.svg", category: "Багажники на крышу", silhouette: "bagazhnik", variantLabel: "аэродинамический профиль" },
  { file: "bagazhnik-2.svg", category: "Багажники на крышу", silhouette: "bagazhnik", variantLabel: "на рейлинги", tint: VARIANT_TINTS[1] },
  { file: "bagazhnik-3.svg", category: "Багажники на крышу", silhouette: "bagazhnik", variantLabel: "на гладкую крышу", tint: VARIANT_TINTS[2] },
  { file: "avtoboks-1.svg", category: "Автобоксы", silhouette: "avtoboks", variantLabel: "300–400 л" },
  { file: "avtoboks-2.svg", category: "Автобоксы", silhouette: "avtoboks", variantLabel: "440–480 л", tint: VARIANT_TINTS[1] },
  { file: "avtoboks-3.svg", category: "Автобоксы", silhouette: "avtoboks", variantLabel: "от 500 л", tint: VARIANT_TINTS[3] },
  { file: "velokreplenie-1.svg", category: "Велокрепления", silhouette: "velokreplenie", variantLabel: "на крышу" },
  { file: "velokreplenie-2.svg", category: "Велокрепления", silhouette: "velokreplenie", variantLabel: "на фаркоп", tint: VARIANT_TINTS[1] },
  { file: "velokreplenie-3.svg", category: "Велокрепления", silhouette: "velokreplenie", variantLabel: "на заднюю дверь", tint: VARIANT_TINTS[4] },
  { file: "lyzhnoe-kreplenie-1.svg", category: "Лыжные крепления", silhouette: "lyzhi", variantLabel: "на 4 пары" },
  { file: "lyzhnoe-kreplenie-2.svg", category: "Лыжные крепления", silhouette: "lyzhi", variantLabel: "на 6 пар", tint: VARIANT_TINTS[2] },
  { file: "lyzhnoe-kreplenie-3.svg", category: "Лыжные крепления", silhouette: "lyzhi", variantLabel: "сноуборд", tint: VARIANT_TINTS[5] },
  { file: "farkop-1.svg", category: "Фаркопы (ТСУ)", silhouette: "farkop", variantLabel: "съёмный крюк" },
  { file: "farkop-2.svg", category: "Фаркопы (ТСУ)", silhouette: "farkop", variantLabel: "вертикальный фланцевый", tint: VARIANT_TINTS[1] },
  { file: "farkop-3.svg", category: "Фаркопы (ТСУ)", silhouette: "farkop", variantLabel: "без выреза бампера", tint: VARIANT_TINTS[2] },
  { file: "korzina-1.svg", category: "Корзины и платформы", silhouette: "korzina", variantLabel: "универсальная" },
  { file: "korzina-2.svg", category: "Корзины и платформы", silhouette: "korzina", variantLabel: "на фаркоп", tint: VARIANT_TINTS[1] },
  { file: "voda-1.svg", category: "Водное снаряжение", silhouette: "voda", variantLabel: "каяк / SUP" },
  { file: "voda-2.svg", category: "Водное снаряжение", silhouette: "voda", variantLabel: "2 доски", tint: VARIANT_TINTS[5] },
  { file: "aksessuar-1.svg", category: "Крепёж и аксессуары", silhouette: "aksessuar", variantLabel: "ремкомплект" },
  { file: "aksessuar-2.svg", category: "Крепёж и аксессуары", silhouette: "aksessuar", variantLabel: "замок / ключ", tint: VARIANT_TINTS[3] },
  { file: "elektrika-1.svg", category: "Электрика фаркопов", silhouette: "elektrika", variantLabel: "7-pin" },
  { file: "elektrika-2.svg", category: "Электрика фаркопов", silhouette: "elektrika", variantLabel: "13-pin", tint: VARIANT_TINTS[2] },
  { file: "universal-1.svg", category: "Универсальный товар", silhouette: "aksessuar", variantLabel: "universal", tint: VARIANT_TINTS[1] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Баннеры
// ─────────────────────────────────────────────────────────────────────────────

export type BannerSpec = {
  file: string;
  badge: string;
  title: string;
  subtitle: string;
  accentFrom: string;
  accentTo: string;
  art: "car" | "box" | "tow" | "bike";
};

const BANNER_W = 1600;
const BANNER_H = 600;

const BANNER_ART: Record<BannerSpec["art"], string> = {
  car: `
    <g transform="translate(980 150) scale(1.15)" opacity="0.95">
      <path d="M20 250 H460" stroke="${WHITE}" stroke-opacity="0.35" stroke-width="6" stroke-linecap="round" />
      <path d="M60 244 C60 200 96 176 150 172 H330 C384 176 420 200 420 244 Z" fill="${WHITE}" fill-opacity="0.14" stroke="${WHITE}" stroke-opacity="0.5" stroke-width="5" />
      <rect x="110" y="120" width="260" height="26" rx="13" fill="${BRAND}" />
      <rect x="86" y="80" width="60" height="40" rx="10" fill="${BRAND}" fill-opacity="0.8" />
      <rect x="334" y="80" width="60" height="40" rx="10" fill="${BRAND}" fill-opacity="0.8" />
      <circle cx="150" cy="256" r="34" fill="${WHITE}" fill-opacity="0.18" stroke="${WHITE}" stroke-opacity="0.45" stroke-width="5" />
      <circle cx="330" cy="256" r="34" fill="${WHITE}" fill-opacity="0.18" stroke="${WHITE}" stroke-opacity="0.45" stroke-width="5" />
    </g>`,
  box: `
    <g transform="translate(980 170)" opacity="0.95">
      <path d="M20 220 C20 150 90 96 200 90 H420 C536 96 600 150 600 220 C600 244 590 254 566 254 H54 C30 254 20 244 20 220 Z"
        fill="${WHITE}" fill-opacity="0.16" stroke="${WHITE}" stroke-opacity="0.5" stroke-width="5" />
      <path d="M60 212 C60 158 116 120 210 116 H414 C512 120 566 158 566 212 Z" fill="${BRAND}" fill-opacity="0.85" />
      <rect x="250" y="170" width="120" height="30" rx="15" fill="${WHITE}" fill-opacity="0.6" />
    </g>`,
  tow: `
    <g transform="translate(980 190)" opacity="0.95">
      <rect x="20" y="60" width="560" height="38" rx="19" fill="${WHITE}" fill-opacity="0.2" stroke="${WHITE}" stroke-opacity="0.5" stroke-width="5" />
      <rect x="140" y="98" width="34" height="80" rx="12" fill="${WHITE}" fill-opacity="0.2" />
      <rect x="430" y="98" width="34" height="80" rx="12" fill="${WHITE}" fill-opacity="0.2" />
      <path d="M292 98 H308 V150" stroke="${WHITE}" stroke-opacity="0.6" stroke-width="18" stroke-linecap="round" />
      <circle cx="300" cy="184" r="42" fill="${BRAND}" />
      <circle cx="300" cy="184" r="16" fill="${WHITE}" fill-opacity="0.75" />
    </g>`,
  bike: `
    <g transform="translate(960 180)" opacity="0.95" stroke="${WHITE}" stroke-width="10" fill="none" stroke-linecap="round">
      <circle cx="90" cy="200" r="70" stroke-opacity="0.6" />
      <circle cx="400" cy="200" r="70" stroke-opacity="0.6" />
      <path d="M90 200 L200 200 L270 110 L345 200 M200 200 L262 110 M262 110 L345 200 M310 92 H382" stroke-opacity="0.75" />
      <rect x="0" y="266" width="520" height="24" rx="12" fill="${BRAND}" stroke="none" />
    </g>`,
};

function bannerSvg(spec: BannerSpec): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BANNER_W}" height="${BANNER_H}" viewBox="0 0 ${BANNER_W} ${BANNER_H}" role="img" aria-label="${esc(spec.title)}">
  <defs>
    <linearGradient id="bn-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${spec.accentFrom}" />
      <stop offset="100%" stop-color="${spec.accentTo}" />
    </linearGradient>
    <radialGradient id="bn-glow" cx="78%" cy="30%" r="55%">
      <stop offset="0%" stop-color="${WHITE}" stop-opacity="0.28" />
      <stop offset="100%" stop-color="${WHITE}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${BANNER_W}" height="${BANNER_H}" fill="url(#bn-bg)" />
  <rect width="${BANNER_W}" height="${BANNER_H}" fill="url(#bn-glow)" />
  ${BANNER_ART[spec.art]}
  <g font-family="'Segoe UI', Roboto, Arial, sans-serif" fill="${WHITE}">
    <rect x="90" y="112" width="${Math.max(220, spec.badge.length * 13 + 56)}" height="52" rx="26" fill="${WHITE}" fill-opacity="0.18" stroke="${WHITE}" stroke-opacity="0.38" stroke-width="2" />
    <text x="118" y="146" font-size="24" font-weight="600">${esc(spec.badge)}</text>
    <text x="90" y="268" font-size="68" font-weight="800">${esc(spec.title)}</text>
    <text x="90" y="336" font-size="30" fill-opacity="0.86">${esc(spec.subtitle)}</text>
    <rect x="90" y="392" width="330" height="76" rx="38" fill="${BRAND}" />
    <text x="255" y="440" text-anchor="middle" font-size="28" font-weight="700">Подобрать по авто</text>
    <text x="90" y="536" font-size="24" fill-opacity="0.7">Garage19 · доставка по России · установка в сервисе</text>
  </g>
</svg>
`;
}

export const BANNER_PLACEHOLDERS: BannerSpec[] = [
  {
    file: "hero-1.svg",
    badge: "Конфигуратор",
    title: "Багажник за 5 минут подбора",
    subtitle: "Марка → модель → поколение. Только то, что реально подходит",
    accentFrom: "#1e2430",
    accentTo: "#3b4557",
    art: "car",
  },
  {
    file: "hero-2.svg",
    badge: "Сезон автобоксов",
    title: "Скидки до 30%",
    subtitle: "Thule, Atera, Mont Blanc, Menabo — в наличии на складе",
    accentFrom: "#c2410c",
    accentTo: "#f97316",
    art: "box",
  },
  {
    file: "hero-3.svg",
    badge: "Фаркопы (ТСУ)",
    title: "Фаркопы с установкой и ГИБДД",
    subtitle: "Паспорт и сертификат в комплекте. Запись на установку онлайн",
    accentFrom: "#0f766e",
    accentTo: "#134e4a",
    art: "tow",
  },
  {
    file: "hero-4.svg",
    badge: "Велосезон",
    title: "Велокрепления на крышу и фаркоп",
    subtitle: "От 6 000 ₽ · замок в комплекте · до 4 велосипедов",
    accentFrom: "#1d4ed8",
    accentTo: "#1e3a8a",
    art: "bike",
  },
  {
    file: "promo-1.svg",
    badge: "Аренда",
    title: "Автобокс в аренду на поездку",
    subtitle: "от 1 200 ₽ / сутки — для тех, кому нужно один раз",
    accentFrom: "#7c3aed",
    accentTo: "#4c1d95",
    art: "box",
  },
  {
    file: "promo-2.svg",
    badge: "Установка",
    title: "Установка фаркопа за 1 день",
    subtitle: "Сертифицированный сервис в Москве и Санкт-Петербурге",
    accentFrom: "#0b7285",
    accentTo: "#0f172a",
    art: "tow",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Фолбэк-плейсхолдер
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Изображение отсутствует">
  <defs>
    <linearGradient id="fb-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f6f7f9" />
      <stop offset="100%" stop-color="#e5e8ee" />
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#fb-bg)" />
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="22" fill="none" stroke="${INK}" stroke-opacity="0.1" stroke-width="2" />
  <g transform="translate(400 268)" stroke="${INK}" stroke-opacity="0.32" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="-130" y="-96" width="260" height="192" rx="20" />
    <circle cx="-42" cy="-30" r="26" />
    <path d="M-130 44 L-30 -30 L54 44 L96 8 L130 46" />
  </g>
  <g font-family="'Segoe UI', Roboto, Arial, sans-serif" text-anchor="middle">
    <text x="400" y="446" font-size="30" font-weight="700" fill="${INK}" fill-opacity="0.7">Garage19</text>
    <text x="400" y="486" font-size="22" fill="${INK}" fill-opacity="0.5">Изображение скоро появится</text>
  </g>
</svg>
`;

// ─────────────────────────────────────────────────────────────────────────────
// PDF-документы (одна страница A4, кириллица через встроенный TTF-сабсет)
// ─────────────────────────────────────────────────────────────────────────────

/** Ищем системный шрифт с кириллицей: Arial → Segoe UI → DejaVu/Noto. */
function resolveFonts(): { regular: Buffer; bold?: Buffer; name: string } {
  const candidates: { regular: string; bold?: string; name: string }[] = [
    { regular: "C:/Windows/Fonts/arial.ttf", bold: "C:/Windows/Fonts/arialbd.ttf", name: "Arial" },
    { regular: "C:/Windows/Fonts/segoeui.ttf", bold: "C:/Windows/Fonts/segoeuib.ttf", name: "Segoe UI" },
    { regular: "C:/Windows/Fonts/tahoma.ttf", bold: "C:/Windows/Fonts/tahomabd.ttf", name: "Tahoma" },
    { regular: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", name: "DejaVu Sans" },
    { regular: "/System/Library/Fonts/Supplemental/Arial.ttf", name: "Arial (macOS)" },
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate.regular)) continue;
    return {
      regular: readFontFile(candidate.regular),
      bold: candidate.bold && existsSync(candidate.bold) ? readFontFile(candidate.bold) : undefined,
      name: candidate.name,
    };
  }
  throw new Error(
    "Не найден TTF-шрифт с поддержкой кириллицы. Установите Arial/DejaVu Sans или удалите PDF-документы из спецификации.",
  );
}

export const PDF_DOCUMENTS: { file: string; title: string; lines: PdfTextLine[] }[] = [
  {
    file: "instrukciya-sample.pdf",
    title: "Инструкция по установке — образец Garage19",
    lines: [
      { text: "Garage19 — инструкция по установке", size: 18, bold: true },
      { text: "Багажник на крышу / автобокс / крепление для велосипеда", size: 10 },
      { text: "", size: 10 },
      { text: "1. Комплектность", size: 13, bold: true },
      { text: "Дуги — 2 шт., опоры — 4 шт., ключ, замки, крепёж, паспорт изделия.", size: 10 },
      { text: "2. Подготовка поверхности", size: 13, bold: true },
      { text: "Вымойте крышу, проверьте состояние штатных точек крепления и рейлингов.", size: 10 },
      { text: "3. Порядок монтажа", size: 13, bold: true },
      { text: "Установите опоры симметрично относительно продольной оси автомобиля,", size: 10 },
      { text: "затяните крепёж моментом 4–6 Н·м, установите заглушки и замки.", size: 10 },
      { text: "4. Проверка после установки", size: 13, bold: true },
      { text: "Через 50 км пробега повторно протяните крепёж, проверьте замки.", size: 10 },
      { text: "5. Ограничения", size: 13, bold: true },
      { text: "Максимальная нагрузка и скорость с грузом указаны в паспорте изделия.", size: 10 },
      { text: "", size: 10 },
      { text: "Документ является образцом демонстрационных данных Garage19.", size: 9 },
    ],
  },
  {
    file: "pasport-farkopa-sample.pdf",
    title: "Паспорт тягово-сцепного устройства — образец Garage19",
    lines: [
      { text: "ПАСПОРТ ТЯГОВО-СЦЕПНОГО УСТРОЙСТВА (ТСУ)", size: 15, bold: true },
      { text: "Образец документа для демонстрации каталога Garage19", size: 10 },
      { text: "", size: 10 },
      { text: "1. Общие сведения", size: 13, bold: true },
      { text: "ТСУ предназначено для буксировки прицепа массой до 2000 кг.", size: 10 },
      { text: "2. Технические характеристики", size: 13, bold: true },
      { text: "Тяговая нагрузка: 1500–2000 кг. Вертикальная нагрузка: 75–100 кг.", size: 10 },
      { text: "Тип крюка: съёмный. Электрика: 7-pin или 13-pin.", size: 10 },
      { text: "3. Требования к установке", size: 13, bold: true },
      { text: "Монтаж выполняется на аттестованном СТО, момент затяжки — по схеме.", size: 10 },
      { text: "4. Гарантия изготовителя", size: 13, bold: true },
      { text: "36 месяцев со дня продажи при соблюдении правил установки.", size: 10 },
      { text: "5. Регистрация в ГИБДД", size: 13, bold: true },
      { text: "Сертификат соответствия и паспорт предъявляются в ГИБДД.", size: 10 },
      { text: "", size: 10 },
      { text: "Образец демонстрационных данных. Не является товарным документом.", size: 9 },
    ],
  },
  {
    file: "sertifikat-sample.pdf",
    title: "Сертификат соответствия — образец Garage19",
    lines: [
      { text: "СЕРТИФИКАТ СООТВЕТСТВИЯ", size: 15, bold: true },
      { text: "Образец документа для демонстрации каталога Garage19", size: 10 },
      { text: "", size: 10 },
      { text: "Регистрационный номер: RU.GB19.D00001", size: 11 },
      { text: "Срок действия: по 31.12.2027", size: 11 },
      { text: "", size: 11 },
      { text: "Продукция: тягово-сцепные устройства (фаркопы) для легковых", size: 10 },
      { text: "автомобилей, багажные системы на крышу, автобоксы, велокрепления.", size: 10 },
      { text: "", size: 10 },
      { text: "Соответствует: ТР ТС 018/2011 «О безопасности колёсных", size: 10 },
      { text: "транспортных средств».", size: 10 },
      { text: "", size: 10 },
      { text: "Орган по сертификации: ООО «Автосерт-Тест»", size: 10 },
      { text: "Документ является образцом демонстрационных данных Garage19.", size: 9 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Запуск
// ─────────────────────────────────────────────────────────────────────────────

function main(): void {
  let count = 0;

  for (const spec of PRODUCT_PLACEHOLDERS) {
    writeFileSync(join(PRODUCTS_DIR, spec.file), productSvg(spec), "utf8");
    count += 1;
  }
  console.log(`[assets] плейсхолдеры товаров: ${PRODUCT_PLACEHOLDERS.length}`);

  for (const spec of BANNER_PLACEHOLDERS) {
    writeFileSync(join(BANNERS_DIR, spec.file), bannerSvg(spec), "utf8");
    count += 1;
  }
  console.log(`[assets] баннеры: ${BANNER_PLACEHOLDERS.length}`);

  writeFileSync(join(IMAGES_DIR, "placeholder.svg"), FALLBACK_SVG, "utf8");
  count += 1;
  console.log("[assets] фолбэк public/images/placeholder.svg");

  const fonts = resolveFonts();
  console.log(`[assets] шрифт для PDF: ${fonts.name}${fonts.bold ? " + Bold" : ""}`);

  for (const doc of PDF_DOCUMENTS) {
    const { pdf, embeddedGlyphs } = buildPdfWithFont({
      regular: fonts.regular,
      bold: fonts.bold,
      lines: doc.lines,
      title: doc.title,
    });
    writeFileSync(join(DOCS_DIR, doc.file), pdf);
    count += 1;
    console.log(`[assets] ${doc.file} — ${pdf.length} байт, ${embeddedGlyphs} глифов`);
  }

  console.log(`[assets] готово: ${count} файлов`);
}

main();
