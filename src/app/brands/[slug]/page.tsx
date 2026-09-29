import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, Breadcrumbs, Container, EmptyState, Pagination, Prose } from "@/components/ui";
import { ProductGrid } from "@/components/catalog/product-card";
import {
  getBrandBySlug,
  getGenerations,
  getManufacturerBySlug,
  getProducts,
} from "@/lib/queries";
import { buildMetadata, breadcrumbsJsonLd, itemListJsonLd } from "@/lib/seo";
import { PER_PAGE } from "@/lib/constants";
import { formatPrice, formatYears, toInt, productWord } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [manufacturer, carBrand] = await Promise.all([
    getManufacturerBySlug(slug).catch(() => null),
    getBrandBySlug(slug).catch(() => null),
  ]);

  if (!manufacturer && !carBrand) {
    return buildMetadata({ title: "Бренд не найден", path: `/brands/${slug}`, noIndex: true });
  }

  if (manufacturer && manufacturer.productCount > 0) {
    return buildMetadata({
      title: `${manufacturer.brand.name} — багажники, автобоксы и крепления | Garage19`,
      description: `${manufacturer.brand.name}: ${manufacturer.productCount} товаров в каталоге, цены от ${formatPrice(manufacturer.priceMin)}. Подбор по автомобилю, доставка по России, установка в сервисе.`,
      path: `/brands/${slug}`,
    });
  }

  const name = carBrand?.name ?? slug;
  return buildMetadata({
    title: `Багажники и фаркопы для ${name} — подбор по модели и поколению`,
    description: `Подбор багажников на крышу, автобоксов, велокреплений и фаркопов (ТСУ) для ${name}. Совместимость по модели, поколению и модификации, наличие на складе.`,
    path: `/brands/${slug}`,
  });
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  const [{ slug }, rawParams] = await Promise.all([params, searchParams]);
  const [manufacturer, carBrand] = await Promise.all([
    getManufacturerBySlug(slug).catch(() => null),
    getBrandBySlug(slug).catch(() => null),
  ]);
  if (!manufacturer && !carBrand) notFound();

  const page = Math.max(1, toInt(rawParams.page, 1) ?? 1);
  const isManufacturer = Boolean(manufacturer && manufacturer.productCount > 0);

  const products = isManufacturer
    ? await getProducts({
        manufacturerSlugs: [slug],
        sort: "popular",
        page,
        perPage: PER_PAGE,
      }).catch(() => null)
    : null;

  // Поколения для моделей марки авто (для ссылок «марка → модель → поколение»).
  const modelsWithGenerations = carBrand
    ? await Promise.all(
        carBrand.models.slice(0, 24).map(async (model) => ({
          model,
          generations: await getGenerations(slug, model.slug).catch(() => []),
        })),
      )
    : [];

  const name = manufacturer?.brand.name ?? carBrand?.name ?? slug;
  const crumbs: { name: string; href?: string }[] = [
    { name: "Производители и марки", href: "/brands" },
    { name },
  ];

  return (
    <>
      <div className="border-b border-ink-100 bg-white">
        <Container className="py-5 lg:py-7">
          <Breadcrumbs items={crumbs} />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink-900 lg:text-3xl">
                {isManufacturer
                  ? `${name} — товары в наличии`
                  : `Багажники и фаркопы для ${name}`}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-ink-500 lg:text-base">
                {isManufacturer && manufacturer
                  ? `В каталоге ${manufacturer.productCount} ${productWord(manufacturer.productCount)} этого бренда. Подберём комплект под ваш автомобиль.`
                  : `Подбираем товары по модели и поколению. Выберите модель ниже или откройте общий подбор.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isManufacturer && manufacturer && manufacturer.priceMin > 0 && (
                <Badge variant="brand">Цены от {formatPrice(manufacturer.priceMin)}</Badge>
              )}
              <Link
                href={isManufacturer ? `/catalog?z=${slug}` : `/catalog?marka=${slug}`}
                className="rounded-xl border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
              >
                {isManufacturer ? "Смотреть в каталоге" : "Показать товары для марки"}
              </Link>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-6">
        {isManufacturer && manufacturer && (
          <div className="flex flex-col gap-5">
            {manufacturer.categories.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {manufacturer.categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/catalog/${category.slug}?z=${slug}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:border-brand-300 hover:text-brand-700"
                    >
                      {category.name}
                      <span className="text-ink-400">{category.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {products && products.items.length > 0 ? (
              <>
                <ProductGrid products={products.items} />
                <Pagination
                  page={products.page}
                  totalPages={products.totalPages}
                  buildHref={(next) => (next === 1 ? `/brands/${slug}` : `/brands/${slug}?page=${next}`)}
                />
              </>
            ) : (
              <EmptyState
                title="Товары этой марки закончились"
                description="Загляните в каталог — возможно, есть аналог от другого производителя. Или оставьте заявку, подберём под ваш автомобиль."
                action={
                  <Link
                    href="/catalog"
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Открыть каталог
                  </Link>
                }
              />
            )}
          </div>
        )}

        {carBrand && (
          <div className={isManufacturer ? "mt-10" : undefined}>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-ink-900 lg:text-2xl">Модели {carBrand.name}</h2>
              <p className="mt-1.5 max-w-3xl text-sm text-ink-500">
                Выберите модель и поколение — покажем только совместимые товары
              </p>
            </div>
            {modelsWithGenerations.length === 0 ? (
              <EmptyState
                title="Справочник моделей наполняется"
                description="Оставьте заявку с VIN — подберём товары вручную и добавим модель в базу."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {modelsWithGenerations.map(({ model, generations }) => (
                  <article key={model.id} className="g19-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-ink-900">
                        <Link href={`/podbor/${slug}/${model.slug}`} className="hover:text-brand-700">
                          {model.name}
                        </Link>
                      </h3>
                      {model.yearFrom && (
                        <span className="text-xs text-ink-400">
                          {formatYears(model.yearFrom, model.yearTo)}
                        </span>
                      )}
                    </div>

                    {generations.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {generations.map((generation) => (
                          <li key={generation.id}>
                            <Link
                              href={`/podbor/${slug}/${model.slug}/${generation.slug}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-ink-50 px-2 py-1 text-xs font-medium text-ink-600 hover:bg-brand-50 hover:text-brand-700"
                            >
                              {generation.name}
                              <span className="text-ink-400">
                                {formatYears(generation.yearFrom, generation.yearTo)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-ink-400">Поколения уточняются</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                      <Link href={`/podbor/${slug}/${model.slug}`} className="text-brand-700 underline">
                        Товары для модели
                      </Link>
                      <Link
                        href={`/catalog?marka=${slug}&model=${model.slug}`}
                        className="text-ink-500 underline hover:text-brand-700"
                      >
                        В каталоге
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="g19-card mt-2 p-5">
          <h2 className="text-lg font-bold text-ink-900">
            {isManufacturer ? `О бренде ${name}` : `Что подходит для ${name}`}
          </h2>
          <Prose
            className="mt-2"
            html={
              isManufacturer
                ? `<p>${name} — один из брендов, с которыми мы работаем напрямую или через официальных поставщиков.
                   Все товары бренда проверены на совместимость с автомобилями из справочника.</p>
                   <p>Подобрать товар можно двумя способами: через каталог с фильтрами (производитель, цена,
                   место установки, материал, замок) или через подбор по автомобилю — марка, модель и поколение.
                   Если вашей модификации нет в базе, оставьте заявку: проверим совместимость по каталогу
                   производителя.</p>`
                : `<p>Багажные системы и фаркопы для ${name} подбираются по поколению и типу крыши. Для моделей
                   с рейлингами подходят поперечные дуги с креплением в рейлинг, для гладкой крыши — опоры с
                   зажимом за проём двери или штатные точки.</p>
                   <p>Фаркопы (ТСУ) для ${name} выбираются по тяговой нагрузке (обычно 1500–2500 кг) и
                   вертикальной нагрузке на шар (60–100 кг). К каждому фаркопу прилагаем паспорт и сертификат,
                   необходимые для регистрации в ГИБДД.</p>`
            }
          />
        </div>
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd(crumbs)) }}
      />
      {isManufacturer && products && products.items.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              itemListJsonLd(
                products.items.slice(0, 20).map((product) => ({
                  name: product.name,
                  url: `/product/${product.slug}`,
                })),
              ),
            ),
          }}
        />
      )}
      {carBrand && modelsWithGenerations.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              itemListJsonLd(
                modelsWithGenerations.slice(0, 20).map(({ model }) => ({
                  name: model.name,
                  url: `/podbor/${slug}/${model.slug}`,
                })),
              ),
            ),
          }}
        />
      )}
    </>
  );
}
