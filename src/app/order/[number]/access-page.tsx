import Link from "next/link";
import { Alert, Badge, ButtonLink, Card, Container, Field, Input, PageHero } from "@/components/ui";
import { OrderLookupForm } from "@/components/checkout/OrderLookupForm";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasGuestOrderAccess } from "@/lib/actions/order";
import { ORDER_STATUSES, PAYMENT_STATUSES, DELIVERY_TYPES, PAYMENT_TYPES } from "@/lib/constants";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

/**
 * Экран доступа к гостевому заказу.
 * Показывается, если посетитель не авторизован и не подтверждал доступ ранее.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Доступ к заказу — Garage19",
    description: "Проверьте статус заказа Garage19 по номеру и телефону.",
    noIndex: true,
  });
}

export default async function OrderAccessPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const orderNumber = decodeURIComponent(number).toUpperCase();

  const [user, order] = await Promise.all([
    getCurrentUser(),
    prisma.order.findFirst({
      where: { number: orderNumber },
      select: { number: true, userId: true, customerPhone: true, customerName: true },
    }),
  ]);

  if (!order) {
    return (
      <>
        <PageHero
          title={`Заказ ${orderNumber}`}
          breadcrumbs={[{ name: "Главная", href: "/" }, { name: "Заказы", href: "/account/orders" }, { name: orderNumber }]}
        />
        <Container className="py-10">
          <Alert variant="danger" title="Заказ не найден">
            Проверьте номер заказа — он выглядит как G19-000123. Если номер верный, свяжитесь с нами по телефону.
            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonLink href="/account/orders" variant="outline" size="sm">
                Мои заказы
              </ButtonLink>
              <ButtonLink href="/catalog" variant="ghost" size="sm">
                В каталог
              </ButtonLink>
            </div>
          </Alert>
        </Container>
      </>
    );
  }

  if (user && order.userId === user.id) {
    // Заказ принадлежит текущему пользователю — отдаём страницу заказа.
    const { redirect } = await import("next/navigation");
    redirect(`/order/${order.number}`);
  }

  const guestAccess = await hasGuestOrderAccess(order.number);
  if (guestAccess) {
    const { redirect } = await import("next/navigation");
    redirect(`/order/${order.number}`);
  }

  const status = ORDER_STATUSES[order.number ? "new" : "new"];

  return (
    <>
      <PageHero
        title={`Заказ ${order.number}`}
        description="Подтвердите доступ к заказу: укажите телефон, который был указан при оформлении."
        breadcrumbs={[
          { name: "Главная", href: "/" },
          { name: "Заказы", href: "/account/orders" },
          { name: order.number },
        ]}
      />
      <Container className="py-10">
        <div className="mx-auto max-w-lg">
          <Card className="px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-ink-500">Заказ</p>
                <p className="text-lg font-bold text-ink-900">{order.number}</p>
              </div>
              <Badge variant="brand">{status}</Badge>
            </div>

            <div className="mt-4">
              <OrderLookupForm defaultNumber={order.number} />
            </div>

            <p className="mt-4 text-xs text-ink-400">
              Войдите в{" "}
              <Link href="/account/login" className="font-semibold text-brand-700 hover:text-brand-800">
                личный кабинет
              </Link>
              , чтобы видеть все заказы без подтверждения.
            </p>
          </Card>

          <Card className="mt-4 px-5 py-5 text-sm text-ink-500">
            <h2 className="mb-2 text-sm font-semibold text-ink-900">Что дальше</h2>
            <ul className="space-y-1.5">
              <li>• {PAYMENT_STATUSES.pending}: оплата подтверждается вручную или онлайн</li>
              <li>• {DELIVERY_TYPES.cdek_pvz} — трек-номер придёт в SMS</li>
              <li>• {PAYMENT_TYPES.invoice} — счёт отправим на e-mail организации</li>
            </ul>
          </Card>
        </div>
      </Container>
    </>
  );
}

/** Поля формы-заглушки используются только для типизации Field/Input. */
export type OrderAccessField = { name: string };

export function hiddenField(name: string, value: string) {
  return <Input type="hidden" name={name} value={value} />;
}

export function namedField(name: string) {
  return <Field htmlFor={name} label={name} />;
}
