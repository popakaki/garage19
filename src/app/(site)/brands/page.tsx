import Link from "next/link";
import type { Metadata } from "next";
import { Factory, Package } from "lucide-react";
import { Alert, Badge, Container, EmptyState, PageHero, Prose, Section } from "@/components/ui";
import { BrandsView } from "@/components/catalog/brands-view";
import { ManufacturerCard } from "@/components/catalog/manufacturer-card";
import { getCarBrandsWithProducts, getManufacturers } from "@/lib/queries";
import { buildMetadata, breadcrumbsJsonLd, itemListJsonLd } from "@/lib/seo";
import { plural, productWord } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CRUMBS = [{ name: "Производители и марки" }];

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Производители багажников, автобоксов и фаркопов — каталог брендов",
    description:
      "Производители багажных систем и ТСУ (Thule, Atera, Menabo, Turtle, Lux, Atlant, TowRus, Auto-Hak, Bosal/Oris) и марки автомобилей, для которых подбираем товары. Подбор по марке, модели и поколению.",
    keywords: "производители багажников, бренды фаркопов, марки автомобилей, подбор багажника по марке авто",
    path: "/brands",
  });
}

export default async function BrandsPage() {
  const [manufacturers, carBrands] = await Promise.all([
    getManufacturers().catch(() => []),
    getCarBrandsWithProducts().catch(() => []),
  ]);

  const grouped = new Map<string, typeof carBrands>();
  for (const brand of carBrands) {
    const letter = brand.name.charAt(0).toUpperCase();
    const list = grouped.get(letter) ?? [];
    list.push(brand);
    grouped.set(letter, list);
  }
  const letters = [...grouped.keys()].sort((a, b) => a.localeCompare(b, "ru"));

  const totalProducts = manufacturers.reduce((sum, item) => sum + item.productCount, 0);

  const manufacturersPanel =
    manufacturers.length === 0 ? (
      <EmptyState
        icon={<Factory className="size-8" aria-hidden />}
        title="Производители пока не заполнены"
        description="Список появится после загрузки каталога. Позвоните или оставьте заявку — подскажем, что есть в наличии."
      />
    ) : (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">
            <Factory className="size-3.5" aria-hidden /> {manufacturers.length} производителей
          </Badge>
          <Badge variant="outline">
            <Package className="size-3.5" aria-hidden /> {totalProducts} товаров
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {manufacturers.map((manufacturer) => (
            <ManufacturerCard key={manufacturer.id} manufacturer={manufacturer} />
          ))}
        </div>

        <div className="g19-card p-5">
          <h2 className="text-xl font-bold text-ink-900">Как выбрать производителя</h2>
          <Prose
            className="mt-3"
            html={`
              <p>Багажные системы делятся на три ценовых уровня. Премиум — Thule, Atera, Whispbar: аэродинамические
              дуги, точная геометрия, богатая экосистема креплений. Средний уровень — Menabo, Turtle, Lux, Atlant,
              Piligrim: оптимальное соотношение цены и качества, большинство моделей с замками. Бюджетный —
              универсальные комплекты, которые подходят на несколько типов крыши.</p>
              <p>Фаркопы (ТСУ) выбирают по тяговой и вертикальной нагрузке и по типу крюка. Популярные марки —
              TowRus, Auto-Hak, Bosal/Oris, Baltex, Galia, AvtoS. Для регистрации в ГИБДД нужны паспорт изделия и
              сертификат соответствия: мы прикладываем оба документа к каждому фаркопу.</p>
              <p>Если не знаете, какой бренд предпочесть, — позвоните. Мы подбираем комплект под конкретный
              автомобиль и задачи: перевозка лыж, велосипедов, бокса, прицепа или водного снаряжения.</p>
            `}
          />
        </div>
      </div>
    );

  const carsPanel =
    carBrands.length === 0 ? (
      <EmptyState
        icon={<Package className="size-8" aria-hidden />}
        title="Справочник совместимости наполняется"
        description="Пришлите VIN или марку и модель — подберём товары вручную и добавим автомобиль в базу."
      />
    ) : (
      <div className="flex flex-col gap-5">
        <Alert variant="info">
          Товары подбираются по схеме «марка → модель → поколение → модификация». Всего в базе{" "}
          {carBrands.length} {plural(carBrands.length, "марка", "марки", "марок")} — если вашей нет,
          {" "}
          <Link href="/podbor" className="underline">
            оставьте заявку на подбор
          </Link>
          .
        </Alert>

        <nav aria-label="Алфавитный указатель" className="flex flex-wrap gap-1.5">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-ink-200 bg-white text-sm font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
            >
              {letter}
            </a>
          ))}
        </nav>

        {letters.map((letter) => (
          <section key={letter} id={`letter-${letter}`} className="g19-card p-5">
            <h2 className="text-lg font-bold text-ink-900">{letter}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(grouped.get(letter) ?? []).map((brand) => (
                <li key={brand.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link
                    href={`/brands/${brand.slug}`}
                    className="font-medium text-ink-800 hover:text-brand-700"
                  >
                    {brand.name}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-ink-400">
                    {brand.productsCount} {productWord(brand.productsCount)}
                    <Link href={`/podbor/${brand.slug}`} className="text-brand-700 underline">
                      подбор
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );

  return (
    <>
      <PageHero
        title="Производители и марки"
        description="Бренды багажных систем и ТСУ, а также марки автомобилей, для которых мы подбираем товары."
        breadcrumbs={CRUMBS}
      />
      <Container className="py-6">
        <BrandsView manufacturers={manufacturersPanel} cars={carsPanel} defaultTab="manufacturers" />
      </Container>

      <Section title="Почему стоит покупать у нас" className="pt-0">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="g19-card p-5">
            <h3 className="font-semibold text-ink-900">Только совместимые товары</h3>
            <p className="mt-1 text-sm text-ink-500">
              Проверяем совместимость по заводским таблицам производителей, а не «на глаз». Для
              универсальных багажников уточняем тип крыши.
            </p>
          </div>
          <div className="g19-card p-5">
            <h3 className="font-semibold text-ink-900">Паспорт и сертификат</h3>
            <p className="mt-1 text-sm text-ink-500">
              К каждому фаркопу прилагаем паспорт изделия и сертификат соответствия — без них
              регистрация ТСУ в ГИБДД невозможна.
            </p>
          </div>
          <div className="g19-card p-5">
            <h3 className="font-semibold text-ink-900">Установка и гарантия</h3>
            <p className="mt-1 text-sm text-ink-500">
              Установим в сервисе, поможем с подбором электрики и креплений. Гарантия и обмен в
              течение 14 дней.
            </p>
          </div>
        </div>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbsJsonLd([{ name: "Главная", href: "/" }, { name: "Производители и марки", href: "/brands" }]),
          ),
        }}
      />
      {manufacturers.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              itemListJsonLd(
                manufacturers.slice(0, 30).map((manufacturer) => ({
                  name: manufacturer.name,
                  url: `/brands/${manufacturer.slug}`,
                })),
              ),
            ),
          }}
        />
      )}
    </>
  );
}
