/**
 * Сводный список демо-товаров + правил, действующих для всего каталога.
 *
 * Здесь же определены:
 *  * FLAGSHIP_CARS — автомобили, для которых гарантировано покрытие всеми
 *    основными категориями (конфигуратор на главной не должен давать пустой список);
 *  * ATTRIBUTE_ALIASES — короткие ключи фасетов → slug'и Attribute;
 *  * documentSpecsFor() — правила выдачи PDF-документов по категории:
 *    фаркопы получают паспорт ТСУ и сертификат (требование ГИБДД),
 *    багажники и боксы — инструкцию по установке.
 */

import type { ProductDocumentSeed, ProductSeed } from "./types";
import { ROOF_RACKS } from "./products-racks";
import { CARGO_BOXES } from "./products-boxes";
import { BIKE_CARRIERS, SKI_CARRIERS } from "./products-bikes";
import { BASKETS, TOW_BARS } from "./products-towbars";
import { ACCESSORIES, ELECTRICS, WATER_GEAR } from "./products-gear";

export const PRODUCTS: ProductSeed[] = [
  ...ROOF_RACKS,
  ...CARGO_BOXES,
  ...BIKE_CARRIERS,
  ...SKI_CARRIERS,
  ...TOW_BARS,
  ...BASKETS,
  ...WATER_GEAR,
  ...ACCESSORIES,
  ...ELECTRICS,
];

/** Флагманские авто: для них проверяется покрытие всех основных категорий. */
export const FLAGSHIP_CARS = [
  "toyota/camry/xv70",
  "kia/sportage/ql",
  "lada/vesta/i",
  "haval/jolion/i",
  "jetour/t2/i",
] as const;

/**
 * Ключи совместимости, которые добавляются товарам с флагом `flagship`.
 *
 * Это не «универсальность», а реальная применимость: крыша и фаркоп у этих моделей
 * типовые. Ключи добавляются только для тех марок, к которым товар уже привязан
 * (см. flagshipKeysFor), иначе один товар «подходил» бы ко всем флагманам сразу.
 */
export const FLAGSHIP_FITMENT_KEYS = [
  "toyota/camry/xv70",
  "toyota/camry/xv80",
  "kia/sportage/ql",
  "kia/sportage/nq5",
  "lada/vesta/i",
  "lada/vesta/ng",
  "haval/jolion/i",
  "jetour/t2/i",
] as const;

/** Короткие ключи фасетов → slug'и Attribute (см. prisma/data/catalog.ts). */
export const ATTRIBUTE_ALIASES: Record<string, string> = {
  mount: "mesto-ustanovki",
  mat: "material",
  prof: "profil",
  hook: "tip-kryuka",
  cap: "gruzopodyomnost",
  vol: "obyom",
  lock: "zamok-v-komplekte",
  cut: "vyrez-bampera",
  el: "elektrika-v-komplekte",
  doors: "kolichestvo-dverey",
  warranty: "garantiya",
  plug: "tip-razema",
  bikes: "kolichestvo-velosipedov",
  pairs: "kolichestvo-par-lyzh",
  vert: "vertikalnaya-nagruzka",
  tow: "tyagovaya-nagruzka",
};

export function resolveAttributeSlug(key: string): string {
  return ATTRIBUTE_ALIASES[key] ?? key;
}

const FLAGSHIP_BRAND_SLUGS = new Set([
  "toyota",
  "kia",
  "lada",
  "haval",
  "hyundai",
  "volkswagen",
  "skoda",
  "renault",
  "nissan",
  "mazda",
  "mitsubishi",
  "ford",
  "chery",
  "geely",
  "jetour",
]);

/**
 * Дополнительные ключи совместимости для товара с флагом `flagship`.
 *
 * Добавляются только автомобили тех марок, которые уже присутствуют в targets
 * товара. Так товар для Toyota получает Camry XV70/XV80, а не весь список флагманов.
 */
export function flagshipKeysFor(product: ProductSeed): string[] {
  if (product.fitment.type === "universal") return [];
  if (!product.fitment.flagship) return [];
  const brands = new Set(product.fitment.targets.map((target) => target.split("/")[0]));
  return FLAGSHIP_FITMENT_KEYS.filter((key) => brands.has(key.split("/")[0]));
}

/** Документы по категории товара. */
export function documentSpecsFor(product: ProductSeed): ProductDocumentSeed[] {
  const manual = product.documents ?? [];
  const rootCategory = product.category.split("-")[0];
  const specs: ProductDocumentSeed[] = [...manual];

  const isTowBar = product.category.startsWith("farkopy");
  const isRoofProduct =
    product.category.startsWith("bagazhniki") ||
    product.category.startsWith("avtoboksy") ||
    product.category.startsWith("veloperekreateli") ||
    product.category.startsWith("lyzhnye") ||
    product.category.startsWith("korziny");

  if (isTowBar) {
    specs.push({
      type: "passport",
      title: `Паспорт ТСУ — ${product.name}`,
      url: "/docs/pasport-farkopa-sample.pdf",
      fileSize: 17_233,
    });
    specs.push({
      type: "certificate",
      title: "Сертификат соответствия ТР ТС 018/2011",
      url: "/docs/sertifikat-sample.pdf",
      fileSize: 15_272,
    });
  }

  if (isRoofProduct) {
    specs.push({
      type: "instruction",
      title: `Инструкция по установке — ${product.name}`,
      url: "/docs/instrukciya-sample.pdf",
      fileSize: 14_964,
    });
  }

  if (!isTowBar && !isRoofProduct && rootCategory === "elektrika") {
    specs.push({
      type: "manual",
      title: "Схема подключения электрики фаркопа",
      url: "/docs/instrukciya-sample.pdf",
      fileSize: 14_964,
    });
  }

  return specs;
}

/** Изображения по категории — фолбэк, если у товара не задан список. */
export function fallbackImages(categorySlug: string): string[] {
  if (categorySlug.startsWith("bagazhniki")) return ["bagazhnik-1.svg", "bagazhnik-2.svg", "bagazhnik-3.svg"];
  if (categorySlug.startsWith("avtoboksy")) return ["avtoboks-1.svg", "avtoboks-2.svg", "avtoboks-3.svg"];
  if (categorySlug.startsWith("veloperekreateli") || categorySlug.startsWith("velokrepleniya")) {
    return ["velokreplenie-1.svg", "velokreplenie-2.svg", "velokreplenie-3.svg"];
  }
  if (categorySlug.startsWith("lyzhnye")) return ["lyzhnoe-kreplenie-1.svg", "lyzhnoe-kreplenie-2.svg", "lyzhnoe-kreplenie-3.svg"];
  if (categorySlug.startsWith("farkopy")) return ["farkop-1.svg", "farkop-2.svg", "farkop-3.svg"];
  if (categorySlug.startsWith("korziny")) return ["korzina-1.svg", "korzina-2.svg", "universal-1.svg"];
  if (categorySlug.startsWith("vodnoe")) return ["voda-1.svg", "voda-2.svg", "universal-1.svg"];
  if (categorySlug.startsWith("elektrika")) return ["elektrika-1.svg", "elektrika-2.svg", "universal-1.svg"];
  return ["aksessuar-1.svg", "aksessuar-2.svg", "universal-1.svg"];
}

export { FLAGSHIP_BRAND_SLUGS };
