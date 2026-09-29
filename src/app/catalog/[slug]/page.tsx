import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Package, Sparkles } from "lucide-react";
import { Alert, Badge, Breadcrumbs, Container, EmptyState, Pagination, Prose } from "@/components/ui";
import { ActiveFilterChips } from "@/components/catalog/active-filter-chips";
import { CarNotFoundRequest } from "@/components/catalog/car-not-found";
import { CarSelector, type CarSelectorBrand } from "@/components/catalog/car-selector";
import { CatalogFilterSidebar } from "@/components/catalog/filter-sidebar";
import { MobileFilterDrawer } from "@/components/catalog/mobile-filter-drawer";
import { ProductGrid } from "@/components/catalog/product-card";
import { SortSelect, ViewSwitcher } from "@/components/catalog/filter-controls";
import {
  buildCatalogHref,
  countActiveFilters,
  parseCatalogQuery,
  toCatalogQuery,
  type RawSearchParams,
} from "@/components/catalog/catalog-params";
import {
  getCarContext,
  getCarTree,
  getCategoryBySlug,
  getFacets,
  getProducts,
} from "@/lib/queries";
import { buildMetadata, breadcrumbsJsonLd, itemListJsonLd } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug).catch(() => null);
  if (!category) {
    return buildMetadata({ title: "Категория не найдена", path: `/catalog/${slug}`, noIndex: true });
  }

  return buildMetadata({
    title:
      category.seoTitle ??
      `${category.name} — купить с подбором по автомобилю | Garage19`,
    description:
      category.seoDescription ??
      category.description ??
      `${category.name}: ${category._count.products} товаров в наличии. Подбор по марке, модели и поколению автомобиля, доставка по России, установка в сервисе.`,
    keywords: category.seoKeywords,
    path: `/catalog/${category.slug}`,
  });
}

