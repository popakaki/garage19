import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CarLandingLayout, otherBrandsLinks } from "@/components/catalog/car-landing-layout";
import { getCarLandingProducts, getCarLandingTree, getGenerations } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { formatYears } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ brand: string; model: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, model } = await params;
  const data = await getCarLandingProducts({ brandSlug: brand, modelSlug: model }).catch(() => null);
  if (!data || !data.car.model) {
    return buildMetadata({ title: "Модель не найдена", path: `/podbor/${brand}/${model}`, noIndex: true });
  }

  const carName = `${data.car.brand.name} ${data.car.model.name}`;
  const years = formatYears(data.car.model.yearFrom, data.car.model.yearTo);

  return buildMetadata({
    title: `Багажники, автобоксы и фаркопы для ${carName}${years ? ` (${years})` : ""} — купить с установкой`,
    description: `Подобрано ${data.products.length} товаров для ${carName}: багажники на крышу, автобоксы, велокрепления, лыжные крепления и фаркопы. Совместимость по поколению, наличие, доставка по России.`,
    keywords: `багажник на ${carName}, фаркоп ${carName}, автобокс ${carName}, велокрепление ${carName}`,
    path: `/podbor/${brand}/${model}`,
  });
}

export default async function PodborModelPage({ params }: PageProps) {
  const { brand, model } = await params;
  const [data, tree] = await Promise.all([
    getCarLandingProducts({ brandSlug: brand, modelSlug: model }).catch(() => null),
    getCarLandingTree().catch(() => []),
  ]);
  if (!data || !data.car.model) notFound();

  const brandName = data.car.brand.name;
  const modelName = data.car.model.name;
  const carName = `${brandName} ${modelName}`;
  const years = formatYears(data.car.model.yearFrom, data.car.model.yearTo);

  const generations = await getGenerations(brand, model).catch(() => []);

  const siblingModels = (tree.find((item) => item.slug === brand)?.models ?? [])
    .filter((item) => item.slug !== model)
    .slice(0, 20)
    .map((item) => ({ name: item.name, href: `/podbor/${brand}/${item.slug}` }));

  const crumbs = [
    { name: "Подбор по авто", href: "/podbor" },
    { name: brandName, href: `/podbor/${brand}` },
    { name: modelName },
  ];

  const generationLinks = generations.map((generation) => ({
    name: `${generation.name} (${formatYears(generation.yearFrom, generation.yearTo)})`,
    href: `/podbor/${brand}/${model}/${generation.slug}`,
    note: generation._count.modifications ? `${generation._count.modifications} модиф.` : undefined,
  }));

  return (
    <CarLandingLayout
      crumbs={crumbs}
      title={`Багажники и фаркопы для ${carName}${years ? ` (${years})` : ""}`}
      intro={`Совместимые товары для ${carName}: ${data.products.length} позиций. Уточните поколение — часть комплектов подходит только к определённым годам выпуска.`}
      carLabel={carName}
      groups={data.groups}
      products={data.products}
      brandSlug={brand}
      modelSlug={model}
      navBlocks={[
        { title: `Поколения ${carName}`, links: generationLinks },
        { title: `Другие модели ${brandName}`, links: siblingModels },
        { title: "Другие марки", links: otherBrandsLinks(tree, brand) },
      ]}
      seoHtml={`
        <p>${carName}${years ? ` (${years})` : ""} — подбор выполняется по типу крыши и способу крепления.
        Проверьте, есть ли у вашей комплектации рейлинги: с ними подходят поперечные дуги с креплением в
        рейлинг, без них — опоры на штатные места или с зажимом за проём двери.</p>
        <p>Для перевозки лыж и сноуборда на дуги устанавливается специализированное крепление, для
        велосипедов — велобагажник (на крышу, на заднюю дверь или на фаркоп). Если планируете бокс, учитывайте
        его длину: для ${carName} оптимальны боксы 350–450 л.</p>
        <p>Фаркоп для ${carName} подбирается по тяговой нагрузке и наличию выреза бампера. Электрику можно
        взять в комплекте или отдельно — мы подберём жгут с блоком согласования, чтобы не было ошибок на
        приборной панели.</p>
        <p>Если нужного поколения нет в списке, оставьте заявку с VIN: проверим совместимость по каталогам
        производителей.</p>
      `}
      emptyAction={{ href: `/catalog?marka=${brand}&model=${model}`, label: "Смотреть в каталоге" }}
    />
  );
}
