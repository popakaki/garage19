/**
 * Производители товаров (таблица Brand, relation ProductManufacturer).
 *
 * В той же таблице живут марки автомобилей (см. cars.ts) — схема не разделяет их,
 * поэтому slug'и и названия не должны пересекаться.
 */

export type ProductBrandSeed = {
  name: string;
  slug: string;
  country: string;
  popular: boolean;
  sortOrder: number;
  logo?: string;
};

export const PRODUCT_BRANDS: ProductBrandSeed[] = [
  { name: "Thule", slug: "thule", country: "Швеция", popular: true, sortOrder: 10 },
  { name: "Atera", slug: "atera", country: "Германия", popular: true, sortOrder: 20 },
  { name: "Mont Blanc", slug: "mont-blanc", country: "Швеция", popular: true, sortOrder: 30 },
  { name: "Menabo", slug: "menabo", country: "Италия", popular: true, sortOrder: 40 },
  { name: "FicoPro", slug: "ficopro", country: "Испания", popular: false, sortOrder: 50 },
  { name: "Whispbar", slug: "whispbar", country: "Австралия", popular: true, sortOrder: 60 },
  { name: "Yakima", slug: "yakima", country: "США", popular: true, sortOrder: 70 },
  { name: "Lux", slug: "lux", country: "Россия", popular: true, sortOrder: 80 },
  { name: "Atlant", slug: "atlant", country: "Россия", popular: false, sortOrder: 90 },
  { name: "Piligrim", slug: "piligrim", country: "Россия", popular: true, sortOrder: 100 },
  { name: "Rollster", slug: "rollster", country: "Россия", popular: false, sortOrder: 110 },
  { name: "Turtle", slug: "turtle", country: "Россия", popular: true, sortOrder: 120 },
  { name: "Titan", slug: "titan", country: "Россия", popular: false, sortOrder: 130 },
  { name: "TowRus", slug: "towrus", country: "Россия", popular: true, sortOrder: 140 },
  { name: "Baltex", slug: "baltex", country: "Россия", popular: true, sortOrder: 150 },
  { name: "Auto-Hak", slug: "auto-hak", country: "Польша", popular: true, sortOrder: 160 },
  { name: "Galia", slug: "galia", country: "Чехия", popular: false, sortOrder: 170 },
  { name: "Oris", slug: "oris", country: "Германия", popular: true, sortOrder: 180 },
  { name: "Westfalia", slug: "westfalia", country: "Германия", popular: true, sortOrder: 190 },
  { name: "Brink", slug: "brink", country: "Нидерланды", popular: false, sortOrder: 200 },
  { name: "Bizon", slug: "bizon", country: "Россия", popular: false, sortOrder: 210 },
  { name: "Garage19", slug: "garage19", country: "Россия", popular: false, sortOrder: 220 },
];