function crumbsFor(category: {
  name: string;
  slug: string;
  parent: { name: string; slug: string } | null;
}): { name: string; href?: string }[] {
  const crumbs: { name: string; href?: string }[] = [{ name: "Каталог", href: "/catalog" }];
  if (category.parent) {
    crumbs.push({ name: category.parent.name, href: `/catalog/${category.parent.slug}` });
  }
  crumbs.push({ name: category.name, href: `/catalog/${category.slug}` });
  return crumbs;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const [{ slug }, rawParams] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug).catch(() => null);
  if (!category) notFound();

  const categorySlug = category.slug;
  const basePath = `/catalog/${categorySlug}`;
  const state = parseCatalogQuery(rawParams, categorySlug);
  const query = toCatalogQuery(state);

  // Фасеты считаем в двух режимах: полном (со счётчиками по текущим фильтрам)
  // и «базовом» — без фасетных сужений, чтобы пользователь видел, что ещё доступно.
  const baseState = { ...state, manufacturers: [], mountPlaces: [], materials: [], attributes: [] };
  const [result, facets, baseFacets, carTree] = await Promise.all([
    getProducts(query),
    getFacets(query),
    getFacets(toCatalogQuery(baseState)),
    getCarTree().catch(() => [] as Awaited<ReturnType<typeof getCarTree>>),
  ]);

  const activeCount = countActiveFilters(state);
  const car = state.car.brandSlug
    ? await getCarContext({
        brandSlug: state.car.brandSlug,
        modelSlug: state.car.modelSlug,
        generationSlug: state.car.generationSlug,
        modificationId: state.car.modificationId,
      }).catch(() => null)
    : null;

  const carLabel = car
    ? [car.brand?.name, car.model?.name, car.generation?.name, car.modification?.name]
        .filter(Boolean)
        .join(" ")
    : undefined;

  const brands: CarSelectorBrand[] = carTree.map((brand) => ({
    slug: brand.slug,
    name: brand.name,
    popular: brand.popular,
    models: brand.models.map((model) => ({
      slug: model.slug,
      name: model.name,
      yearFrom: model.yearFrom,
      yearTo: model.yearTo,
      generations: model.generations.map((generation) => ({
        slug: generation.slug,
        name: generation.name,
        yearFrom: generation.yearFrom,
        yearTo: generation.yearTo,
        modifications: generation.modifications.map((modification) => ({
          id: modification.id,
          name: modification.name,
        })),
      })),
    })),
  }));

  const filterLabels: Record<string, string> = {};
  for (const manufacturer of facets.manufacturers) {
    filterLabels[`z:${manufacturer.slug}`] = manufacturer.name;
  }
  if (carLabel) filterLabels["car"] = carLabel;

  const sortedLabel = result.total === 0 ? "ничего не найдено" : `найдено ${result.total}`;

  const sidebar = (
    <CatalogFilterSidebar
      basePath={basePath}
      params={rawParams}
      state={state}
      facets={baseFacets}
      totals={facets}
      total={result.total}
    />
  );

  return (
    <>
      <div className="border-b border-ink-100 bg-white">
        <Container className="py-5 lg:py-7">
          <Breadcrumbs items={crumbsFor(category)} />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink-900 lg:text-3xl">{category.name}</h1>
              {category.description && (
                <p className="mt-2 max-w-3xl text-sm text-ink-500 lg:text-base">{category.description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                <Package className="size-3.5" aria-hidden /> {sortedLabel}
              </Badge>
              {carLabel && (
                <Badge variant="brand">
                  <Sparkles className="size-3.5" aria-hidden /> {carLabel}
                </Badge>
              )}
            </div>
          </div>

          {category.children && category.children.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {category.children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/catalog/${child.slug}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-600 hover:border-brand-300 hover:text-brand-700"
                  >
                    {child.name}
                    <span className="text-ink-400">{child._count.products}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </div>

      <Container className="py-6">
        <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-4 flex flex-col gap-4">
              <CarSelector brands={brands} selected={state.car} basePath={basePath} />
              {sidebar}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="lg:hidden">
              <CarSelector brands={brands} selected={state.car} basePath={basePath} />
            </div>

            <div className="g19-card flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <MobileFilterDrawer
                  activeCount={activeCount}
                  total={result.total}
                  basePath={basePath}
                >
                  {sidebar}
                </MobileFilterDrawer>
                <SortSelect basePath={basePath} />
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-ink-400 sm:inline">
                  Обновлено {formatDate(new Date())}
                </span>
                <ViewSwitcher basePath={basePath} />
              </div>
            </div>

            <ActiveFilterChips basePath={basePath} labels={filterLabels} carLabel={carLabel} />

            {result.items.length === 0 ? (
              <div className="flex flex-col gap-4">
                <EmptyState
                  icon={<Package className="size-8" aria-hidden />}
                  title="По вашим фильтрам ничего не нашлось"
                  description="Попробуйте убрать часть условий или оставьте заявку — подберём товар вручную, в том числе по VIN."
                  action={
                    <Link
                      href={basePath}
                      className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      Сбросить фильтры
                    </Link>
                  }
                />
                <CarNotFoundRequest
                  basePath={basePath}
                  carLabel={carLabel}
                  source={`catalog_empty:${categorySlug}`}
                />
              </div>
            ) : (
              <>
                <ProductGrid
                  products={result.items}
                  view={state.view}
                  filters={
                    state.car.brandSlug
                      ? {
                          marka: state.car.brandSlug,
                          model: state.car.modelSlug,
                          pokolenie: state.car.generationSlug,
                          mod: state.car.modificationId,
                        }
                      : undefined
                  }
                />
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  buildHref={(page) => buildCatalogHref(basePath, rawParams, { page: page === 1 ? null : page })}
                  className="mt-2"
                />
              </>
            )}

            {category.description && (
              <div className="g19-card p-5">
                <h2 className="text-lg font-bold text-ink-900">О разделе «{category.name}»</h2>
                <Prose className="mt-2" html={category.description} />
                <Alert variant="info" className="mt-4">
                  Подбираем комплект под ваш автомобиль: укажите марку и модель — покажем только совместимые
                  модели. Если нужной модификации нет в базе, оставьте заявку, проверим по каталогу
                  производителя.
                </Alert>
              </div>
            )}
          </div>
        </div>
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbsJsonLd(crumbsFor(category))),
        }}
      />
      {result.items.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              itemListJsonLd(
                result.items.slice(0, 20).map((product) => ({
                  name: product.name,
                  url: `/product/${product.slug}`,
                })),
              ),
            ),
          }}
        />
      )}
    </>
  );
}
