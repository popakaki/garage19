import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, ButtonLink, Card, Container, PageHero } from "@/components/ui";
import { OrderView } from "@/components/checkout/OrderView";
import { OrderLookupForm } from "@/components/checkout/OrderLookupForm";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasGuestOrderAccess } from "@/lib/actions/order";
import { buildMetadata } from "@/lib/seo";

/**
 * /order/[number] — подтверждение и детали заказа.
 * Доступ: владелец заказа (сессия) либо гость, подтвердивший номер + телефон
 * (cookie `g19_order_<номер>`, ставится в `verifyGuestOrderAction`).
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params;
  const orderNumber = decodeURIComponent(number).toUpperCase();
  return buildMetadata({
    title: `Заказ ${orderNumber} — Garage19`,
    description: `Детали заказа ${orderNumber}: состав, доставка, оплата и статус.`,
    path: `/order/${orderNumber}`,
    noIndex: true,
  });
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ number }, query] = await Promise.all([params, searchParams]);
  const orderNumber = decodeURIComponent(number).toUpperCase();
  const created = query.created === "1";

  const [user, order] = await Promise.all([
    getCurrentUser(),
    prisma.order.findFirst({
      where: { number: orderNumber },
      include: { items: { orderBy: { id: "asc" } } },
    }),
  ]);

  if (!order) notFound();

  const isOwner = Boolean(user && order.userId === user.id);
  const hasAccess = isOwner || (await hasGuestOrderAccess(order.number));

  if (!hasAccess) {
    return (
      <>
        <PageHero
          title={`Заказ ${order.number}`}
          description="Чтобы посмотреть детали заказа, подтвердите номер и телефон."
          breadcrumbs={[
            { name: "Главная", href: "/" },
            { name: "Заказы", href: "/account/orders" },
            { name: order.number },
          ]}
        />
        <Container className="py-10">
          <div className="mx-auto max-w-lg space-y-4">
            <Card className="px-5 py-5">
              <h2 className="text-base font-semibold text-ink-900">Подтверждение доступа</h2>
              <p className="mt-1 text-sm text-ink-500">
                Укажите телефон, который называли при оформлении заказа — покажем состав, доставку и статус.
              </p>
              <div className="mt-4">
                <OrderLookupForm defaultNumber={order.number} />
              </div>
            </Card>

            <Alert variant="info">
              Войдите в{" "}
              <Link href="/account/login" className="font-semibold underline">
                личный кабинет
              </Link>
              , чтобы видеть все свои заказы без подтверждения.
            </Alert>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <PageHero
        title={created ? "Заказ оформлен" : `Заказ ${order.number}`}
        description={
          created
            ? "Мы получили заказ и свяжемся с вами для подтверждения."
            : "Состав заказа, доставка, оплата и текущий статус."
        }
        breadcrumbs={[
          { name: "Главная", href: "/" },
          { name: "Заказы", href: "/account/orders" },
          { name: order.number },
        ]}
      >
        <div className="no-print flex flex-wrap gap-2">
          <ButtonLink href="/account/orders" variant="outline" size="sm">
            Мои заказы
          </ButtonLink>
          <ButtonLink href="/catalog" variant="ghost" size="sm">
            В каталог
          </ButtonLink>
        </div>
      </PageHero>

      <Container className="py-8">
        <OrderView order={order} created={created} />

        <Card className="no-print mt-6 px-5 py-4 text-sm text-ink-500">
          <h3 className="text-sm font-semibold text-ink-900">Нужна помощь?</h3>
          <p className="mt-1">
            Позвоните нам или закажите обратный звонок — подскажем по срокам, оплате и установке. Номер заказа{" "}
            <span className="font-semibold text-ink-800">{order.number}</span> называйте при обращении.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href="/install" variant="outline" size="sm">
              Записаться на установку
            </ButtonLink>
            <ButtonLink href="/contacts" variant="ghost" size="sm">
              Контакты
            </ButtonLink>
          </div>
        </Card>
      </Container>
    </>
  );
}
