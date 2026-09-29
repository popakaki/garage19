import "server-only";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { PER_PAGE, type SortOption } from "@/lib/constants";

/**
 * Слой чтения каталога. Единственное место, где собираются запросы к каталогу —
 * страницы, конфигуратор и админка используют эти функции.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCT_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  sku: true,
  price: true,
  oldPrice: true,
  stock: true,
  unit: true,
  ratingAvg: true,
  ratingCount: true,
  isNew: true,
  isHit: true,
  isFeatured: true,
  fitmentType: true,
  capacityKg: true,
  verticalLoadKg: true,
  volumeL: true,
  material: true,
  mountPlace: true,
  profile: true,
  lockIncluded: true,
  bumperCut: true,
  electricIncluded: true,
  rentAvailable: true,
  warrantyMonths: true,
  brandName: true,
  shortDescription: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  manufacturer: { select: { id: true, name: true, slug: true } },
  images: {
    select: { url: true, alt: true, isPrimary: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.ProductSelect;

export type ProductCard = Prisma.ProductGetPayload<{ select: typeof PRODUCT_CARD_SELECT }>;

export type CatalogQuery = {
  categorySlug?: string;
  categoryIds?: string[];
  brandSlugs?: string[]; // бренды-производители (Thule, Atera...)
  manufacturerSlugs?: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  mountPlace?: string[];
  material?: string[];
  capacityMin?: number;
  capacityMax?: number;
  volumeMin?: number;
  volumeMax?: number;
  lockIncluded?: boolean;
  electricIncluded?: boolean;
  bumperCut?: boolean;
  rentAvailable?: boolean;
  isNew?: boolean;
  isHit?: boolean;
  fitmentType?: string;
  search?: string;
  car?: { brandSlug?: string; modelSlug?: string; generationSlug?: string; modificationId?: string };
  attributeFilters?: { slug: string; values: string[] }[];
  sort?: SortOption;
  page?: number;
  perPage?: number;
};

export type CatalogResult = {
  items: ProductCard[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Категории
// ─────────────────────────────────────────────────────────────────────────────

export const getCategories = async (options?: { onlyActive?: boolean; parentId?: string | null }) => {
  const onlyActive = options?.onlyActive ?? true;
  return prisma.category.findMany({
    where: {
      ...(onlyActive ? { isActive: true } : {}),
      ...(options?.parentId === undefined
        ? {}
        : options.parentId === null
          ? { parentId: null }
          : { parentId: options.parentId }),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
};

export type CategoryNode = Awaited<ReturnType<typeof getCategories>>[number] & {
  children?: CategoryNode[];
};

/** Двухуровневое дерево категорий (для меню, сайдбара, админки). */
export const getCategoryTree = async (options?: { includeEmpty?: boolean }): Promise<CategoryNode[]> => {
  const roots = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { products: { where: { isActive: true } } } } },
      },
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
  if (options?.includeEmpty) return roots as CategoryNode[];
  return (roots as CategoryNode[]).filter(
    (category) => category._count.products > 0 || (category.children?.length ?? 0) > 0,
  );
};

export const getCategoryBySlug = async (slug: string) =>
  prisma.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }],
        include: { _count: { select: { products: { where: { isActive: true } } } } },
      },
      attributes: {
        where: { isActive: true, isFilterable: true },
        orderBy: [{ sortOrder: "asc" }],
      },
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

/**
 * Плоское дерево категорий (родители + дети) с количеством товаров,
 * путём и признаком наличия детей — для индекса каталога и карты сайта.
 */
export async function getCategoryTreeFlat(): Promise<
  { id: string; name: string; slug: string; path: string; depth: number; productCount: number; childCount: number }[]
> {
  const tree = await getCategoryTree();
  const rows: { id: string; name: string; slug: string; path: string; depth: number; productCount: number; childCount: number }[] = [];
  for (const root of tree) {
    const children = root.children ?? [];
    const childProducts = children.reduce((sum, child) => sum + child._count.products, 0);
    rows.push({
      id: root.id,
      name: root.name,
      slug: root.slug,
      path: `/catalog/${root.slug}`,
      depth: 0,
      productCount: root._count.products + childProducts,
      childCount: children.length,
    });
    for (const child of children) {
      rows.push({
        id: child.id,
        name: child.name,
        slug: child.slug,
        path: `/catalog/${child.slug}`,
        depth: 1,
        productCount: child._count.products,
        childCount: 0,
      });
    }
  }
  return rows;
}

/** Количество активных товаров в категории (с учётом подкатегорий). */
export async function getCategoryProductCount(slug: string): Promise<number> {
  const branch = await getCategoryBranchIds(slug);
  if (!branch.length) return 0;
  return prisma.product.count({
    where: { isActive: true, categoryId: { in: branch.map((item) => item.id) } },
  });
}

