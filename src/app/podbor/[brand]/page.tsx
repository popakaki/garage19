import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CarLandingLayout, otherBrandsLinks } from "@/components/catalog/car-landing-layout";
import { getCarLandingProducts, getCarLandingTree, getGenerations } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { formatYears } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ brand: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand } = await params;
  const data = await getCarLandingProducts({ brandSlug: brand }).catch(() => null);
  if (!data) {
    return buildMetadata({ title: "Марка не найдена", path: `/podbor/${brand}`, noIndex: true });
  }

  const name = data.car.brand.name;
  return buildMetadata({
    title: `Багажники и фаркопы для ${name} — подбор по модели и поколению`,
    description: `Багажники на крышу, автобоксы, велокрепления, лыжные крепления и фаркопы (ТСУ) для ${name}: ${data.products.length} совместимых товаров. Подбор по модели и поколению, доставка по России, установка в сервисе.`,
    keywords: `багажник на ${name}, фаркоп для ${name}, автобокс для ${name}, подбор по модели`,
    path: `/podbor/${brand}`,
  });
}

export default async function PodborBrandPage({ params }: PageProps) {
  const { brand } = await params;
  const [data, tree] = await Promise.all([
    getCarLandingProducts({ brandSlug: brand }).catch(() => null),
    getCarLandingTree().catch(() => []),
  ]);
  if (!data) notFound();

  const brandName = data.car.brand.name;
  const modelEntries = await Promise.all(
    (tree.find((item) => item.slug === brand)?.models ?? []).slice(0, 30).map(async (model) => ({
      model,
      generations: await getGenerations(brand, model.slug).catch(() => []),
    })),
  );

  const crumbs = [{ name: "Подбор по авто", href: "/podbor" }, { name: brandName }];

  const modelLinks = modelEntries.map(({ model, generations }) => ({
    name: model.name,
    href: `/podbor/${brand}/${model.slug}`,
    note: generations.length
      ? formatYears(generations[0].yearFrom, generations[generations.length - 1].yearTo ?? null)
      : undefined,
  }));

  return (
    <CarLandingLayout
      crumbs={crumbs}
      title={`Багажники и фаркопы для ${brandName}`}
      intro={`Подобрано ${data.products.length} совместимых товаров для автомобилей ${brandName}. Выберите модель и поколение — покажем точные комплекты.`}
      carLabel={brandName}
      groups={data.groups}
      products={data.products}
      brandSlug={brand}
      navBlocks={[
        { title: `Модели ${brandName}`, links: modelLinks },
        { title: "Другие марки", links: otherBrandsLinks(tree, brand) },
      ]}
      seoHtml={`
        <p>Для автомобилей ${brandName} товары подбираются по заводским таблицам совместимости. У разных
        поколений одной модели могут отличаться тип крыши, расположение штатных точек крепления и наличие
        рейлингов — поэтому сначала выбирайте модель и поколение, а не только марку.</p>
        <p>Багажники на крышу для ${brandName} чаще всего ставятся на штатные места или рейлинги. Если крыша
        гладкая, понадобятся опоры с зажимом за проём двери — они подходят не ко всем кузовам, совместимость
        нужно проверять. Грузоподъёмность обычных дуг — 50–75 кг, усиленных — до 100 кг.</p>
        <p>Фаркопы (ТСУ) для ${brandName} бывают со съёмным и жёстким крюком. Проверьте тяговую нагрузку (не
        меньше массы прицепа) и вертикальную нагрузку на шар. Если электрика не входит в комплект, подберём
        жгут и блок согласования под конкретную модель.</p>
        <p>Все товары есть на складе либо доступны под заказ. Установку выполняем в сервисе, для ТСУ оформляем
        паспорт изделия и сертификат соответствия — без них регистрация в ГИБДД невозможна.</p>
      `}
      emptyAction={{ href: `/catalog?marka=${brand}`, label: "Смотреть в каталоге" }}
    />
  );
}
