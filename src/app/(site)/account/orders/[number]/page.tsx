import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, Card } from "@/components/ui";
import { OrderView } from "@/components/checkout/OrderView";
import { RepeatOrderButton } from "@/components/account/RepeatOrderButton";
import { requireUserPage } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";

/** /account/orders/[number] — детали заказа из личного кабинета. */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  const orderNumber = decodeURIComponent(number).toUpperCase();
  return buildMetadata({
    title: `Заказ ${orderNumber} — Garage19`,
    description: `Детали заказа ${orderNumber}: состав, доставка, оплата, статус.`,
    path: `/account/orders/${orderNumber}`,
    noIndex: true,
  });
}

export default async function AccountOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const [{ number }, user] = await Promise.all([params, requireUserPage("/account")]);
  const orderNumber = decodeURIComponent(number).toUpperCase();

  const order = await prisma.order.findFirst({
    where: { number: orderNumber, userId: user.id },
    include: { items: { orderBy: { id: "asc" } } },
  });

  if (!order) notFound();

  return (
    <div className="space-y-5">
      <nav className="text-xs text-ink-500">
        <Link href="/account" className="hover:text-brand-700">
          Личный кабинет
        </Link>{" "}
        /{" "}
        <Link href="/account/orders" className="hover:text-brand-700">
          Мои заказы
        </Link>{" "}
        / <span className="text-ink-700">{order.number}</span>
      </nav>

      <OrderView order={order} compact />

      <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="text-sm text-ink-500">
          Нужно что-то изменить или добавить к заказу? Позвоните менеджеру — номер заказа{" "}
          <span className="font-semibold text-ink-800">{order.number}</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          <RepeatOrderButton orderId={order.id} size="sm" />
          <ButtonLink href="/account/orders" variant="ghost" size="sm">
            Все заказы
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
