import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Alert,
  Badge,
  Breadcrumbs,
  Card,
  Container,
  CountBadge,
  PanelCard,
  Prose,
  Rating,
  Section,
  StockBadge,
  Price,
} from "@/components/ui";
import { CompareToggle, WishlistToggle } from "@/components/catalog/compare-buttons";
import { DocumentList, SpecificationTable, buildSpecifications } from "@/components/catalog/specifications";
import { FitmentList } from "@/components/catalog/fitment-list";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductRail } from "@/components/catalog/product-rail";
import { PurchasePanel } from "@/components/catalog/purchase-panel";
import { QuestionForm, QuestionItem, ReviewForm, ReviewItem } from "@/components/catalog/product-forms";
import {
  getAccessories,
  getAnalogs,
  getProductBySlug,
  getSimilarProducts,
} from "@/lib/queries";
import { buildMetadata, breadcrumbsJsonLd, productJsonLd } from "@/lib/seo";
import { discountPercent, formatPrice, formatWeight, productWord } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) {
    return buildMetadata({ title: "Товар не найден", path: `/product/${slug}`, noIndex: true });
  }

  return buildMetadata({
    title: product.seoTitle ?? `${product.name} — купить с доставкой | Garage19`,
    description:
      product.seoDescription ??
      product.shortDescription ??
      `${product.name}: ${formatPrice(product.price)}. Наличие, характеристики, совместимость с автомобилями, отзывы. Доставка по России и установка в сервисе.`,
    keywords: product.seoKeywords,
    images: product.images.map((image) => image.url),
    path: `/product/${product.slug}`,
    type: "product",
  });
}

