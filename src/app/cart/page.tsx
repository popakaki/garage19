import Link from "next/link";
import type { Metadata } from "next";
import { Alert, Badge, ButtonLink, Card, Container, EmptyState, PageHero } from "@/components/ui";
import { CartLines } from "@/components/cart/CartLines";
import { CartSummary } from "@/components/cart/CartSummary";
import { CartAccessories } from "@/components/cart/CartAccessories";
import { getCart } from "@/lib/cart";
import { currentPromo } from "@/lib/actions/order";
import { promoHint } from "@/lib/promo";
import { calculateDelivery } from "@/lib/delivery";
import { getCities, getDefaultCity, getAccessories } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { buildMetadata } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";
import type { DeliveryType } from "@/lib/constants";

/**
 * /cart — корзина.
 * Суммы считаются на сервере: цены берутся из БД (`getCart`), промокод проверяется
 * по настройкам сайта, доставка — предварительная оценка для города по умолчанию.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Корзина — Garage19",
    description:
      "Ваша корзина: багажники, автобоксы, велокрепления, лыжные крепления и фаркопы. Проверьте состав, количество и оформите заказ с доставкой по России.",
    path: "/cart",
    noIndex: true,
  });
}

export default async function CartPage() {
  const [cart, user] = await Promise.all([getCart(), getCurrentUser()]);

  if (cart.lines.length === 0) {
    return (
      <>
        <PageHero
          title="Корзина"
          breadcrumbs={[{ name: "Главная", href: "/" }, { name: "Корзина" }]}
        />
        <Container className="py-10">
          <EmptyState
            title="В корзине пока пусто"
            description={
              <>
                Подберите товары по своему автомобилю или начните с популярных категорий:
                багажники на крышу, автобоксы, велокрепления, фаркопы.
              </>
            }
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href="/catalog">Перейти в каталог</ButtonLink>
                <ButtonLink href="/podbor" variant="outline">
                  Подобрать по авто
                </ButtonLink>
                {!user && (
                  <ButtonLink href="/account/login" variant="ghost">
                    Войти в аккаунт
                  </ButtonLink>
                )}
              </div>
            }
          />
        </Container>
      </>
    );
  }

  const [promo, hint, cities, defaultCity] = await Promise.all([
    currentPromo(cart.subtotal),
    promoHint(),
    getCities(),
    getDefaultCity(),
  ]);

  // Предварительная доставка: считаем моковым/тарифным способом для города по умолчанию.
  const previewCity = defaultCity ?? cities[0] ?? null;
  let deliveryPreview: {
    price: number;
    daysMin: number;
    daysMax: number;
    tariffName: string;
    deliveryType: DeliveryType;
    cityName: string;
    freeFrom: number | null;
  } | null = null;

  if (previewCity) {
    try {
      const quote = await calculateDelivery({
        cityId: previewCity.id,
        deliveryType: "cdek_pvz",
        weightGrams: cart.weight,
        subtotal: cart.subtotal,
      });
      deliveryPreview = {
        price: quote.price,
        daysMin: quote.daysMin,
        daysMax: quote.daysMax,
        tariffName: quote.tariffName,
        deliveryType: "cdek_pvz",
        cityName: previewCity.name,
        freeFrom: previewCity.freeDeliveryFrom ?? null,
      };
    } catch {
      deliveryPreview = null;
    }
  }

  // Допродажи: аксессуары к первому товару корзины + общая подборка аксессуаров.
  const firstLine = cart.lines[0];
  let accessories = firstLine
    ? await getAccessories(firstLine.product.id, firstLine.product.category.id, 4)
    : [];
  if (accessories.length === 0) {
    accessories = await getAccessories("", "", 4);
  }
  const cartIds = new Set(cart.lines.map((line) => line.product.id));
  accessories = accessories.filter((product) => !cartIds.has(product.id)).slice(0, 4);

  const shortage = cart.lines.filter((line) => line.product.stock < line.qty);
  const preorder = cart.lines.filter((line) => line.product.stock <= 0);

  return (
    <>
      <PageHero
        title="Корзина"
        description={
          user
            ? "Проверьте состав заказа — цены и наличие обновляются автоматически."
            : "Оформить заказ можно без регистрации. Войдите, чтобы сохранить историю покупок и «Гараж»."
        }
        breadcrumbs={[{ name: "Главная", href: "/" }, { name: "Корзина" }]}
      />

      <Container className="py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {shortage.length > 0 && (
              <Alert variant="warning" title="Часть позиций под заказ">
                На складе нет нужного количества по {shortage.length} позиц
                {shortage.length === 1 ? "ии" : "ям"}. Заказ оформить можно — менеджер уточнит срок
                поставки и предложит аналог.
              </Alert>
            )}

            <Card className="px-5 py-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
                <h2 className="text-base font-semibold text-ink-900">Состав заказа</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Цены в рублях</Badge>
                  {preorder.length > 0 && <Badge variant="warning">Есть позиции под заказ</Badge>}
                </div>
              </div>
              <CartLines lines={cart.lines} />
            </Card>

            <CartAccessories items={accessories} />

            <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <p className="text-sm text-ink-500">
                Нужна помощь с выбором? Позвоните или закажите обратный звонок — поможем подобрать
                крепление под ваш автомобиль.
              </p>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/install" variant="outline" size="sm">
                  Записаться на установку
                </ButtonLink>
                <Link href="/catalog" className="self-center text-sm font-semibold text-brand-700 hover:text-brand-800">
                  Продолжить покупки →
                </Link>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <CartSummary
              positions={cart.count}
              subtotal={cart.subtotal}
              weight={cart.weight}
              discount={promo?.discount ?? 0}
              promo={promo ? { code: promo.code, percent: promo.percent } : null}
              promoHint={hint}
              delivery={deliveryPreview}
            />

            <Card className="px-5 py-4 text-sm text-ink-500">
              <h3 className="mb-2 text-sm font-semibold text-ink-900">Способы получения</h3>
              <ul className="space-y-1.5">
                <li>• Самовывоз со склада — бесплатно</li>
                <li>• СДЭК: пункт выдачи или курьер до двери</li>
                <li>• Boxberry и Почта России — по всей стране</li>
                <li>• Курьер по городу при наличии свободных машин</li>
              </ul>
              <p className="mt-3 text-xs text-ink-400">
                Точная стоимость и срок рассчитываются на следующем шаге — при оформлении заказа.
              </p>
            </Card>

            {!user && (
              <Alert variant="info" title="Заказ без регистрации">
                Оформим заказ как гость — понадобится только телефон.{" "}
                <Link href="/account/login" className="font-semibold underline">
                  Войти
                </Link>{" "}
                можно и после.
              </Alert>
            )}

            {promo && (
              <p className="text-xs text-ink-400">
                Скидка {formatPrice(promo.discount)} будет пересчитана сервером при оформлении заказа.
              </p>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
