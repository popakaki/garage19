import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Car, Layers, Package } from "lucide-react";
import type { Metadata } from "next";
import { Alert, Badge, Container, CountBadge, EmptyState, PageHero, Prose, Section } from "@/components/ui";
import { CarSelector } from "@/components/catalog/car-selector";
import { ManufacturerCard } from "@/components/catalog/manufacturer-card";
import { getBrands, getCarTree, getCategoryTree, getManufacturers } from "@/lib/queries";
import { buildMetadata, breadcrumbsJsonLd, itemListJsonLd } from "@/lib/seo";
import { CORE_CATEGORIES } from "@/lib/constants";
import { productImage } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BREADCRUMBS = [{ name: "Каталог" }];

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Каталог: багажники на крышу, автобоксы, велокрепления и фаркопы",
    description:
      "Каталог Garage19: багажники на крышу, автобоксы, велокрепления, лыжные крепления, фаркопы (ТСУ) и аксессуары. Подбор по марке, модели и поколению автомобиля, наличие на складе, установка в сервисе.",
    keywords:
      "каталог багажников, автобоксы купить, велокрепления, фаркопы ТСУ, багажник на крышу по марке авто",
    path: "/catalog",
  });
}

/** Список категорий с фолбэком на пустой список, если БД недоступна. */
async function loadCategories() {
  try {
    return await getCategoryTree();
  } catch {
    return [];
  }
}

