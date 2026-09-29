import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CarLandingLayout, otherBrandsLinks } from "@/components/catalog/car-landing-layout";
import { getCarLandingProducts, getCarLandingTree, getGenerations } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { formatYears } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ brand: string; model: string; generation: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, model, generation } = await params;
  const data = await getCarLandingProducts({
    brandSlug: brand,
    modelSlug: model,
    generationSlug: generation,
  }).catch(() => null);

  if (!data || !data.car.model || !data.car.generation) {
    return buildMetadata({
      title: "Поколение не найдено",
      path: `/podbor/${brand}/${model}/${generation}`,
      noIndex: true,
    });
  }

  const { brand: carBrand, model: carModel, generation: carGeneration } = data.car;
  const years = formatYears(carGeneration.yearFrom, carGeneration.yearTo);
  const carName = `${carBrand.name} ${carModel.name} (${carGeneration.name}${years ? `, ${years}` : ""})`;

  return buildMetadata({
    title: `Багажники, автобоксы и фаркопы для ${carName} — купить с установкой`,
    description: `Подобрано ${data.products.length} товаров для ${carName}: багажники на крышу, автобоксы, велокрепления, лыжные крепления и фаркопы (ТСУ). Наличие, доставка по России, установка в сервисе.`,
    keywords: `багажник ${carBrand.name} ${carModel.name} ${carGeneration.name}, фаркоп ${carBrand.name} ${carModel.name} ${years}`,
    path: `/podbor/${brand}/${model}/${generation}`,
  });
}

export default async function PodborGenerationPage({ params }: PageProps) {
  const { brand, model, generation } = await params;
  const [data, tree] = await Promise.all([
    getCarLandingProducts({ brandSlug: brand, modelSlug: model, generationSlug: generation }).catch(
      () => null,
    ),
    getCarLandingTree().catch(() => []),
  ]);
  if (!data || !data.car.model || !data.car.generation) notFound();

  const carBrand = data.car.brand;
  const carModel = data.car.model;
  const carGeneration = data.car.generation;
  const years = formatYears(carGeneration.yearFrom, carGeneration.yearTo);
  const carName = `${carBrand.name} ${carModel.name} (${carGeneration.name}${years ? `, ${years}` : ""})`;

  const siblings = (await getGenerations(brand, model).catch(() => [])).filter(
    (item) => item.slug !== generation,
  );

  const crumbs = [
    { name: "Подбор по авто", href: "/podbor" },
    { name: carBrand.name, href: `/podbor/${brand}` },
    { name: carModel.name, href: `/podbor/${brand}/${model}` },
    { name: carGeneration.name },
  ];

  return (
    <CarLandingLayout
      crumbs={crumbs}
      title={`Багажники и фаркопы для ${carName}`}
      intro={`Для ${carBrand.name} ${carModel.name} в кузове ${carGeneration.name}${
        carGeneration.bodyType ? ` (${carGeneration.bodyType})` : ""
      } подходит ${data.products.length} товаров: багажники, боксы, крепления и ТСУ.`}
      carLabel={carName}
      groups={data.groups}
      products={data.products}
      brandSlug={brand}
      modelSlug={model}
      generationSlug={generation}
      navBlocks={[
        {
          title: `Другие поколения ${carBrand.name} ${carModel.name}`,
          links: siblings.map((item) => ({
            name: `${item.name} (${formatYears(item.yearFrom, item.yearTo)})`,
            href: `/podbor/${brand}/${model}/${item.slug}`,
            note: item._count.modifications ? `${item._count.modifications} модиф.` : undefined,
          })),
        },
        { title: "Другие марки", links: otherBrandsLinks(tree, brand) },
      ]}
      seoHtml={`
        <p>${carName} — для этого поколения совместимость подтверждена производителем. Обратите внимание на
        тип крыши: если у вас есть рейлинги, нужны дуги с креплением в рейлинг; на гладкой крыше используются
        опоры на штатные места или с зажимом за проём двери.</p>
        <p>Обязательно сверьте кузов и год выпуска: у одного поколения бывают рестайлинги с другим
        креплением. Если сомневаетесь — пришлите VIN, проверим по каталогу производителя.</p>
        <p>Для ТСУ проверьте тяговую и вертикальную нагрузку, необходимость выреза бампера и комплект
        электрики. Паспорт изделия и сертификат соответствия прилагаем к каждому фаркопу — они нужны для
        регистрации в ГИБДД.</p>
        <p>Установку багажника или фаркопа выполняем в сервисе: работа занимает от 40 минут (багажник) до
        2,5 часов (ТСУ с электрикой).</p>
      `}
      emptyAction={{
        href: `/catalog?marka=${brand}&model=${model}&pokolenie=${generation}`,
        label: "Смотреть в каталоге",
      }}
    />
  );
}
