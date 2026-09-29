import Link from "next/link";
import type { Metadata } from "next";
import { Car } from "lucide-react";
import { Alert, Badge, Breadcrumbs, Container, EmptyState, PageHero, Prose } from "@/components/ui";
import { CarSelector, type CarSelectorBrand } from "@/components/catalog/car-selector";
import { getCarLandingTree, getCarTree } from "@/lib/queries";
import { buildMetadata, breadcrumbsJsonLd } from "@/lib/seo";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CRUMBS = [{ name: "Подбор по автомобилю" }];

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Подбор багажника и фаркопа по автомобилю — марка, модель, поколение",
    description:
      "Подберите багажник на крышу, автобокс, велокрепление или фаркоп (ТСУ) по марке, модели, поколению и модификации автомобиля. Готовые страницы совместимости для популярных авто.",
    keywords:
      "подбор багажника по автомобилю, багажник на крышу по марке авто, подбор фаркопа по модели, совместимость автобагажников",
    path: "/podbor",
  });
}

export default async function PodborPage() {
  const [carTree, landingTree] = await Promise.all([
    getCarTree().catch(() => []),
    getCarLandingTree().catch(() => []),
  ]);

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

  const landings = landingTree
    .map((brand) => ({
      ...brand,
      modelsCount: brand.models.length,
    }))
    .sort((a, b) => b.modelsCount - a.modelsCount || a.name.localeCompare(b.name, "ru"));

  return (
    <>
      <PageHero
        title="Подбор по автомобилю"
        description="Выберите марку, модель и поколение — покажем только совместимые багажники, автобоксы, крепления и фаркопы."
        breadcrumbs={CRUMBS}
      >
        <Badge variant="brand">
          <Car className="size-3.5" aria-hidden /> {landings.length}{" "}
          {plural(landings.length, "марка", "марки", "марок")} с подобранными товарами
        </Badge>
      </PageHero>

      <Container className="flex flex-col gap-6 py-6">
        <CarSelector brands={brands} selected={{}} basePath="/catalog" variant="panel" />

        {landings.length === 0 ? (
          <EmptyState
            icon={<Car className="size-8" aria-hidden />}
            title="Справочник совместимости наполняется"
            description="Оставьте заявку с VIN или описанием автомобиля — подберём товары вручную и добавим модель в базу."
          />
        ) : (
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-ink-900 lg:text-2xl">Готовые страницы подбора</h2>
              <p className="mt-1.5 max-w-3xl text-sm text-ink-500">
                Совместимость подтверждена производителем — на странице собраны все подходящие товары по
                категориям
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {landings.map((brand) => (
                <article key={brand.slug} className="g19-card p-4">
                  <h3 className="font-semibold text-ink-900">
                    <Link href={`/podbor/${brand.slug}`} className="hover:text-brand-700">
                      {brand.name}
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs text-ink-400">
                    {brand.modelsCount} {plural(brand.modelsCount, "модель", "модели", "моделей")}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {brand.models.slice(0, 6).map((model) => (
                      <li key={model.slug}>
                        <Link
                          href={`/podbor/${brand.slug}/${model.slug}`}
                          className="inline-flex rounded-lg bg-ink-50 px-2 py-1 text-xs font-medium text-ink-600 hover:bg-brand-50 hover:text-brand-700"
                        >
                          {model.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/podbor/${brand.slug}`}
                    className="mt-3 inline-block text-xs font-semibold text-brand-700 underline"
                  >
                    Все товары для {brand.name} →
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="g19-card p-5">
          <h2 className="text-xl font-bold text-ink-900">Как работает подбор</h2>
          <Prose
            className="mt-3"
            html={`
              <p>Совместимость в нашей базе хранится на четырёх уровнях: марка → модель → поколение → модификация.
              Чем точнее уровень, тем надёжнее результат. Для багажников на крышу решающее значение имеет тип
              крыши и способ крепления: рейлинги, штатные места, гладкая крыша или водосточный желоб. Для
              фаркопов — тяговая и вертикальная нагрузка, вырез бампера и комплект электрики.</p>
              <p>Если товар универсальный, он подходит большинству автомобилей с подходящим типом крепления —
              такие позиции мы показываем отдельной плашкой. Если точного совпадения нет, страница не остаётся
              пустой: можно оставить заявку с VIN, и менеджер проверит совместимость по каталогам
              производителей.</p>
              <p>Готовые страницы подбора — самый быстрый путь: они уже собраны под конкретные марки, модели и
              поколения и обновляются вместе с остатками на складе.</p>
            `}
          />
          <Alert variant="info" className="mt-4">
            Не нашли свой автомобиль?{" "}
            <Link href="/catalog" className="underline">
              Откройте каталог
            </Link>{" "}
            и оставьте заявку на подбор — ответим в течение рабочего дня.
          </Alert>
        </div>
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbsJsonLd([
              { name: "Главная", href: "/" },
              { name: "Подбор по автомобилю", href: "/podbor" },
            ]),
          ),
        }}
      />
    </>
  );
}