export default async function CatalogPage() {
  const [categories, manufacturers, carTree] = await Promise.all([
    loadCategories(),
    getManufacturers().catch(() => []),
    getCarTree().catch(() => []),
  ]);

  const popularBrands = carTree
    .filter((brand) => brand.popular)
    .map((brand) => ({
      slug: brand.slug,
      name: brand.name,
      popular: true,
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

  const brands = popularBrands.length
    ? popularBrands
    : (await getBrands({ popularOnly: true }).catch(() => [])).map((brand) => ({
        slug: brand.slug,
        name: brand.name,
        popular: brand.popular,
        models: [],
      }));

  const totalProducts = categories.reduce(
    (sum, category) => sum + category._count.products,
    0,
  );

  return (
    <>
      <PageHero
        title="Каталог багажных систем и фаркопов"
        description="Багажники на крышу, автобоксы, велокрепления, крепления для лыж и сноубордов, фаркопы (ТСУ) и аксессуары. Подберём комплект под ваш автомобиль и установим в сервисе."
        breadcrumbs={BREADCRUMBS}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">
            <Package className="size-3.5" aria-hidden /> {totalProducts} товаров
          </Badge>
          <Badge variant="outline">
            <Layers className="size-3.5" aria-hidden /> {categories.length} разделов
          </Badge>
        </div>
      </PageHero>

      <Container className="py-6">
        <CarSelector
          brands={brands}
          selected={{}}
          basePath="/catalog"
          variant="panel"
        />
      </Container>

      <Section title="Разделы каталога" subtitle="Выберите категорию — внутри работает фильтр по автомобилю и характеристикам">
        {categories.length === 0 ? (
          <EmptyState
            icon={<Package className="size-8" aria-hidden />}
            title="Каталог наполняется"
            description="Товары и категории появятся после загрузки прайсов. Пока можно оставить заявку — подберём вручную."
            action={
              <Link href="/podbor" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                Подбор по автомобилю
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {categories.map((category) => (
              <article key={category.id} className="g19-card overflow-hidden">
                <div className="flex flex-col gap-4 p-5 sm:flex-row">
                  <Link
                    href={`/catalog/${category.slug}`}
                    className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50 sm:h-28 sm:w-28"
                  >
                    <Image
                      src={productImage(
                        category.image ? [{ url: category.image, isPrimary: true }] : null,
                      )}
                      alt={category.name}
                      fill
                      sizes="112px"
                      className="object-contain p-2"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-ink-900">
                      <Link href={`/catalog/${category.slug}`} className="hover:text-brand-700">
                        {category.name}
                      </Link>
                      <CountBadge count={category._count.products} className="ml-2 align-middle" />
                    </h3>
                    {category.description && (
                      <p className="mt-1.5 line-clamp-3 text-sm text-ink-500">{category.description}</p>
                    )}

                    {category.children && category.children.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
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

                    <Link
                      href={`/catalog/${category.slug}`}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
                    >
                      Смотреть товары <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>

      {manufacturers.length > 0 && (
        <Section
          title="Производители"
          subtitle="Работаем с проверенными брендами багажных систем и ТСУ"
          action={
            <Link href="/brands" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              Все производители →
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {manufacturers.slice(0, 12).map((manufacturer) => (
              <ManufacturerCard
                key={manufacturer.id}
                manufacturer={manufacturer}
                compact
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Не знаете, что выбрать?">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="g19-card p-5">
            <Car className="size-6 text-brand-600" aria-hidden />
            <h3 className="mt-3 font-semibold text-ink-900">Подбор по автомобилю</h3>
            <p className="mt-1 text-sm text-ink-500">
              Укажите марку, модель и поколение — покажем только совместимые товары. Для универсальных
              багажников дополнительно проверим тип крыши.
            </p>
            <Link href="/podbor" className="mt-3 inline-block text-sm font-semibold text-brand-700">
              Перейти к подбору →
            </Link>
          </div>
          <div className="g19-card p-5">
            <Layers className="size-6 text-brand-600" aria-hidden />
            <h3 className="mt-3 font-semibold text-ink-900">Нет вашей модификации?</h3>
            <p className="mt-1 text-sm text-ink-500">
              Пришлите VIN — проверим совместимость по заводским таблицам производителей и предложим
              варианты, включая универсальные.
            </p>
            <Link href="/podbor" className="mt-3 inline-block text-sm font-semibold text-brand-700">
              Оставить заявку →
            </Link>
          </div>
          <div className="g19-card p-5">
            <Package className="size-6 text-brand-600" aria-hidden />
            <h3 className="mt-3 font-semibold text-ink-900">Установка в сервисе</h3>
            <p className="mt-1 text-sm text-ink-500">
              Установим багажник, автобокс или фаркоп с электрикой. Для ТСУ выдаём паспорт и
              сертификат — они нужны для регистрации в ГИБДД.
            </p>
            <Link href="/catalog/farkopy" className="mt-3 inline-block text-sm font-semibold text-brand-700">
              Фаркопы (ТСУ) →
            </Link>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="g19-card p-5 lg:col-span-2">
            <h2 className="text-xl font-bold text-ink-900">Как выбрать багажную систему</h2>
            <Prose
              className="mt-3"
              html={`
                <p>Багажник на крышу состоит из двух частей: опоры (крепления к кузову) и дуг. Опоры подбираются
                строго под автомобиль — важны тип крыши (гладкая, штатные места, рейлинги, водосточный желоб) и
                количество дверей. Дуги выбираются по длине и профилю: аэродинамические тише и экономичнее,
                прямоугольные дешевле и проще в обслуживании.</p>
                <p>Грузоподъёмность большинства легковых багажников — 50–100 кг. Ограничение задаёт не дуга,
                а кузов автомобиля: всегда смотрите инструкцию производителя. Для перевозки лыж, велосипедов и
                боксов на дуги ставятся специализированные крепления — их можно комбинировать на одной паре дуг.</p>
                <p>Фаркоп (ТСУ) подбирается по тяговой и вертикальной нагрузке, а также по необходимости выреза
                бампера и наличию электрики. Для регистрации в ГИБДД нужны паспорт изделия и сертификат
                соответствия — мы прикладываем оба документа к каждому фаркопу.</p>
              `}
            />
          </div>
          <div className="g19-card p-5">
            <h2 className="text-lg font-bold text-ink-900">Популярные разделы</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {CORE_CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/catalog/${category.slug}`}
                    className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    {category.name}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            {(manufacturers.length > 0 || categories.length > 0) && (
              <Alert variant="info" className="mt-4">
                Не уверены в выборе? Позвоните — поможем подобрать комплект под ваши задачи и бюджет.
              </Alert>
            )}
          </div>
        </div>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbsJsonLd([{ name: "Главная", href: "/" }, { name: "Каталог", href: "/catalog" }]),
          ),
        }}
      />
      {categories.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              itemListJsonLd(
                categories.map((category) => ({
                  name: category.name,
                  url: `/catalog/${category.slug}`,
                })),
              ),
            ),
          }}
        />
      )}
    </>
  );
}