function readCarContext(rawParams: Record<string, string | string[] | undefined>) {
  const single = (key: string): string | undefined => {
    const value = rawParams[key];
    const item = Array.isArray(value) ? value[0] : value;
    const trimmed = item?.trim();
    return trimmed ? trimmed : undefined;
  };
  return {
    marka: single("marka"),
    model: single("model"),
    pokolenie: single("pokolenie"),
    mod: single("mod"),
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const [{ slug }, rawParams] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const [similar, accessories, analogs] = await Promise.all([
    getSimilarProducts(product.id, product.categoryId).catch(() => []),
    getAccessories(product.id, product.categoryId).catch(() => []),
    getAnalogs(product.id, product.categoryId).catch(() => []),
  ]);

  const carContext = readCarContext(rawParams);
  const carQuery = new URLSearchParams(
    Object.entries(carContext).filter(([, value]) => Boolean(value)) as [string, string][],
  ).toString();

  const discount = discountPercent(product.price, product.oldPrice);
  const isTowbar = product.category.slug.includes("farkop") || Boolean(product.verticalLoadKg);

  const crumbs: { name: string; href?: string }[] = [
    { name: "Каталог", href: "/catalog" },
    ...(product.category.parent
      ? [{ name: product.category.parent.name, href: `/catalog/${product.category.parent.slug}` }]
      : []),
    { name: product.category.name, href: `/catalog/${product.category.slug}` },
    { name: product.name },
  ];

  const passports = product.documents.filter((document) => document.type === "passport");
  const certificates = product.documents.filter((document) => document.type === "certificate");
  const instructions = product.documents.filter(
    (document) => document.type !== "passport" && document.type !== "certificate",
  );

  const specifications = buildSpecifications({
    sku: product.sku,
    brandName: product.brandName,
    manufacturerName: product.manufacturer?.name ?? null,
    warrantyMonths: product.warrantyMonths,
    weight: product.weight,
    lengthMm: product.lengthMm,
    widthMm: product.widthMm,
    heightMm: product.heightMm,
    material: product.material,
    mountPlace: product.mountPlace,
    profile: product.profile,
    capacityKg: product.capacityKg,
    verticalLoadKg: product.verticalLoadKg,
    volumeL: product.volumeL,
    doorsCount: product.doorsCount,
    lockIncluded: product.lockIncluded,
    bumperCut: product.bumperCut,
    electricIncluded: product.electricIncluded,
    attributes: product.attributes,
  });

  return (
    <>
      <Container className="py-5 lg:py-7">
        <Breadcrumbs items={crumbs} />
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="min-w-0">
            <ProductGallery
              images={product.images.map((image) => ({
                url: image.url,
                alt: image.alt,
                isPrimary: image.isPrimary,
              }))}
              productName={product.name}
              badges={[
                ...(discount > 0 ? [{ label: `Скидка ${discount}%`, variant: "danger" as const }] : []),
                ...(product.isNew ? [{ label: "Новинка", variant: "brand" as const }] : []),
                ...(product.isHit ? [{ label: "Хит продаж", variant: "dark" as const }] : []),
                ...(product.fitmentType === "universal"
                  ? [{ label: "Универсальный", variant: "outline" as const }]
                  : []),
              ]}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {product.manufacturer ? (
                  <Link
                    href={`/brands/${product.manufacturer.slug}`}
                    className="text-sm font-semibold uppercase tracking-wide text-ink-500 hover:text-brand-700"
                  >
                    {product.manufacturer.name}
                  </Link>
                ) : (
                  product.brandName && (
                    <span className="text-sm font-semibold uppercase tracking-wide text-ink-500">
                      {product.brandName}
                    </span>
                  )
                )}
                <Link
                  href={`/catalog/${product.category.slug}`}
                  className="text-xs text-brand-700 underline"
                >
                  {product.category.name}
                </Link>
              </div>

              <h1 className="mt-2 text-2xl font-bold leading-snug text-ink-900 lg:text-3xl">
                {product.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-500">
                {product.ratingCount > 0 ? (
                  <a href="#reviews" className="flex items-center gap-2 hover:text-brand-700">
                    <Rating value={product.ratingAvg} count={product.ratingCount} size="sm" />
                    <span>отзывы</span>
                  </a>
                ) : (
                  <a href="#reviews" className="text-brand-700 underline">
                    Оставить первый отзыв
                  </a>
                )}
                {product.sku && (
                  <span>
                    Артикул: <strong className="font-medium text-ink-700">{product.sku}</strong>
                  </span>
                )}
              </div>
            </div>

            {product.shortDescription && (
              <p className="text-sm leading-relaxed text-ink-600">{product.shortDescription}</p>
            )}

            <Card className="flex flex-col gap-4 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Price price={product.price} oldPrice={product.oldPrice} size="xl" />
                <StockBadge stock={product.stock} unit={product.unit} />
              </div>

              {product.stock > 0 && (
                <p className="text-xs text-ink-500">
                  На складе: {product.stock} {product.unit} — отгрузим в день заказа
                </p>
              )}

              <PurchasePanel
                productId={product.id}
                productName={product.name}
                priceLabel={formatPrice(product.price)}
                stock={product.stock}
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <CompareToggle productId={product.id} productName={product.name} />
                <WishlistToggle productId={product.id} productName={product.name} />
              </div>
            </Card>

            {isTowbar && (
              <PanelCard title="Характеристики ТСУ" description="Обязательные параметры для подбора фаркопа">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-ink-500">Тяговая нагрузка</dt>
                    <dd className="font-semibold text-ink-900">
                      {product.capacityKg ? `${product.capacityKg} кг` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Вертикальная нагрузка</dt>
                    <dd className="font-semibold text-ink-900">
                      {product.verticalLoadKg ? `${product.verticalLoadKg} кг` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Вырез бампера</dt>
                    <dd className="font-semibold text-ink-900">
                      {product.bumperCut === null
                        ? "—"
                        : product.bumperCut
                          ? "Требуется"
                          : "Не требуется"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Электрика в комплекте</dt>
                    <dd className="font-semibold text-ink-900">
                      {product.electricIncluded === null
                        ? "—"
                        : product.electricIncluded
                          ? "Да"
                          : "Нет"}
                    </dd>
                  </div>
                </dl>

                {(passports.length > 0 || certificates.length > 0) && (
                  <div className="mt-4 flex flex-col gap-2">
                    {[...passports, ...certificates].map((document) => (
                      <Link
                        key={document.id}
                        href={document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-brand-700 underline"
                      >
                        {document.title} (PDF)
                      </Link>
                    ))}
                  </div>
                )}

                {!product.electricIncluded && (
                  <Alert variant="warning" className="mt-4">
                    Электрика в комплект не входит — подберём жгут под ваш автомобиль.{" "}
                    <Link
                      href={`/catalog/elektrika-farkopov${carQuery ? `?${carQuery}` : ""}`}
                      className="underline"
                    >
                      Подобрать электрику
                    </Link>
                  </Alert>
                )}
              </PanelCard>
            )}

            <PanelCard title="Доставка, гарантия и установка">
              <ul className="flex flex-col gap-2 text-sm text-ink-600">
                <li>
                  • Доставка по России: СДЭК, Boxberry, Почта России, курьер по городу. Стоимость
                  рассчитывается при оформлении.
                </li>
                <li>
                  • Гарантия {product.warrantyMonths ? `${product.warrantyMonths} мес.` : "по закону"} —
                  обмен и возврат в течение 14 дней.
                </li>
                <li>• Установка в сервисе: багажники, боксы, фаркопы с электрикой. Запись онлайн.</li>
                <li>
                  • Вес товара: {formatWeight(product.weight)} — учитываем при расчёте доставки.
                </li>
              </ul>
            </PanelCard>
          </div>
        </div>
      </Container>

      <Section className="pt-2">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <PanelCard title="Подходит для автомобилей" description="Совместимость подтверждена производителем">
              <FitmentList
                fitments={product.fitments.map((fitment) => ({
                  id: fitment.id,
                  brand: fitment.brand,
                  model: fitment.model,
                  generation: fitment.generation,
                  yearFrom: fitment.yearFrom,
                  yearTo: fitment.yearTo,
                  note: fitment.note,
                }))}
                fitmentType={product.fitmentType}
                fitmentNote={product.fitmentNote}
              />
            </PanelCard>

            <SpecificationTable
              rows={specifications}
              description="Данные из карточки товара и заводских характеристик"
            />

            {product.description && (
              <PanelCard title="Описание">
                <Prose html={product.description} />
              </PanelCard>
            )}

            {instructions.length > 0 && <DocumentList documents={instructions} />}

            <PanelCard title={`Вопросы и ответы${product._count.questions ? ` · ${product._count.questions}` : ""}`} id="questions">
              {product.questions.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {product.questions.map((question) => (
                    <QuestionItem key={question.id} question={question} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-500">
                  Вопросов пока нет. Спросите первым — ответ увидит и менеджер, и другие покупатели.
                </p>
              )}
              <div className="mt-5 border-t border-ink-100 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-ink-900">Задать вопрос</h3>
                <QuestionForm productId={product.id} />
              </div>
            </PanelCard>

            <PanelCard
              title={`Отзывы${product._count.reviews ? ` · ${product._count.reviews}` : ""}`}
              id="reviews"
            >
              {product.ratingCount > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-ink-50 p-3">
                  <span className="text-3xl font-bold text-ink-900">{product.ratingAvg.toFixed(1)}</span>
                  <Rating value={product.ratingAvg} count={product.ratingCount} />
                  <span className="text-sm text-ink-500">
                    на основе {product.ratingCount} {productWord(product.ratingCount)}
                  </span>
                </div>
              )}

              {product.reviews.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {product.reviews.map((review) => (
                    <ReviewItem key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-500">
                  Отзывов пока нет — станьте первым, кто расскажет о товаре.
                </p>
              )}

              <div className="mt-5 border-t border-ink-100 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-ink-900">Оставить отзыв</h3>
                <ReviewForm productId={product.id} />
              </div>
            </PanelCard>
          </div>

          <aside className="flex min-w-0 flex-col gap-4">
            <PanelCard title="Кому подойдёт">
              <ul className="flex flex-col gap-2 text-sm text-ink-600">
                <li>• Владельцам {product.manufacturer?.name ?? product.brandName ?? "авто"} с штатными местами и рейлингами</li>
                <li>• Тем, кто перевозит лыжи, велосипеды, бокс или прицеп</li>
                <li>• Кто ценит замки и антивандальные крепления</li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {product.capacityKg && <Badge variant="outline">{product.capacityKg} кг</Badge>}
                {product.volumeL && <Badge variant="outline">{product.volumeL} л</Badge>}
                {product.mountPlace && <Badge variant="outline">{product.mountPlace}</Badge>}
                {product.lockIncluded && <Badge variant="success">С замком</Badge>}
              </div>
            </PanelCard>

            {carContext.marka && (
              <Alert variant="success" title="Учитываем ваш автомобиль">
                <p>
                  Вы выбрали автомобиль в каталоге. Проверьте блок «Подходит для автомобилей» — ваша
                  модель указана, если совместимость подтверждена производителем.
                </p>
              </Alert>
            )}

            <PanelCard title="Нужна помощь?">
              <p className="text-sm text-ink-600">
                Подберём комплект под ваш автомобиль, посчитаем доставку и запишем на установку.
              </p>
              <Link
                href={`/podbor${carQuery ? `?${carQuery}` : ""}`}
                className="mt-3 inline-block text-sm font-semibold text-brand-700 underline"
              >
                Открыть подбор по автомобилю →
              </Link>
            </PanelCard>
          </aside>
        </div>
      </Section>

      {accessories.length > 0 && (
        <ProductRail
          title="Аксессуары и допродажи"
          description="С этим товаром чаще всего берут — подобрано по совместимости"
          badge={<CountBadge count={accessories.length} />}
          products={accessories}
          columns={4}
          className="border-t border-ink-100"
        />
      )}

      {analogs.length > 0 && (
        <ProductRail
          title="Аналоги"
          description="Похожие решения других производителей с сопоставимыми характеристиками"
          badge={<Badge variant="brand">Ниша: у конкурентов такого блока нет</Badge>}
          products={analogs}
          columns={4}
          className="border-t border-ink-100"
        />
      )}

      {similar.length > 0 && (
        <ProductRail
          title="Похожие товары"
          description={`Другие товары в разделе «${product.category.name}»`}
          products={similar}
          columns={4}
          className="border-t border-ink-100"
        />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd(crumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            productJsonLd({
              name: product.name,
              description: product.shortDescription ?? product.description,
              images: product.images.map((image) => image.url),
              sku: product.sku,
              brand: product.manufacturer?.name ?? product.brandName,
              price: product.price,
              inStock: product.stock > 0,
              ratingAvg: product.ratingAvg,
              ratingCount: product.ratingCount,
              reviews: product.reviews.slice(0, 10).map((review) => ({
                author: review.authorName,
                rating: review.rating,
                text: review.text,
                date: review.createdAt,
              })),
              url: `/product/${product.slug}`,
            }),
          ),
        }}
      />
    </>
  );
}
