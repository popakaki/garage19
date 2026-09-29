import Link from "next/link";
import type { Metadata } from "next";
import { Container, PageHero, Section } from "@/components/ui";
import { WishlistGrid } from "@/components/catalog/compare-view";
import { buildMetadata, breadcrumbsJsonLd } from "@/lib/seo";

const CRUMBS = [{ name: "Избранное" }];

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Избранное — отложенные товары",
    description:
      "Товары, которые вы отложили: багажники, автобоксы, велокрепления и фаркопы. Список хранится в браузере, регистрация не нужна.",
    path: "/wishlist",
    noIndex: true,
  });
}

export default function WishlistPage() {
  return (
    <>
      <PageHero
        title="Избранное"
        description="Товары, которые вы отметили. Список хранится в браузере — регистрация не нужна, но и не синхронизируется между устройствами."
        breadcrumbs={CRUMBS}
      />

      <Container className="py-6">
        <WishlistGrid />
      </Container>

      <Section title="Как это работает" className="pt-0">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="g19-card p-5">
            <h3 className="font-semibold text-ink-900">Отмечайте в один клик</h3>
            <p className="mt-1 text-sm text-ink-500">
              Кнопка «В избранное» есть в каталоге, в карточке товара и в таблице сравнения. Список
              сохраняется автоматически.
            </p>
          </div>
          <div className="g19-card p-5">
            <h3 className="font-semibold text-ink-900">Возвращайтесь к выбору</h3>
            <p className="mt-1 text-sm text-ink-500">
              Избранное не теряется при закрытии браузера: удобно отложить товар и вернуться к нему
              позже, когда уточните параметры автомобиля.
            </p>
          </div>
          <div className="g19-card p-5">
            <h3 className="font-semibold text-ink-900">Сравните характеристики</h3>
            <p className="mt-1 text-sm text-ink-500">
              Добавьте товары{" "}
              <Link href="/compare" className="text-brand-700 underline">
                к сравнению
              </Link>{" "}
              — увидите грузоподъёмность, объём, место установки, замок и электрику в одной таблице.
            </p>
          </div>
        </div>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbsJsonLd([
              { name: "Главная", href: "/" },
              { name: "Избранное", href: "/wishlist" },
            ]),
          ),
        }}
      />
    </>
  );
}