/** Все slug'и категорий ветки (родитель + потомки) — для листинга родителя. */
export const getCategoryBranchIds = async (slug: string): Promise<{ id: string; name: string; slug: string }[]> => {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { children: { where: { isActive: true }, select: { id: true, name: true, slug: true } } },
  });
  if (!category) return [];
  return [
    { id: category.id, name: category.name, slug: category.slug },
    ...category.children.map((child) => ({ id: child.id, name: child.name, slug: child.slug })),
  ];
};

// ─────────────────────────────────────────────────────────────────────────────
// Автомобили (конфигуратор)
// ─────────────────────────────────────────────────────────────────────────────

export const getBrands = async (options?: { popularOnly?: boolean; search?: string; onlyWithProducts?: boolean }) => {
  const brands = await prisma.brand.findMany({
    where: {
      isActive: true,
      ...(options?.popularOnly ? { popular: true } : {}),
      ...(options?.search
        ? { name: { contains: options.search, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: [{ popular: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { models: true } } },
  });
  if (!options?.onlyWithProducts) return brands;

  // Оставляем марки, у которых есть хотя бы один товар с совместимостью
  const withProducts = await prisma.fitment.groupBy({
    by: ["brandId"],
    _count: { brandId: true },
  });
  const allowed = new Set(withProducts.map((row) => row.brandId));
  return brands.filter((brand) => allowed.has(brand.id));
};

export const getBrandBySlug = async (slug: string) =>
  prisma.brand.findUnique({
    where: { slug },
    include: {
      models: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { generations: true } } },
      },
    },
  });

// ─────────────────────────────────────────────────────────────────────────────
// Бренды-производители товаров (Thule, Atera, Menabo, TowRus…)
// ─────────────────────────────────────────────────────────────────────────────

export type ManufacturerFacet = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  logo: string | null;
  productCount: number;
  priceFrom: number;
};

/**
 * Производители товаров, у которых есть активные позиции, со счётчиком и
 * минимальной ценой. Используется на странице /brands и в блоке «Производители».
 */
export async function getManufacturers(): Promise<ManufacturerFacet[]> {
  const grouped = await prisma.product.groupBy({
    by: ["manufacturerId"],
    where: { isActive: true, manufacturerId: { not: null } },
    _count: { _all: true },
    _min: { price: true },
  });
  const ids = grouped.map((row) => row.manufacturerId).filter((id): id is string => Boolean(id));
  if (!ids.length) return [];

  const brands = await prisma.brand.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true, country: true, logo: true },
  });
  const meta = new Map(brands.map((brand) => [brand.id, brand]));

  return grouped
    .map((row) => {
      const brand = row.manufacturerId ? meta.get(row.manufacturerId) : undefined;
      if (!brand) return null;
      return {
        ...brand,
        productCount: row._count._all,
        priceFrom: row._min.price ?? 0,
      };
    })
    .filter((item): item is ManufacturerFacet => Boolean(item))
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name, "ru"));
}

/** Публичная карточка производителя со счётчиком товаров и категориями. */
export async function getManufacturerBySlug(slug: string) {
  const brand = await prisma.brand.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, country: true, logo: true },
  });
  if (!brand) return null;

  const [productCount, categories, priceAggregate] = await Promise.all([
    prisma.product.count({ where: { isActive: true, manufacturerId: brand.id } }),
    prisma.product.groupBy({
      by: ["categoryId"],
      where: { isActive: true, manufacturerId: brand.id },
      _count: { _all: true },
      orderBy: { _count: { categoryId: "desc" } },
    }),
    prisma.product.aggregate({
      where: { isActive: true, manufacturerId: brand.id },
      _min: { price: true },
      _max: { price: true },
    }),
  ]);

  const categoryIds = categories.map((row) => row.categoryId);
  const categoryMeta = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const categoryMap = new Map(categoryMeta.map((category) => [category.id, category]));

  return {
    brand,
    productCount,
    priceMin: priceAggregate._min.price ?? 0,
    priceMax: priceAggregate._max.price ?? 0,
    categories: categories
      .map((row) => {
        const category = categoryMap.get(row.categoryId);
        return category ? { ...category, count: row._count._all } : null;
      })
      .filter((item): item is { id: string; name: string; slug: string; count: number } => Boolean(item)),
  };
}

export const getModelsByBrand = async (brandSlug: string) =>
  prisma.carModel.findMany({
    where: { isActive: true, brand: { slug: brandSlug, isActive: true } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { generations: { where: { isActive: true } } } } },
  });

