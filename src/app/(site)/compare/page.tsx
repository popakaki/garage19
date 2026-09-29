import Link from "next/link";
import type { Metadata } from "next";
import { Container, PageHero, Section } from "@/components/ui";
import { CompareTable } from "@/components/catalog/compare-view";
import { buildMetadata, breadcrumbsJsonLd } from "@/lib/seo";

const CRUMBS = [{ name: "Сравнение товаров" }];

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Сравнение товаров — характеристики в одной таблице",
    description:
      "Сравните багажники, автобоксы, велокрепления и фаркопы по характеристикам: грузоподъёмность, объём, место установки, материал, замок, электрика, вырез бампера и гарантия.",
    path: "/compare",
    noIndex: true,
  });
}

export default function ComparePage() {
  return (
    <>
      <PageHero
        title="Сравнение товаров"
        description="До 4 товаров одновременно: все ключевые характеристики в одной таблице. Список хранится в браузере — можно вернуться к сравнению позже."
        breadcrumbs={CRUMBS}
      />

      <Container className="py-6">
        <CompareTable />
      </Container>

      <Section title="Что важно сравнить" className="pt-0">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="g19-card p-5">
            <h3 className="font-semibold text-ink-900">Багажники и корзины</h3>
            <p className="mt-1 text-sm text-ink-500">
              Грузоподъёмность (50–100 кг), место установки (рейлинги, штатные места, гладкая крыша),
              профиль дуги, наличие замка и материал.
            </p>
          </div>
          <div className="g19-card p-5">
            <h3 className="font-semibold text-ink-900">Автобоксы</h3>
            <p className="mt-1 text-sm text-ink-500">
              Объём (300–500 л), стороны открывания, крепление (на дуги или на фаркоп), вес и
              возможность перевозки лыж.
            </p>
          </div>
          <div className="g19-card p-5">
            <h3 className="font-semibold text-ink-900">Фаркопы (ТСУ)</h3>
            <p className="mt-1 text-sm text-ink-500">
              Тяговая и вертикальная нагрузка, вырез бампера, комплект электрики, тип крюка. Паспорт
              и сертификат обязательны для ГИБДД.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-ink-500">
          Не хватает товаров для сравнения?{" "}
          <Link href="/catalog" className="text-brand-700 underline">
            Откройте каталог
          </Link>{" "}
          или{" "}
          <Link href="/podbor" className="text-brand-700 underline">
            подберите товар по автомобилю
          </Link>
          .
        </p>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbsJsonLd([
              { name: "Главная", href: "/" },
              { name: "Сравнение", href: "/compare" },
            ]),
          ),
        }}
      />
    </>
  );
}
