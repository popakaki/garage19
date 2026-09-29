import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Card, Container, PageHero } from "@/components/ui";
import { LoginTabs } from "@/components/account/LoginTabs";
import { OrderLookupForm } from "@/components/checkout/OrderLookupForm";
import { getCurrentUser } from "@/lib/auth";
import { buildMetadata } from "@/lib/seo";

/**
 * /account/login — вход и регистрация на одной странице (вкладки),
 * восстановление пароля по e-mail и доступ к гостевому заказу.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Вход и регистрация — Garage19",
    description:
      "Войдите в личный кабинет Garage19: история заказов, «Гараж» сохранённых автомобилей, адреса доставки и отзывы.",
    path: "/account/login",
    noIndex: true,
  });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/account");

  const registered = query.registered === "1";
  const logout = query.logout === "1";
  const error = typeof query.error === "string" ? query.error : null;
  const next = typeof query.next === "string" ? query.next : undefined;

  return (
    <>
      <PageHero
        title="Личный кабинет"
        description="История заказов, сохранённые автомобили в «Гараже», адреса доставки и отзывы — в одном месте."
        breadcrumbs={[{ name: "Главная", href: "/" }, { name: "Личный кабинет" }]}
      />

      <Container className="py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          <div className="space-y-4">
            {registered && <Alert variant="success">Аккаунт создан — вы уже вошли в личный кабинет.</Alert>}
            {logout && <Alert variant="info">Вы вышли из аккаунта. Корзина сохранена.</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            <LoginTabs next={next} />

            <p className="px-1 text-xs text-ink-400">
              Регистрируясь, вы соглашаетесь с{" "}
              <Link href="/page/oferta" className="underline">
                офертой
              </Link>{" "}
              и{" "}
              <Link href="/page/privacy" className="underline">
                политикой обработки персональных данных
              </Link>
              .
            </p>
          </div>

          <div className="space-y-4">
            <Card className="px-5 py-5">
              <h2 className="text-base font-semibold text-ink-900">Проверить статус заказа</h2>
              <p className="mt-1 text-sm text-ink-500">
                Заказ можно оформить без регистрации — статус доступен по номеру и телефону.
              </p>
              <div className="mt-4">
                <OrderLookupForm />
              </div>
            </Card>

            <Card className="px-5 py-5">
              <h2 className="text-base font-semibold text-ink-900">Что даёт личный кабинет</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                <li>
                  <span className="font-semibold text-ink-800">«Гараж»</span> — сохраните свои авто и смотрите
                  подходящие товары: такого нет ни у одного конкурента.
                </li>
                <li>История заказов, повтор заказа в один клик и статусы доставки.</li>
                <li>Адреса доставки и данные получателя заполняются автоматически.</li>
                <li>Свои отзывы с фотографиями и статусами модерации.</li>
              </ul>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
}