export const getGenerations = async (brandSlug: string, modelSlug: string) =>
  prisma.generation.findMany({
    where: {
      isActive: true,
      model: { slug: modelSlug, brand: { slug: brandSlug, isActive: true } },
    },
    orderBy: [{ yearFrom: "asc" }, { sortOrder: "asc" }],
    include: {
      _count: { select: { modifications: { where: { isActive: true } } } },
    },
  });

export const getModifications = async (brandSlug: string, modelSlug: string, generationSlug: string) =>
  prisma.modification.findMany({
    where: {
      isActive: true,
      generation: {
        slug: generationSlug,
        model: { slug: modelSlug, brand: { slug: brandSlug } },
      },
    },
    orderBy: [{ volume: "asc" }, { power: "asc" }],
  });

export type CarTreeModification = {
  id: string;
  name: string;
  engine: string | null;
  volume: number | null;
  power: number | null;
  fuel: string | null;
  drive: string | null;
  yearFrom: number | null;
  yearTo: number | null;
};

export type CarTreeGeneration = {
  slug: string;
  name: string;
  yearFrom: number;
  yearTo: number | null;
  bodyType: string | null;
  modifications: CarTreeModification[];
};

export type CarTreeModel = {
  slug: string;
  name: string;
  yearFrom: number | null;
  yearTo: number | null;
  bodyType: string | null;
  generations: CarTreeGeneration[];
};

export type CarTreeBrand = {
  slug: string;
  name: string;
  popular: boolean;
  models: CarTreeModel[];
};

/**
 * Полное дерево автомобилей (марка → модель → поколение → модификация)
 * одним запросом. Используется каскадным подбором в каталоге, карточке товара
 * и заявкой «нет моей модификации» — чтобы не делать запрос на каждый шаг.
 */
