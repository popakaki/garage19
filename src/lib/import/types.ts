/**
 * Общие типы движка импорта прайсов.
 *
 * Ключевая идея: парсеры (parsers/*) и нормализация (normalize.ts) не знают про БД —
 * они возвращают «черновики» товаров. Пишет в базу только engine.ts, поэтому
 * те же функции легко тестировать и запускать в режиме dry_run.
 */

export type ImportSourceType = "xml" | "yml" | "csv";
export type ImportMode = "update" | "insert_only" | "dry_run";

/**
 * Входные данные импорта — ровно тот контракт, который ожидает админка.
 * @see docs/IMPORT.md
 */
export type ImportInput = {
  /** Содержимое файла целиком (текст в UTF-8). */
  text: string;
  fileName: string;
  sourceType: ImportSourceType;
  /** Поставщик: к его наценке применяется цена и сохраняется purchasePrice. */
  supplierId?: string;
  mode: ImportMode;
  /** Пользователь, запустивший импорт (для ImportJob.userId и AuditLog). */
  userId?: string;
  /** Категория по умолчанию для товаров, у которых не удалось определить категорию. */
  defaultCategorySlug?: string;
  /**
   * Существующий ImportJob (если админка создала запись сама — например,
   * `startImportAction` из `@/lib/actions/admin/import.ts`). В этом случае движок
   * обновит задачу, а не создаст вторую.
   */
  jobId?: string;
};

export type ImportResult = {
  jobId: string;
  status: "done" | "failed";
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  /** Первые 50 ошибок — остальные попадают в лог. */
  errors: string[];
  /** Человекочитаемый журнал выполнения. */
  log: string;
};

/** Строка прайса после парсинга — «сырые» значения без приведения к схеме. */
export type RawOffer = {
  /** Порядковый номер строки/оффера в файле (с 1) — для сообщений об ошибках. */
  row: number;
  externalId?: string;
  sku?: string;
  name: string;
  price?: string;
  oldPrice?: string;
  currencyId?: string;
  categoryName?: string;
  categoryId?: string;
  description?: string;
  vendor?: string;
  vendorCode?: string;
  /** URL изображений из фида (внешние ссылки) + локальные плейсхолдеры. */
  pictures: string[];
  stock?: string;
  weight?: string;
  /** Произвольные параметры фида: «Грузоподъёмность», «Материал», «Объём»... */
  params: Record<string, string>;
  /** Колонки CSV с совместимостью: fitment, brand/model/generation или отдельные поля. */
  fitment?: string;
  carBrand?: string;
  carModel?: string;
  carGeneration?: string;
  carYearFrom?: string;
  carYearTo?: string;
  /** Дополнительные колонки CSV, для которых не нашлось специального поля. */
  extra: Record<string, string>;
};

export type ParseResult = {
  offers: RawOffer[];
  /** Проблемы уровня файла и строк (не прерывают импорт). */
  errors: string[];
  /** Понятное описание формата: сколько офферов, какие поля распознаны. */
  notes: string[];
};

/** Нормализованный черновик товара — уже в терминах схемы Prisma. */
export type ProductDraft = {
  row: number;
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName?: string;
  brandName?: string;
  manufacturerSlug?: string;

  /** Цена продажи в копейках (уже с наценкой поставщика). */
  price: number;
  /** Цена до скидки в копейках. */
  oldPrice?: number;
  /** Закупочная цена в копейках (из фида, без наценки). */
  purchasePrice?: number;

  stock: number;
  weight?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  warrantyMonths?: number;

  description?: string;
  shortDescription?: string;
  images: string[];

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

  /** Значения ProductAttribute: slug атрибута → значение. */
  attributes: { slug: string; valueString?: string; valueNumber?: number; valueBool?: boolean }[];

  /** Совместимость: ключи вида "brand/model/generation" или "brand". */
  fitmentKeys: string[];
  fitmentNote?: string;

  isActive?: boolean;
  seoTitle?: string;
  seoDescription?: string;

  externalId?: string;
};
