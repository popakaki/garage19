import Link from "next/link";
import Image from "next/image";
import {
  Award,
  BadgeCheck,
  Bike,
  Box,
  Car,
  Clock,
  CreditCard,
  Package,
  Phone,
  ShieldCheck,
  Snowflake,
  Truck,
  Wrench,
} from "lucide-react";
import { CarConfigurator } from "@/components/home/car-configurator";
import { HeroSlider, type HeroSlide } from "@/components/home/hero-slider";
import { VinRequestForm } from "@/components/forms/callback";
import { ButtonLink, Container, ProductCountLabel, Section, Rating } from "@/components/ui";
import { ProductCard } from "@/components/catalog/product-card";
import {
  getBanners,
  getBrands,
  getCategoryTree,
  getFeaturedProducts,
  getHitProducts,
  getNewProducts,
} from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { CORE_CATEGORIES } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({ path: "/" });
}

const CATEGORY_ICONS: Record<string, typeof Package> = {
  bagazhniki: Package,
  avtoboksy: Box,
  veloperekreateli: Bike,
  "lyzhnye-krepleniya": Snowflake,
  farkopy: Truck,
  "krepezh-i-aksessuary": Wrench,
};

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: "fallback-1",
    title: "Багажник, бокс или фаркоп — точно под ваш автомобиль",
    subtitle: "Подбор по марке, модели и поколению за 30 секунд",
    description:
      "Более 20 брендов багажных систем и фаркопов. Консультация инженера, установка в сервисе, гарантия до 5 лет.",
    image: "/images/banners/hero-1.svg",
    badge: "Точный подбор",
    linkUrl: "/catalog",
    linkText: "Перейти в каталог",
  },
  {
    id: "fallback-2",
    title: "Фаркопы с установкой и регистрацией в ГИБДД",
    subtitle: "Паспорт и сертификат в комплекте",
    description: "Съёмные и с электрикой, тяговая нагрузка до 3 500 кг. Запишитесь на установку онлайн.",
    image: "/images/banners/hero-2.svg",
    badge: "Установка от 2 часов",
    linkUrl: "/catalog/farkopy",
    linkText: "Выбрать фаркоп",
  },
  {
    id: "fallback-3",
    title: "Автобоксы и велокрепления для путешествий",
    subtitle: "Скидки до 30% на прошлогодние коллекции",
    image: "/images/banners/hero-3.svg",
    badge: "Сезонные скидки",
    linkUrl: "/catalog/avtoboksy",
    linkText: "Смотреть боксы",
  },
];

const ADVANTAGES = [
  { icon: Car, title: "Подбор по авто", text: "Марка, модель, поколение и модификация — без ошибок совместимости." },
  { icon: ShieldCheck, title: "Гарантия до 5 лет", text: "Официальная гарантия производителя и сертификаты качества." },
  { icon: Truck, title: "Доставка по России", text: "СДЭК, Boxberry, Почта России и курьер по городу." },
  { icon: Wrench, title: "Установка в сервисе", text: "Запись онлайн, монтаж багажников и фаркопов за 1 день." },
  { icon: BadgeCheck, title: "Оригинал и аналоги", text: "Thule, Atera, Menabo, TowRus, Baltex — плюс честные аналоги." },
  { icon: CreditCard, title: "Удобная оплата", text: "Картой онлайн, при получении или по счёту для юрлиц." },
];

