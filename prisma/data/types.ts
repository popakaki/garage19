/** Общие типы данных сидера. */

export type AttributeType = "select" | "number" | "bool" | "text";

/** Фасетные характеристики товара — колонки Product + значения ProductAttribute. */
export type ProductFacets = {
  capacityKg?: number;
  verticalLoadKg?: number;
  volumeL?: number;
  material?: string;
  mountPlace?: string;
  profile?: string;
  lockIncluded?: boolean;
  electricIncluded?: boolean;
  bumperCut?: boolean;
  doorsCount?: number;
  rentAvailable?: boolean;
  /**
   * Значения ProductAttribute: slug атрибута → значение.
   * Сокращённые ключи разворачиваются в слаг'и автоматически:
   *   mount → mesto-ustanovki, mat → material, prof → profil, hook → tip-kryuka,
   *   cap → gruzopodyomnost, vol → obyom, lock → zamok-v-komplekte,
   *   cut → vyrez-bampera, el → elektrika-v-komplekte, doors → kolichestvo-dverey,
   *   warranty → garantiya, plug → tip-razema, bikes → kolichestvo-velosipedov,
   *   pairs → kolichestvo-par-lyzh, vert → vertikalnaya-nagruzka, tow → tyagovaya-nagruzka.
   */
  attributes?: Record<string, string | number | boolean>;
};

/** Совместимость: либо universal, либо список «марка/модель/поколение». */
export type FitmentTarget =
  | { type: "universal"; note?: string }
  | {
      type: "specific";
      /** Ключи вида ["toyota", "camry", "xv70"], ["kia", "sportage", "ql"], ["toyota"] (вся марка). */
      targets: string[];
      note?: string;
      /**
       * Дополнительно привязать товар к поколениям флагманских авто (Camry XV70, Sportage QL,
       * Vesta, Jolion, Jetour T2) — чтобы конфигуратор на главной не давал пустой результат.
       */
      flagship?: boolean;
    };

export type ProductDocumentSeed = {
  type: "instruction" | "passport" | "certificate" | "manual" | "other";
  title: string;
  url: string;
  fileSize?: number;
};

export type ProductSeed = {
  /** Стабильный ключ идемпотентности. */
  sku: string;
  slug: string;
  name: string;
  /** Slug категории (может быть подкатегория). */
  category: string;
  /** Название бренда-производителя (Brand.name) — по нему ищем manufacturerId. */
  brand: string;
  price: number;
  oldPrice?: number;
  stock: number;
  weight: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  warrantyMonths?: number;
  shortDescription: string;
  description: string;
  /** Изображения-плейсхолдеры из public/images/products. */
  images: string[];
  facets: ProductFacets;
  fitment: FitmentTarget;
  isNew?: boolean;
  isHit?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  /** Slug'и товаров-аксессуаров (ProductRelation type=accessory). */
  accessories?: string[];
  /** Slug'и аналогов (ProductRelation type=analog). */
  analogs?: string[];
  documents?: ProductDocumentSeed[];
  salesCount?: number;
  viewsCount?: number;
};

export type CarModificationSeed = {
  name: string;
  engine: string;
  volume: number;
  power: number;
  fuel: "бензин" | "дизель" | "гибрид" | "электро" | "газ";
  drive: "передний" | "задний" | "полный";
  transmission: "МКПП" | "АКПП" | "вариатор" | "робот" | "DSG" | "редуктор";
  bodyType?: string;
  yearFrom?: number;
  yearTo?: number;
};

export type CarGenerationSeed = {
  name: string;
  slug: string;
  yearFrom: number;
  yearTo?: number;
  bodyType: string;
  note?: string;
  modifications: CarModificationSeed[];
};

export type CarModelSeed = {
  name: string;
  slug: string;
  bodyType: string;
  yearFrom: number;
  yearTo?: number;
  generations: CarGenerationSeed[];
};

export type CarBrandSeed = {
  name: string;
  slug: string;
  country: string;
  popular?: boolean;
  sortOrder: number;
  models: CarModelSeed[];
};

export type ReviewSeed = {
  /** Индекс товара в общем списке PRODUCTS. */
  productIndex: number;
  authorName: string;
  rating: number;
  title: string;
  text: string;
  pros?: string;
  cons?: string;
  status: "published" | "pending";
  isVerified: boolean;
  adminReply?: string;
  daysAgo: number;
};

export type QuestionSeed = {
  productIndex: number;
  authorName: string;
  question: string;
  answer?: string;
  status: "published" | "pending";
  isPinned?: boolean;
  daysAgo: number;
};
