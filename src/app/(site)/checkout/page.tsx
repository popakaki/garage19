import type { Metadata } from "next";
import { Alert, ButtonLink, Container, PageHero } from "@/components/ui";
import { CheckoutForm, type CheckoutCity, type CheckoutPickupPoint } from "@/components/checkout/CheckoutForm";
import { getCart } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import { currentPromo } from "@/lib/actions/order";
import { getInstallPrice } from "@/lib/delivery";
import { getCities, getDefaultCity, getSavedCarsWithCounts } from "@/lib/queries";
import { resolvePromo } from "@/lib/promo";
import prisma from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";

/**
 * /checkout — оформление заказа одной страницей.
 * Серверная часть загружает города, пункты выдачи, адрес и авто пользователя;
 * клиентская — маску телефона, пересчёт доставки и ошибки сервера.
 * Заказ создаёт `createOrderAction` (см. src/lib/actions/order.ts).
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Оформление заказа — Garage19",
    description:
      "Оформите заказ багажника, автобокса, велокрепления или фаркопа: доставка СДЭК, Boxberry, Почта России или самовывоз, оплата картой, наличными или по счёту.",
    path: "/checkout",
    noIndex: true,
  });
}

export default async function CheckoutPage() {
  const [user, cart] = await Promise.all([getCurrentUser(), getCart()]);

  if (cart.lines.length === 0) {
    return (
      <>
        <PageHero
          title="Оформление заказа"
          breadcrumbs={[
            { name: "Главная", href: "/" },
            { name: "Корзина", href: "/cart" },
            { name: "Оформление" },
          ]}
        />
        <Container className="py-10">
          <Alert variant="warning" title="Корзина пуста">
            Добавьте товары — и вернитесь к оформлению.{" "}
            <ButtonLink href="/catalog" size="sm" className="mt-3">
              Перейти в каталог
            </ButtonLink>
          </Alert>
        </Container>
      </>
    );
  }

  const [cities, defaultCity, installPrice, promo] = await Promise.all([
    getCities(),
    getDefaultCity(),
    getInstallPrice(),
    currentPromo(cart.subtotal),
  ]);

  const [defaultAddress, savedCars] = user
    ? await Promise.all([
        prisma.address.findFirst({
          where: { userId: user.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          select: { street: true, cityId: true },
        }),
        getSavedCarsWithCounts(user.id),
      ])
    : [null, []];

  // Пункты выдачи для всех городов — чтобы выбор работал и без JavaScript.
  const cityIds = cities.map((city) => city.id);
  const pickupRows = cityIds.length
    ? await prisma.pickupPoint.findMany({
        where: { cityId: { in: cityIds }, isActive: true },
        orderBy: [{ cityId: "asc" }, { address: "asc" }],
        select: {
          id: true,
          provider: true,
          cityId: true,
          code: true,
          address: true,
          name: true,
          workTime: true,
        },
      })
    : [];

  const seen = new Set<string>();
  const pickupPoints: CheckoutPickupPoint[] = [];
  for (const point of pickupRows) {
    const key = `${point.provider}:${point.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pickupPoints.push(point);
  }

  // Проверяем промокод из cookie ещё раз — итог всё равно пересчитает createOrderAction.
  let promoCode: string | null = null;
  let discount = 0;
  if (promo) {
    const resolved = await resolvePromo(promo.code, cart.subtotal);
    if (resolved.ok) {
      promoCode = resolved.code;
      discount = resolved.discount;
    }
  }

  const primaryCar = savedCars.find((car) => car.isPrimary) ?? savedCars[0] ?? null;
  const carInfo = primaryCar
    ? [primaryCar.brand.name, primaryCar.model?.name, primaryCar.generation?.name].filter(Boolean).join(" ")
    : "";

  const citiesForForm: CheckoutCity[] = cities.map((city) => ({
    id: city.id,
    name: city.name,
    deliveryDays: city.deliveryDays,
    freeDeliveryFrom: city.freeDeliveryFrom,
    pickupAvailable: city.pickupAvailable,
    deliveryAvailable: city.deliveryAvailable,
    address: city.address,
    phone: city.phone,
    workTime: city.workTime,
  }));

  return (
    <>
      <PageHero
        title="Оформление заказа"
        description="Заполните контактные данные и выберите удобный способ получения. Заказ можно оформить без регистрации."
        breadcrumbs={[
          { name: "Главная", href: "/" },
          { name: "Корзина", href: "/cart" },
          { name: "Оформление" },
        ]}
      />

      <Container className="py-8">
        <CheckoutForm
          cities={citiesForForm}
          pickupPoints={pickupPoints}
          user={user ? { name: user.name, phone: user.phone, email: user.email } : null}
          subtotal={cart.subtotal}
          weight={cart.weight}
          discount={discount}
          promoCode={promoCode}
          count={cart.count}
          defaultCityId={user?.cityId ?? defaultCity?.id ?? cities[0]?.id ?? ""}
          prefill={{
            name: user?.name ?? "",
            phone: user?.phone ?? "",
            email: user?.email ?? "",
            address: defaultAddress?.street ?? "",
            carInfo,
            cityId: defaultAddress?.cityId ?? user?.cityId ?? defaultCity?.id ?? "",
          }}
          installPrice={installPrice}
        />
      </Container>
    </>
  );
}