export default async function HomePage() {
  const [banners, promoBanners, categories, brands, hits, featured, news, settings] = await Promise.all([
    getBanners("hero"),
    getBanners("promo"),
    getCategoryTree(),
    getBrands({ popularOnly: true }),
    getHitProducts(8),
    getFeaturedProducts(4),
    getNewProducts(4),
    getSettings(),
  ]);

  const slides: HeroSlide[] = banners.length
    ? banners.map((banner) => ({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        description: banner.description,
        image: banner.image,
        mobileImage: banner.mobileImage,
        badge: banner.badge,
        linkUrl: banner.linkUrl,
        linkText: banner.linkText,
      }))
    : FALLBACK_SLIDES;

  const menuCategories = categories.length
    ? categories.slice(0, 6)
    : CORE_CATEGORIES.map((category, index) => ({
        id: `core-${index}`,
        name: category.name,
        slug: category.slug,
        description: null,
        icon: category.icon,
        _count: { products: 0 },
        children: [],
      }));

  return (
    <>
      {/* ── Первый экран: слайдер + конфигуратор ───────────────────────────── */}
      <section className="bg-white pb-10 pt-5 lg:pt-8">
        <Container>
          <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
            <HeroSlider slides={slides} className="min-h-72" />
            <CarConfigurator
              brands={brands.map((brand) => ({
                id: brand.id,
                name: brand.name,
                slug: brand.slug,
                popular: brand.popular,
              }))}
            />
          </div>
        </Container>
      </section>

      {/* ── Преимущества ───────────────────────────────────────────────────── */}
      <section className="border-y border-ink-100 bg-ink-50 py-8">
        <Container>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {ADVANTAGES.map((item) => (
              <div key={item.title} className="flex flex-col gap-2">
                <item.icon className="size-6 text-brand-600" />
                <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                <p className="text-xs leading-relaxed text-ink-500">{item.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Категории ──────────────────────────────────────────────────────── */}
      <Section
        title="Каталог по категориям"
        subtitle="Багажные системы, крепления и фаркопы для любых задач — от города до экспедиции"
        action={
          <ButtonLink href="/catalog" variant="outline" size="sm">
            Весь каталог
          </ButtonLink>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuCategories.map((category) => {
            const Icon = CATEGORY_ICONS[category.slug] ?? Package;
            const count = category._count?.products ?? 0;
            return (
              <Link
                key={category.id}
                href={`/catalog/${category.slug}`}
                className="group g19-card flex items-start gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                  <Icon className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-bold text-ink-900 group-hover:text-brand-700">
                    {category.name}
                  </span>
                  {category.description && (
                    <span className="mt-1 line-clamp-2 block text-xs text-ink-500">{category.description}</span>
                  )}
                  <span className="mt-2 block">
                    {count > 0 ? <ProductCountLabel count={count} /> : <span className="text-xs text-ink-400">Скоро в наличии</span>}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* ── Хиты продаж ────────────────────────────────────────────────────── */}
      <Section
        title="Хиты продаж"
        subtitle="Что чаще всего покупают для популярных моделей автомобилей"
        action={
          <ButtonLink href="/catalog?sort=popular" variant="outline" size="sm">
            Все популярные
          </ButtonLink>
        }
        className="pt-0"
      >
        {hits.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hits.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center text-sm text-ink-500">
            Товары появятся после загрузки каталога. Запустите <code className="rounded bg-ink-100 px-1.5 py-0.5">npm run db:seed</code>.
          </div>
        )}
      </Section>

      {/* ── Рекомендуем ────────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <Section title="Рекомендуем" subtitle="Выбор наших инженеров под сезон" className="pt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Промо-баннеры ──────────────────────────────────────────────────── */}
      <Section className="py-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {(promoBanners.length > 0
            ? promoBanners.slice(0, 2)
            : [
                {
                  id: "promo-1",
                  title: "Бесплатная установка багажников в сервисе",
                  subtitle: "При покупке комплекта багажника с креплениями",
                  image: "/images/banners/promo-1.svg",
                  linkUrl: "/install",
                  linkText: "Записаться",
                  badge: "0 ₽ за монтаж",
                },
                {
                  id: "promo-2",
                  title: "Не нашли свою модификацию?",
                  subtitle: "Подберём по VIN и предложим аналоги",
                  image: "/images/banners/promo-2.svg",
                  linkUrl: "/podbor-po-vin",
                  linkText: "Оставить заявку",
                  badge: "Ручной подбор",
                },
              ]
          ).map((banner) => (
            <div key={banner.id} className="relative overflow-hidden rounded-2xl bg-ink-900">
              <Image
                src={banner.image}
                alt={banner.title}
                width={1200}
                height={420}
                className="h-48 w-full object-cover opacity-70 lg:h-56"
              />
              <div className="absolute inset-0 flex flex-col justify-center gap-2 bg-gradient-to-r from-ink-950/90 to-transparent p-6 lg:p-8">
                {"badge" in banner && banner.badge && (
                  <span className="w-fit rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-bold text-white">
                    {banner.badge}
                  </span>
                )}
                <p className="max-w-sm text-lg font-bold leading-snug text-white lg:text-xl">{banner.title}</p>
                {banner.subtitle && <p className="max-w-sm text-sm text-ink-300">{banner.subtitle}</p>}
                {banner.linkUrl && (
                  <ButtonLink href={banner.linkUrl} size="sm" className="mt-2 w-fit">
                    {banner.linkText ?? "Подробнее"}
                  </ButtonLink>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Новинки ────────────────────────────────────────────────────────── */}
      {news.length > 0 && (
        <Section
          title="Новинки каталога"
          subtitle="Свежие поступления багажных систем и фаркопов"
          action={
            <ButtonLink href="/catalog?sort=new" variant="outline" size="sm">
              Все новинки
            </ButtonLink>
          }
          className="pt-0"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {news.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Подбор по VIN + бренды ─────────────────────────────────────────── */}
      <Section className="pt-0">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="g19-card flex flex-col justify-center gap-4 bg-ink-950 p-6 text-white lg:p-10">
            <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-300">
              <Car className="size-4" />
              Гараж и подбор под ваш автомобиль
            </span>
            <h2 className="text-2xl font-black leading-tight lg:text-3xl">
              Сохраните свой автомобиль — и мы будем показывать только подходящие товары
            </h2>
            <p className="max-w-xl text-sm text-ink-300">
              Поколения и модификации в справочнике обновляем вручную, поэтому конфигуратор не путает кузова
              и годы выпуска. А если вашей модификации нет — подберём по VIN вручную.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/account/garage" size="lg">
                Мой гараж
              </ButtonLink>
              <ButtonLink href="/podbor" variant="outline" size="lg" className="border-white/25 bg-white/10 text-white hover:bg-white/20">
                Подбор по авто
              </ButtonLink>
            </div>
            <div className="mt-2 flex flex-wrap gap-6 text-sm text-ink-300">
              <span className="inline-flex items-center gap-2">
                <Award className="size-4 text-brand-400" /> 20+ брендов
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="size-4 text-brand-400" /> Ответ за 15 минут
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone className="size-4 text-brand-400" /> {settings["contacts.phone"]}
              </span>
            </div>
          </div>

          <VinRequestForm />
        </div>
      </Section>

      {/* ── Бренды ─────────────────────────────────────────────────────────── */}
      {brands.length > 0 && (
        <Section
          title="Подбираем для популярных марок"
          subtitle="В справочнике — актуальные поколения и модификации"
          action={
            <ButtonLink href="/podbor" variant="outline" size="sm">
              Все марки
            </ButtonLink>
          }
          className="pt-0"
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {brands.slice(0, 18).map((brand) => (
              <Link
                key={brand.id}
                href={`/podbor/${brand.slug}`}
                className="g19-card flex h-20 items-center justify-center px-3 text-center text-sm font-semibold text-ink-700 transition-colors hover:border-brand-200 hover:text-brand-700"
              >
                {brand.name}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* ── SEO-текст ──────────────────────────────────────────────────────── */}
      <Section className="pt-0">
        <div className="g19-card p-6 lg:p-8">
          <h2 className="text-xl font-bold text-ink-900 lg:text-2xl">
            Как подобрать багажник, автобокс или фаркоп для своего автомобиля
          </h2>
          <div className="g19-prose mt-4 max-w-4xl">
            <p>
              Багажные системы, автобоксы и крепления для перевозки велосипедов и лыж выбираются не только по
              размеру, но и по типу крыши автомобиля: гладкая крыша, штатные места под рейлинги, интегрированные
              рейлинги или водосточные желоба. Ошибка в выборе приводит к люфту, шуму и повреждению кузова,
              поэтому мы построили конфигуратор, который учитывает марку, модель, поколение и модификацию.
            </p>
            <p>
              Фаркопы (ТСУ) подбираются по тяговой и вертикальной нагрузке, а также по необходимости выреза бампера
              и наличию электрики. Для регистрации в ГИБДД к фаркопу прилагаются паспорт и сертификат соответствия —
              они доступны в карточке товара.
            </p>
            <h3>Что важно знать перед покупкой</h3>
            <ul>
              <li>грузоподъёмность багажника на крышу обычно 50–100 кг, включая вес самих дуг;</li>
              <li>для перевозки лыж и сноубордов важна ширина крепления и возможность наклона;</li>
              <li>велокрепления на фаркоп удобнее и надёжнее крышных при перевозке тяжёлых электровелосипедов;</li>
              <li>автобокс подбирается по объёму, длине лыж и допустимой нагрузке на крышу.</li>
            </ul>
            <p>
              Если вы сомневаетесь — оставьте заявку на подбор: укажите марку, модель и год, а лучше VIN, и инженер
              предложит 2–3 варианта с разным бюджетом.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
