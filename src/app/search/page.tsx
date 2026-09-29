import Link from "next/link";
import type { Metadata } from "next";
import { Search as SearchIcon } from "lucide-react";
import { Badge, Breadcrumbs, Button, Container, EmptyState, Input, Pagination, Section } from "@/components/ui";
import { ProductGrid } from "@/components/catalog/product-card";
import { SortSelect, ViewSwitcher } from "@/components/catalog/filter-controls";
import { buildCatalogHref, parseCatalogQuery, toCatalogQuery } from "@/components/catalog/catalog-params";
import { getProducts, searchBrandsAndModels } from "@/lib/queries";
import { buildMetadata, breadcrumbsJsonLd, itemListJsonLd } from "@/lib/seo";
import { CORE_CATEGORIES, PER_PAGE } from "@/lib/constants";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readQuery(rawParams: Record<string, string | string[] | undefined>): string {
  const value = rawParams.q;
  const item = Array.isArray(value) ? value[0] : value;
  return item?.trim() ?? "";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const rawParams = await searchParams;
  const term = readQuery(rawParams);

  return buildMetadata({
    title: term ? `Поиск: ${term}` : "Поиск по каталогу",
    description: term
      ? `Результаты поиска «${term}»: багажники, автобоксы, велокрепления, лыжные крепления и фаркопы с подбором по автомобилю.`
      : "Поиск по каталогу Garage19: багажники на крышу, автобоксы, велокрепления, лыжные крепления и фаркопы (ТСУ).",
    path: "/search",
    noIndex: true,
  });
}

export default async function SearchPage({ searchParams }: PageProps) {
  const rawParams = await searchParams;
  const term = readQuery(rawParams);

  if (!term) {
    return (
      <>
        <div className="border-b border-ink-100 bg-white">
          <Container className="py-6">
            <Breadcrumbs items={[{ name: "Поиск" }]} />
            <h1 className="mt-3 text-2xl font-bold text-ink-900 lg:text-3xl">Поиск по каталогу</h1>
          </Container>
        </div>

        <Section>
          <form action="/search" method="get" className="flex flex-col gap-3 sm:flex-row" role="search">
            <label className="flex-1">
              <span className="sr-only">Поисковый запрос</span>
              <Input
                type="search"
                name="q"
                placeholder="Например: багажник на рейлинги Thule или фаркоп для Camry"
                autoFocus
                className="h-12"
              />
            </label>
            <Button type="submit" size="lg">
              <SearchIcon className="size-4" aria-hidden />
              Найти
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            {CORE_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/catalog/${category.slug}`}
                className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
              >
                {category.name}
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <EmptyState
              icon={<SearchIcon className="size-8" aria-hidden />}
              title="Введите запрос"
              description="Ищите по названию, артикулу или бренду. Ещё быстрее — подбор по автомобилю: марка, модель, поколение."
              action={
                <Link
                  href="/podbor"
                  className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Подбор по автомобилю
                </Link>
              }
            />
          </div>
        </Section>
      </>
    );
  }

  const state = parseCatalogQuery(rawParams);
  const query = toCatalogQuery({ ...state, category: "" });

  const [result, suggestions] = await Promise.all([
    getProducts({ ...query, search: term, perPage: PER_PAGE }),
    searchBrandsAndModels(term, 8).catch(() => ({ brands: [], models: [] })),
  ]);

  const totalLabel = `Найдено: ${result.total} ${plural(result.total, "товар", "товара", "товаров")}`;

  return (
    <>
      <div className="border-b border-ink-100 bg-white">
        <Container className="py-6">
          <Breadcrumbs items={[{ name: "Поиск" }]} />
          <h1 className="mt-3 text-2xl font-bold text-ink-900 lg:text-3xl">
            Результаты поиска: «{term}»
          </h1>

          <form action="/search" method="get" className="mt-4 flex flex-col gap-3 sm:flex-row" role="search">
            <label className="flex-1">
              <span className="sr-only">Поисковый запрос</span>
              <Input type="search" name="q" defaultValue={term} className="h-12" />
            </label>
            <Button type="submit" size="lg">
              <SearchIcon className="size-4" aria-hidden />
              Найти
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="brand">{totalLabel}</Badge>
            <Link
              href={`/catalog?search=${encodeURIComponent(term)}`}
              className="text-xs font-medium text-brand-700 underline"
            >
              Искать в каталоге с фильтрами
            </Link>
          </div>
        </Container>
      </div>

      <Container className="py-6">
        {(suggestions.brands.length > 0 || suggestions.models.length > 0) && (
          <div className="g19-card mb-5 p-4">
            <p className="text-sm font-semibold text-ink-900">Подсказки по автомобилям</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/podbor/${brand.slug}`}
                  className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
                >
                  Марка: {brand.name}
                </Link>
              ))}
              {suggestions.models.map((model) => (
                <Link
                  key={model.id}
                  href={`/podbor/${model.brand.slug}/${model.slug}`}
                  className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
                >
                  {model.brand.name} {model.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="g19-card mb-5 flex flex-wrap items-center justify-between gap-3 p-3">
          <SortSelect basePath="/search" />
          <ViewSwitcher basePath="/search" />
        </div>

        {result.items.length === 0 ? (
          <div className="flex flex-col gap-4">
            <EmptyState
              icon={<SearchIcon className="size-8" aria-hidden />}
              title={`По запросу «${term}» ничего не нашлось`}
              description="Проверьте написание или попробуйте искать по артикулу. Можно также открыть каталог с фильтрами или подобрать товар по автомобилю."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/search"
                    className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:border-brand-300"
                  >
                    Сбросить запрос
                  </Link>
                  <Link
                    href="/catalog"
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Открыть каталог
                  </Link>
                  <Link
                    href="/podbor"
                    className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:border-brand-300"
                  >
                    Подбор по автомобилю
                  </Link>
                </div>
              }
            />
          </div>
        ) : (
          <>
            <ProductGrid products={result.items} view={state.view} />
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              buildHref={(page) =>
                buildCatalogHref("/search", { ...rawParams, q: term }, { page: page === 1 ? null : page })
              }
              className="mt-6"
            />
          </>
        )}
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbsJsonLd([
              { name: "Главная", href: "/" },
              { name: "Поиск", href: "/search" },
            ]),
          ),
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
