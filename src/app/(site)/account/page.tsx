import Link from "next/link";
import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSavedCarsWithCounts } from "@/lib/queries";
import { Badge, ButtonLink, Card, Section } from "@/components/ui";
import { OrderRow } from "@/components/checkout/OrderView";
import { REVIEW_STATUSES, SITE } from "@/lib/constants";
import { formatDate, productWord } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";

/**
 * /account — сводка личного кабинета: последние заказы, «Гараж», отзывы, контакты.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Личный кабинет — Garage19",
    description: "Заказы, «Гараж» сохранённых автомобилей, отзывы и контактные данные.",
    path: "/account",
    noIndex: true,
  });
}

export default async function AccountPage() {
  const user = await requireUserPage("/account");

  const [orders, savedCars, reviews, ordersCount, reviewsCount] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        number: true,
        createdAt: true,
        status: true,
        total: true,
        itemsTotal: true,
        items: { select: { name: true } },
      },
    }),
    getSavedCarsWithCounts(user.id),
    prisma.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        rating: true,
        title: true,
        text: true,
        status: true,
        createdAt: true,
        product: { select: { name: true, slug: true } },
      },
    }),
    prisma.order.count({ where: { userId: user.id } }),
    prisma.review.count({ where: { userId: user.id } }),
  ]);

  const delivered = await prisma.order.count({ where: { userId: user.id, status: "done" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Здравствуйте, {user.name.split(" ")[0]}!</h1>
          <p className="mt-1 text-sm text-ink-500">
            Здесь собраны заказы, сохранённые автомобили и отзывы.
          </p>
        </div>
        <ButtonLink href="/catalog" variant="outline" size="sm">
          В каталог
        </ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-ink-400">Заказов</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{ordersCount}</p>
          <p className="mt-1 text-xs text-ink-500">выполнено: {delivered}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-ink-400">Автомобилей в гараже</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{savedCars.length}</p>
          <Link href="/account/garage" className="mt-1 inline-block text-xs font-semibold text-brand-700">
            Управлять гаражом →
          </Link>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-ink-400">Отзывов</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{reviewsCount}</p>
          <Link href="/account/reviews" className="mt-1 inline-block text-xs font-semibold text-brand-700">
            Мои отзывы →
          </Link>
        </Card>
      </div>

      <Section title="Последние заказы" className="py-0">
        <Card className="overflow-hidden">
          {orders.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-ink-500">Заказов пока нет.</p>
              <ButtonLink href="/catalog" size="sm" className="mt-3">
                Подобрать товары
              </ButtonLink>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {orders.map((order) => (
                <li key={order.number}>
                  <OrderRow order={order} />
                </li>
              ))}
            </ul>
          )}
          {orders.length > 0 && (
            <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-3">
              <Link href="/account/orders" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                Все заказы →
              </Link>
            </div>
          )}
        </Card>
      </Section>

      <Section title="Мой гараж" subtitle="Сохраните авто — покажем, что подходит именно ему" className="py-0">
        <Card className="overflow-hidden">
          {savedCars.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-ink-500">
                В гараже пока пусто. Добавьте автомобиль — и мы подберём багажники, автобоксы и фаркопы под него.
              </p>
              <ButtonLink href="/account/garage" size="sm" variant="outline" className="mt-3">
                Добавить автомобиль
              </ButtonLink>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {savedCars.slice(0, 3).map((car) => (
                <li key={car.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold text-ink-900">
                      {car.label || [car.brand.name, car.model?.name].filter(Boolean).join(" ")}
                      {car.isPrimary && (
                        <Badge variant="brand" className="ml-2">
                          Основная
                        </Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {[car.model?.name, car.generation?.name, car.modification?.name].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-500">
                      {car.productsCount} {productWord(car.productsCount)}
                    </span>
                    <Link
                      href={`/catalog${car.model?.slug ? `?marka=${car.brand.slug}&model=${car.model.slug}` : `?marka=${car.brand.slug}`}`}
                      className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                    >
                      Показать товары →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Section>

      <Section title="Мои отзывы" className="py-0">
        <Card className="overflow-hidden">
          {reviews.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">
              Отзывов пока нет. Отзыв можно оставить на карточке купленного товара.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {reviews.map((review) => (
                <li key={review.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/product/${review.product.slug}`}
                      className="text-sm font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {review.product.name}
                    </Link>
                    <Badge variant={review.status === "published" ? "success" : review.status === "rejected" ? "danger" : "warning"}>
                      {REVIEW_STATUSES[review.status as keyof typeof REVIEW_STATUSES] ?? review.status}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-600">{review.title || review.text}</p>
                  <p className="mt-1 text-xs text-ink-400">{formatDate(review.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Section>

      <Card className="px-5 py-4">
        <h2 className="text-base font-semibold text-ink-900">Контакты и помощь</h2>
        <div className="mt-3 grid gap-2 text-sm text-ink-600 sm:grid-cols-3">
          <p>
            Телефон:{" "}
            <a href={SITE.phoneHref} className="font-semibold text-ink-800">
              {SITE.phone}
            </a>
          </p>
          <p>
            E-mail:{" "}
            <a href={`mailto:${SITE.email}`} className="font-semibold text-ink-800">
              {SITE.email}
            </a>
          </p>
          <p>{SITE.workTime}</p>
        </div>
      </Card>
    </div>
  );
}