export async function getCarTree(): Promise<CarTreeBrand[]> {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: [{ popular: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      popular: true,
      models: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          yearFrom: true,
          yearTo: true,
          bodyType: true,
          generations: {
            where: { isActive: true },
            orderBy: [{ yearFrom: "asc" }, { sortOrder: "asc" }],
            select: {
              slug: true,
              name: true,
              yearFrom: true,
              yearTo: true,
              bodyType: true,
              modifications: {
                where: { isActive: true },
                orderBy: [{ volume: "asc" }, { power: "asc" }],
                select: {
                  id: true,
                  name: true,
                  engine: true,
                  volume: true,
                  power: true,
                  fuel: true,
                  drive: true,
                  yearFrom: true,
                  yearTo: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return brands.map((brand) => ({
    slug: brand.slug,
    name: brand.name,
    popular: brand.popular,
    models: brand.models.map((model) => ({
      slug: model.slug,
      name: model.name,
      yearFrom: model.yearFrom,
      yearTo: model.yearTo,
      bodyType: model.bodyType,
      generations: model.generations.map((generation) => ({
        slug: generation.slug,
        name: generation.name,
        yearFrom: generation.yearFrom,
        yearTo: generation.yearTo,
        bodyType: generation.bodyType,
        modifications: generation.modifications,
      })),
    })),
  }));
}

/** Полная карточка автомобиля по slug'ам — для страниц совместимости и конфигуратора. */
export const getCarContext = async (params: {
  brandSlug?: string;
  modelSlug?: string;
  generationSlug?: string;
  modificationId?: string;
}) => {
  if (!params.brandSlug) return null;
  const brand = await prisma.brand.findUnique({ where: { slug: params.brandSlug } });
  if (!brand) return null;

  const model = params.modelSlug
    ? await prisma.carModel.findFirst({ where: { slug: params.modelSlug, brandId: brand.id } })
    : null;

  const generation =
    model && params.generationSlug
      ? await prisma.generation.findFirst({ where: { slug: params.generationSlug, modelId: model.id } })
      : null;

  const modification = params.modificationId
    ? await prisma.modification.findUnique({ where: { id: params.modificationId } })
    : null;

  const label = [brand.name, model?.name, generation?.name].filter(Boolean).join(" ");
  return { brand, model, generation, modification, label };
};

// ─────────────────────────────────────────────────────────────────────────────
// Товары: листинг
// ─────────────────────────────────────────────────────────────────────────────

function orderByForSort(sort?: SortOption): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }];
    case "price_desc":
      return [{ price: "desc" }];
    case "new":
      return [{ createdAt: "desc" }];
    case "rating":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
    case "name":
      return [{ name: "asc" }];
    case "popular":
    default:
      return [{ isHit: "desc" }, { salesCount: "desc" }, { ratingCount: "desc" }];
  }
}

/** Собирает Prisma-where из параметров каталога. */
export async function buildProductWhere(query: CatalogQuery): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = { isActive: true };
  const and: Prisma.ProductWhereInput[] = [];

  if (query.categoryIds?.length) {
    and.push({ categoryId: { in: query.categoryIds } });
  } else if (query.categorySlug) {
    const branch = await getCategoryBranchIds(query.categorySlug);
    if (branch.length) and.push({ categoryId: { in: branch.map((item) => item.id) } });
  }

  const manufacturerSlugs = query.manufacturerSlugs ?? query.brandSlugs;
  if (manufacturerSlugs?.length) {
    and.push({ manufacturer: { slug: { in: manufacturerSlugs } } });
  }

  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    and.push({
      price: {
        ...(query.priceMin !== undefined ? { gte: query.priceMin } : {}),
        ...(query.priceMax !== undefined ? { lte: query.priceMax } : {}),
      },
    });
  }

  if (query.inStock) and.push({ stock: { gt: 0 } });
  if (query.mountPlace?.length) and.push({ mountPlace: { in: query.mountPlace } });
  if (query.material?.length) and.push({ material: { in: query.material } });
  if (query.capacityMin !== undefined || query.capacityMax !== undefined) {
    and.push({
      capacityKg: {
        ...(query.capacityMin !== undefined ? { gte: query.capacityMin } : {}),
        ...(query.capacityMax !== undefined ? { lte: query.capacityMax } : {}),
      },
    });
  }
  if (query.volumeMin !== undefined || query.volumeMax !== undefined) {
    and.push({
      volumeL: {
        ...(query.volumeMin !== undefined ? { gte: query.volumeMin } : {}),
        ...(query.volumeMax !== undefined ? { lte: query.volumeMax } : {}),
      },
    });
  }
  if (query.lockIncluded !== undefined) and.push({ lockIncluded: query.lockIncluded });
  if (query.electricIncluded !== undefined) and.push({ electricIncluded: query.electricIncluded });
  if (query.bumperCut !== undefined) and.push({ bumperCut: query.bumperCut });
  if (query.rentAvailable !== undefined) and.push({ rentAvailable: query.rentAvailable });
  if (query.isNew) and.push({ isNew: true });
  if (query.isHit) and.push({ isHit: true });
  if (query.fitmentType) and.push({ fitmentType: query.fitmentType });

  if (query.search) {
    const term = query.search.trim();
    and.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { shortDescription: { contains: term, mode: "insensitive" } },
        { brandName: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  // Фильтр по автомобилю: товар подходит, если есть совместимость нужного уровня
  // или товар универсальный.
  if (query.car && (query.car.brandSlug || query.car.modificationId)) {
    const car = await getCarContext(query.car);
    if (car) {
      const fitmentConditions: Prisma.FitmentWhereInput[] = [{ brandId: car.brand.id }];
      if (car.model) fitmentConditions.push({ modelId: car.model.id });
      if (car.generation) fitmentConditions.push({ generationId: car.generation.id });
      if (car.modification) fitmentConditions.push({ modificationId: car.modification.id });

      and.push({
        OR: [
          { fitmentType: "universal" },
          {
            fitments: {
              some: {
                brandId: car.brand.id,
                AND: [
                  ...(car.model ? [{ OR: [{ modelId: null }, { modelId: car.model.id }] }] : []),
                  ...(car.generation
                    ? [{ OR: [{ generationId: null }, { generationId: car.generation.id }] }]
                    : []),
                  ...(car.modification
                    ? [{ OR: [{ modificationId: null }, { modificationId: car.modification.id }] }]
                    : []),
                ],
              },
            },
          },
        ],
      });
      void fitmentConditions;
    }
  }

  for (const attributeFilter of query.attributeFilters ?? []) {
    if (!attributeFilter.values.length) continue;
    and.push({
      attributes: {
        some: {
          attribute: { slug: attributeFilter.slug },
          OR: attributeFilter.values.flatMap((value) => [
            { valueString: value },
            { valueString: { contains: value, mode: "insensitive" as const } },
          ]),
        },
      },
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export async function getProducts(query: CatalogQuery = {}): Promise<CatalogResult> {
  const page = Math.max(1, query.page ?? 1);
  const perPage = query.perPage ?? PER_PAGE;
  const where = await buildProductWhere(query);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: orderByForSort(query.sort),
      skip: (page - 1) * perPage,
      take: perPage,
      select: PRODUCT_CARD_SELECT,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProductSlugsForSitemap() {
  return prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true, images: { select: { url: true }, take: 1 } },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Фасеты фильтров
// ─────────────────────────────────────────────────────────────────────────────

export type Facets = {
  manufacturers: { slug: string; name: string; count: number }[];
  mountPlaces: { value: string; count: number }[];
  materials: { value: string; count: number }[];
  capacities: { label: string; min?: number; max?: number; count: number }[];
  volumes: { label: string; min?: number; max?: number; count: number }[];
  priceMin: number;
  priceMax: number;
  inStockCount: number;
  total: number;
  attributes: { id: string; name: string; slug: string; unit: string | null; values: { value: string; count: number }[] }[];
};

const CAPACITY_BUCKETS = [
  { label: "до 50 кг", min: undefined, max: 50 },
  { label: "50–75 кг", min: 50, max: 75 },
  { label: "75–100 кг", min: 75, max: 100 },
  { label: "от 100 кг", min: 100, max: undefined },
];

const VOLUME_BUCKETS = [
  { label: "до 300 л", min: undefined, max: 300 },
  { label: "300–400 л", min: 300, max: 400 },
  { label: "400–500 л", min: 400, max: 500 },
  { label: "от 500 л", min: 500, max: undefined },
];

/** Фасеты (счётчики) для сайдбара каталога — считаются по текущей выборке. */
export async function getFacets(query: CatalogQuery = {}): Promise<Facets> {
  const where = await buildProductWhere(query);

  const [grouped, aggregate, inStockCount, total, attributes] = await Promise.all([
    prisma.product.groupBy({
      by: ["manufacturerId", "mountPlace", "material"],
      where,
      _count: { _all: true },
    }),
    prisma.product.aggregate({ where, _min: { price: true }, _max: { price: true } }),
    prisma.product.count({ where: { ...where, stock: { gt: 0 } } }),
    prisma.product.count({ where }),
    query.categorySlug
      ? prisma.attribute.findMany({
          where: {
            isActive: true,
            isFilterable: true,
            category: { slug: query.categorySlug },
          },
          orderBy: { sortOrder: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const manufacturerIds = [...new Set(grouped.map((row) => row.manufacturerId).filter(Boolean))] as string[];
  const manufacturersMeta = manufacturerIds.length
    ? await prisma.brand.findMany({
        where: { id: { in: manufacturerIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];

  const manufacturerCounts = new Map<string, number>();
  const mountPlaceCounts = new Map<string, number>();
  const materialCounts = new Map<string, number>();
  for (const row of grouped) {
    const count = row._count._all;
    if (row.manufacturerId) {
      manufacturerCounts.set(row.manufacturerId, (manufacturerCounts.get(row.manufacturerId) ?? 0) + count);
    }
    if (row.mountPlace) {
      mountPlaceCounts.set(row.mountPlace, (mountPlaceCounts.get(row.mountPlace) ?? 0) + count);
    }
    if (row.material) {
      materialCounts.set(row.material, (materialCounts.get(row.material) ?? 0) + count);
    }
  }

  const capacities = await Promise.all(
    CAPACITY_BUCKETS.map(async (bucket) => ({
      ...bucket,
      count: await prisma.product.count({
        where: {
          ...where,
          capacityKg: {
            ...(bucket.min !== undefined ? { gte: bucket.min } : {}),
            ...(bucket.max !== undefined ? { lte: bucket.max } : {}),
          },
        },
      }),
    })),
  );

  const volumes = await Promise.all(
    VOLUME_BUCKETS.map(async (bucket) => ({
      ...bucket,
      count: await prisma.product.count({
        where: {
          ...where,
          volumeL: {
            ...(bucket.min !== undefined ? { gte: bucket.min } : {}),
            ...(bucket.max !== undefined ? { lte: bucket.max } : {}),
          },
        },
      }),
    })),
  );

  const attributeFacets = await Promise.all(
    attributes.map(async (attribute) => {
      const values = await prisma.productAttribute.groupBy({
        by: ["valueString"],
        where: { product: where, attributeId: attribute.id, valueString: { not: null } },
        _count: { _all: true },
      });
      return {
        id: attribute.id,
        name: attribute.name,
        slug: attribute.slug,
        unit: attribute.unit,
        values: values
          .filter((row) => row.valueString)
          .map((row) => ({ value: row.valueString as string, count: row._count._all })),
      };
    }),
  );

  return {
    manufacturers: manufacturersMeta
      .map((brand) => ({
        slug: brand.slug,
        name: brand.name,
        count: manufacturerCounts.get(brand.id) ?? 0,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count),
    mountPlaces: [...mountPlaceCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    materials: [...materialCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    capacities: capacities.filter((bucket) => bucket.count > 0),
    volumes: volumes.filter((bucket) => bucket.count > 0),
    priceMin: aggregate._min.price ?? 0,
    priceMax: aggregate._max.price ?? 0,
    inStockCount,
    total,
    attributes: attributeFacets.filter((facet) => facet.values.length > 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Товар: карточка
// ─────────────────────────────────────────────────────────────────────────────

export const getProductBySlug = async (slug: string) =>
  prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { include: { parent: true } },
      manufacturer: true,
      supplier: { select: { id: true, name: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      attributes: {
        include: { attribute: true },
        orderBy: { attribute: { sortOrder: "asc" } },
      },
      documents: { orderBy: { sortOrder: "asc" } },
      fitments: {
        include: {
          brand: { select: { id: true, name: true, slug: true } },
          model: { select: { id: true, name: true, slug: true } },
          generation: { select: { id: true, name: true, slug: true, yearFrom: true, yearTo: true } },
        },
        orderBy: { brand: { name: "asc" } },
        take: 400,
      },
      reviews: {
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      questions: {
        where: { status: "published" },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 20,
      },
      relationsFrom: {
        include: { relatedProduct: { select: PRODUCT_CARD_SELECT } },
        orderBy: { sortOrder: "asc" },
      },
      relationsTo: {
        include: { product: { select: PRODUCT_CARD_SELECT } },
      },
      _count: { select: { reviews: { where: { status: "published" } }, questions: { where: { status: "published" } } } },
    },
  });

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

/** Похожие товары: та же категория, исключая текущий. */
export async function getSimilarProducts(productId: string, categoryId: string, take = 8) {
  return prisma.product.findMany({
    where: { isActive: true, categoryId, id: { not: productId } },
    orderBy: [{ isHit: "desc" }, { salesCount: "desc" }],
    take,
    select: PRODUCT_CARD_SELECT,
  });
}

/** Аксессуары к товару — допродажи (смазка, сумка, электрика и т.п.). */
export async function getAccessories(productId: string, categoryId: string, take = 4) {
  const explicit = await prisma.productRelation.findMany({
    where: { productId, type: { in: ["accessory", "similar"] } },
    orderBy: { sortOrder: "asc" },
    take,
    include: { relatedProduct: { select: PRODUCT_CARD_SELECT } },
  });
  if (explicit.length) return explicit.map((relation) => relation.relatedProduct);

  return prisma.product.findMany({
    where: {
      isActive: true,
      id: { not: productId },
      category: { slug: { in: ["krepezh-i-aksessuary", "aksessuary"] } },
    },
    orderBy: [{ isHit: "desc" }],
    take,
    select: PRODUCT_CARD_SELECT,
  });
}

/** Аналоги — замены товара (ниша: этого блока нет ни у одного конкурента). */
export async function getAnalogs(productId: string, categoryId: string, take = 6) {
  const explicit = await prisma.productRelation.findMany({
    where: { productId, type: "analog" },
    include: { relatedProduct: { select: PRODUCT_CARD_SELECT } },
    take,
  });
  if (explicit.length) return explicit.map((relation) => relation.relatedProduct);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { manufacturerId: true, capacityKg: true },
  });
  if (!product) return [];

  return prisma.product.findMany({
    where: {
      isActive: true,
      id: { not: productId },
      categoryId,
      ...(product.manufacturerId ? { manufacturerId: { not: product.manufacturerId } } : {}),
      ...(product.capacityKg
        ? { capacityKg: { gte: Math.round(product.capacityKg * 0.7), lte: Math.round(product.capacityKg * 1.3) } }
        : {}),
    },
    orderBy: [{ ratingAvg: "desc" }],
    take,
    select: PRODUCT_CARD_SELECT,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Витрины главной страницы
// ─────────────────────────────────────────────────────────────────────────────

export async function getFeaturedProducts(take = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    orderBy: [{ isHit: "desc" }, { salesCount: "desc" }],
    take,
    select: PRODUCT_CARD_SELECT,
  });
}

export async function getHitProducts(take = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isHit: true },
    orderBy: [{ salesCount: "desc" }, { ratingCount: "desc" }],
    take,
    select: PRODUCT_CARD_SELECT,
  });
}

export async function getNewProducts(take = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isNew: true },
    orderBy: { createdAt: "desc" },
    take,
    select: PRODUCT_CARD_SELECT,
  });
}

export async function getSaleProducts(take = 8) {
  return prisma.product.findMany({
    where: { isActive: true, oldPrice: { not: null } },
    orderBy: { updatedAt: "desc" },
    take,
    select: PRODUCT_CARD_SELECT,
  });
}

/** Товары, подходящие к выбранному авто (используется на главной после подбора). */
export async function getProductsForCar(
  car: { brandSlug?: string; modelSlug?: string; generationSlug?: string; modificationId?: string },
  options?: { categorySlug?: string; take?: number; page?: number },
) {
  return getProducts({
    car,
    categorySlug: options?.categorySlug,
    perPage: options?.take ?? PER_PAGE,
    page: options?.page,
    sort: "popular",
  });
}

/**
 * Товары по списку id с сохранением порядка запроса.
 * Используется страницами сравнения и избранного (id лежат в localStorage).
 */
export async function getProductsByIds(ids: string[]): Promise<ProductCard[]> {
  const unique = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))].slice(0, 50);
  if (!unique.length) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: unique }, isActive: true },
    select: PRODUCT_CARD_SELECT,
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  return unique.map((id) => byId.get(id)).filter((product): product is ProductCard => Boolean(product));
}

/**
 * Марки авто, для которых есть товары-«специфичные» (fitment), с количеством
 * товаров — для блока «Подбор по автомобилю» в каталоге и на /brands.
 */
export async function getCarBrandsWithProducts(): Promise<
  { id: string; name: string; slug: string; popular: boolean; productsCount: number }[]
> {
  const fitments = await prisma.fitment.findMany({
    where: { product: { isActive: true } },
    select: { brandId: true, productId: true },
  });
  if (!fitments.length) return [];

  const productIdsByBrand = new Map<string, Set<string>>();
  for (const fitment of fitments) {
    const set = productIdsByBrand.get(fitment.brandId) ?? new Set<string>();
    set.add(fitment.productId);
    productIdsByBrand.set(fitment.brandId, set);
  }

  const brands = await prisma.brand.findMany({
    where: { id: { in: [...productIdsByBrand.keys()] }, isActive: true },
    select: { id: true, name: true, slug: true, popular: true },
  });

  return brands
    .map((brand) => ({ ...brand, productsCount: productIdsByBrand.get(brand.id)?.size ?? 0 }))
    .sort(
      (a, b) =>
        Number(b.popular) - Number(a.popular) ||
        b.productsCount - a.productsCount ||
        a.name.localeCompare(b.name, "ru"),
    );
}

/** Уникальные значения колонок-фасетов (место установки, материал) — для чипсов и сайдбара. */
export async function getFilterOptionValues(): Promise<{ mountPlaces: string[]; materials: string[] }> {
  const [mountPlaces, materials] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, mountPlace: { not: null } },
      select: { mountPlace: true },
      distinct: ["mountPlace"],
      orderBy: { mountPlace: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true, material: { not: null } },
      select: { material: true },
      distinct: ["material"],
      orderBy: { material: "asc" },
    }),
  ]);
  return {
    mountPlaces: mountPlaces.map((row) => row.mountPlace).filter((value): value is string => Boolean(value)),
    materials: materials.map((row) => row.material).filter((value): value is string => Boolean(value)),
  };
}

/** Опубликованные отзывы пользователя — для личного кабинета (используется смежным модулем). */
export async function getReviewsByUser(userId: string) {
  return prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { id: true, name: true, slug: true } } },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Контент, города, доставка
// ─────────────────────────────────────────────────────────────────────────────

export const getBanners = async (position = "hero", now = new Date()) =>
  prisma.banner.findMany({
    where: {
      isActive: true,
      position,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

export const getPageBySlug = async (slug: string) =>
  prisma.page.findFirst({ where: { slug, isPublished: true } });

export const getFooterPages = async () =>
  prisma.page.findMany({
    where: { isPublished: true, showInFooter: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, title: true },
  });

export const getHeaderPages = async () =>
  prisma.page.findMany({
    where: { isPublished: true, showInHeader: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, title: true },
  });

export const getCities = async () =>
  prisma.city.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

export const getDefaultCity = async () => {
  const city = await prisma.city.findFirst({ where: { isDefault: true, isActive: true } });
  if (city) return city;
  return prisma.city.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
};

export const getCityBySlug = async (slug: string) =>
  prisma.city.findFirst({ where: { slug, isActive: true } });

export const getDeliveryTariffs = async (cityId?: string) =>
  prisma.deliveryTariff.findMany({
    where: { isActive: true, ...(cityId ? { cityId } : {}) },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
  });

export const getPickupPoints = async (cityId: string, provider?: string) =>
  prisma.pickupPoint.findMany({
    where: { cityId, isActive: true, ...(provider ? { provider } : {}) },
    orderBy: { address: "asc" },
  });

// ─────────────────────────────────────────────────────────────────────────────
// Гараж покупателя
// ─────────────────────────────────────────────────────────────────────────────

/** Сохранённые авто пользователя — наша фишка, у конкурентов её нет. */
export const getSavedCars = async (userId: string) =>
  prisma.savedCar.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      model: { select: { id: true, name: true, slug: true } },
      generation: { select: { id: true, name: true, slug: true, yearFrom: true, yearTo: true } },
      modification: { select: { id: true, name: true, engine: true, volume: true, power: true } },
    },
  });

/** Счётчик товаров, подходящих к каждому сохранённому авто. */
export async function getSavedCarsWithCounts(userId: string) {
  const cars = await getSavedCars(userId);
  return Promise.all(
    cars.map(async (car) => {
      const count = await prisma.product.count({
        where: {
          isActive: true,
          OR: [
            { fitmentType: "universal" },
            {
              fitments: {
                some: {
                  brandId: car.brandId,
                  ...(car.modelId ? { OR: [{ modelId: null }, { modelId: car.modelId }] } : {}),
                },
              },
            },
          ],
        },
      }),
      return { ...car, productsCount: count };
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Поиск и подсказки
// ─────────────────────────────────────────────────────────────────────────────

export async function searchProducts(term: string, take = 10) {
  if (!term.trim()) return [];
  return prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { brandName: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: [{ isHit: "desc" }],
    take,
    select: PRODUCT_CARD_SELECT,
  });
}

export async function searchBrandsAndModels(term: string, take = 8) {
  if (!term.trim()) return { brands: [], models: [] };
  const [brands, models] = await Promise.all([
    prisma.brand.findMany({
      where: { isActive: true, name: { contains: term, mode: "insensitive" } },
      take,
      select: { id: true, name: true, slug: true },
    }),
    prisma.carModel.findMany({
      where: { isActive: true, name: { contains: term, mode: "insensitive" } },
      take,
      select: { id: true, name: true, slug: true, brand: { select: { name: true, slug: true } } },
    }),
  ]);
  return { brands, models };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO-посадочные: авто → товары
// ─────────────────────────────────────────────────────────────────────────────

/** Марки/модели/поколения, у которых есть товары — источник sitemap и посадочных. */
export async function getCarLandingTree() {
  const fitments = await prisma.fitment.findMany({
    where: { product: { isActive: true } },
    select: {
      brand: { select: { slug: true, name: true } },
      model: { select: { slug: true, name: true } },
      generation: { select: { slug: true, name: true } },
    },
    distinct: ["brandId", "modelId", "generationId"],
  });

  const brands = new Map<string, { slug: string; name: string; models: Map<string, { slug: string; name: string; generations: Map<string, { slug: string; name: string }> }> }>();
  for (const fitment of fitments) {
    if (!fitment.brand) continue;
    const brand = brands.get(fitment.brand.slug) ?? {
      slug: fitment.brand.slug,
      name: fitment.brand.name,
      models: new Map(),
    };
    if (fitment.model) {
      const model = brand.models.get(fitment.model.slug) ?? {
        slug: fitment.model.slug,
        name: fitment.model.name,
        generations: new Map(),
      };
      if (fitment.generation) {
        model.generations.set(fitment.generation.slug, {
          slug: fitment.generation.slug,
          name: fitment.generation.name,
        });
      }
      brand.models.set(fitment.model.slug, model);
    }
    brands.set(fitment.brand.slug, brand);
  }

  return [...brands.values()].map((brand) => ({
    ...brand,
    models: [...brand.models.values()].map((model) => ({
      ...model,
      generations: [...model.generations.values()],
    })),
  }));
}

/** Товары под конкретное авто с группировкой по категориям (для посадочной /podbor/[brand]/[model]). */
export async function getCarLandingProducts(params: {
  brandSlug: string;
  modelSlug?: string;
  generationSlug?: string;
}) {
  const car = await getCarContext(params);
  if (!car) return null;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { fitmentType: "universal" },
        {
          fitments: {
            some: {
              brandId: car.brand.id,
              ...(car.model ? { OR: [{ modelId: null }, { modelId: car.model.id }] } : {}),
              ...(car.generation ? { OR: [{ generationId: null }, { generationId: car.generation.id }] } : {}),
            },
          },
        },
      ],
    },
    orderBy: [{ isHit: "desc" }, { price: "asc" }],
    select: { ...PRODUCT_CARD_SELECT, categoryId: true },
  });

  const byCategory = new Map<string, { name: string; slug: string; items: ProductCard[] }>();
  for (const product of products) {
    const key = product.category.slug;
    const entry = byCategory.get(key) ?? { name: product.category.name, slug: product.category.slug, items: [] };
    entry.items.push(product);
    byCategory.set(key, entry);
  }

  return { car, products, groups: [...byCategory.values()] };
}
