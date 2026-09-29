import Link from "next/link";
import { Alert, Badge, Breadcrumbs, EmptyState, PageHero, Prose } from "@/components/ui";
import { CarLandingGroups, LandingContainer, LandingNavBlock } from "@/components/catalog/car-landing-groups";
import type { ProductCard as ProductCardData } from "@/lib/queries";
import { breadcrumbsJsonLd, itemListJsonLd } from "@/lib/seo";
import { productWord } from "@/lib/utils";

export type LandingCrumb = { name: string; href?: string };

/**
 * Общий каркас SEO-посадочной страницы «авто → товары»:
 * крошки, H1, счётчик, группы товаров, блоки перелинковки, SEO-текст и JSON-LD.
 * Используется страницами /podbor/[brand], /[model] и /[generation].
 */
export function CarLandingLayout({
  crumbs,
  title,
  intro,
  carLabel,
  groups,
  products,
  brandSlug,
  modelSlug,
  generationSlug,
  navBlocks,
  seoHtml,
  emptyAction,
}: {
  crumbs: LandingCrumb[];
  title: string;
  intro: string;
  carLabel: string;
  groups: { name: string; slug: string; items: ProductCardData[] }[];
  products: ProductCardData[];
  brandSlug: string;
  modelSlug?: string;
  generationSlug?: string;
  navBlocks: { title: string; links: { name: string; href: string; note?: string }[] }[];
  seoHtml: string;
  emptyAction?: { href: string; label: string };
}) {
  const search = new URLSearchParams({ marka: brandSlug });
  if (modelSlug) search.set("model", modelSlug);
  if (generationSlug) search.set("pokolenie", generationSlug);

  return (
    <>
      <PageHero
        title={title}
        description={intro}
        breadcrumbs={crumbs}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">
            {products.length} {productWord(products.length)} в наличии
          </Badge>
          <Link
            href={`/catalog?${search.toString()}`}
            className="rounded-xl border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
          >
            Все товары в каталоге
          </Link>
        </div>
      </PageHero>

      <LandingContainer>
        {products.length === 0 ? (
          <div className="flex flex-col gap-4">
            <EmptyState
              title={`Товаров для ${carLabel} пока нет в наличии`}
              description="Оставьте заявку — подберём совместимые варианты по каталогам производителей, включая универсальные. Ответим в течение рабочего дня."
              action={
                emptyAction ? (
                  <Link
                    href={emptyAction.href}
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    {emptyAction.label}
                  </Link>
                ) : (
                  <Link
                    href="/podbor"
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Оставить заявку на подбор
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <CarLandingGroups
            groups={groups}
            brandSlug={brandSlug}
            modelSlug={modelSlug}
            generationSlug={generationSlug}
          />
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {navBlocks.map((block) => (
            <LandingNavBlock key={block.title} title={block.title} links={block.links} />
          ))}
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          <h2 className="text-xl font-bold text-ink-900">
            Что учесть при подборе для {carLabel}
          </h2>
          <Prose className="mt-3" html={seoHtml} />
          <Alert variant="info" className="mt-4">
            Не уверены в совместимости? Пришлите VIN — проверим по заводским таблицам производителя и
            предложим варианты, в том числе универсальные.{" "}
            <Link href="/podbor" className="underline">
              Заявка на подбор
            </Link>
            .
          </Alert>
        </div>

        <Alert variant="success" title="Установим и оформим документы">
          Багажники, автобоксы и фаркопы устанавливаем в сервисе. Для ТСУ выдаём паспорт изделия и
          сертификат соответствия — они нужны для регистрации в ГИБДД.
        </Alert>
      </LandingContainer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd(crumbs)) }}
      />
      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              itemListJsonLd(
                products.slice(0, 20).map((product) => ({
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

/** Блок перелинковки «Другие марки». */
export function otherBrandsLinks(
  tree: { slug: string; name: string; models: unknown[] }[],
  currentSlug: string,
): { name: string; href: string; note?: string }[] {
  return tree
    .filter((brand) => brand.slug !== currentSlug)
    .slice(0, 20)
    .map((brand) => ({
      name: brand.name,
      href: `/podbor/${brand.slug}`,
      note: brand.models.length ? `${brand.models.length}` : undefined,
    }));
}
