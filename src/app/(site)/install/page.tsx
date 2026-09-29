import Link from "next/link";
import type { Metadata } from "next";
import { Alert, Badge, ButtonLink, Card, Container, PageHero, Section } from "@/components/ui";
import { InstallBookingForm } from "@/components/install/InstallBookingForm";
import { getCurrentUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import prisma from "@/lib/prisma";
import { getCities, getDefaultCity } from "@/lib/queries";
import { getInstallPrice } from "@/lib/delivery";
import { nextInstallDates } from "@/lib/install-slots";
import { formatDateLong, formatPrice } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";

/**
 * /install — запись на установку (`InstallBooking`).
 * Плюс информационный блок: как проходит установка фаркопа и регистрация в ГИБДД.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Запись на установку — Garage19",
    description:
      "Запишитесь на установку багажника, автобокса, велокрепления или фаркопа: монтаж, подключение электрики, помощь с документами для ГИБДД.",
    path: "/install",
  });
}

export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const bookedId = typeof query.booked === "string" ? query.booked : null;
  const cityFromQuery = typeof query.city === "string" ? query.city : null;

  const [user, cart, cities, defaultCity, price] = await Promise.all([
    getCurrentUser(),
    getCart(),
    getCities(),
    getDefaultCity(),
    getInstallPrice(),
  ]);

  const dates = nextInstallDates(12);
  const cityOptions = cities.map((city) => ({ id: city.id, name: city.name }));
  const defaultCityId = cityFromQuery && cities.some((city) => city.id === cityFromQuery)
    ? cityFromQuery
    : user?.cityId ?? defaultCity?.id ?? cities[0]?.id ?? "";

  const cartItems = cart.lines.map((line) => ({
    id: line.product.id,
    name: line.product.name,
    price: line.product.price,
    qty: line.qty,
  }));

  const booked = bookedId
    ? await prisma.installBooking.findUnique({
        where: { id: bookedId },
        select: {
          id: true,
          name: true,
          phone: true,
          carInfo: true,
          slotDate: true,
          slotTime: true,
          city: { select: { name: true } },
        },
      })
    : null;

  return (
    <>
      <PageHero
        title="Запись на установку"
        description="Установим багажник, автобокс, велокрепление или фаркоп, подключим электрику и поможем с документами для ГИБДД."
        breadcrumbs={[{ name: "Главная", href: "/" }, { name: "Установка" }]}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="brand">Работы от {formatPrice(price)}</Badge>
          <Badge variant="outline">Гарантия на монтаж 12 месяцев</Badge>
        </div>
      </PageHero>

      <Container className="py-8">
        {booked && (
          <div className="mb-6">
            <Alert variant="success" title="Запись принята!">
              <p>
                {booked.name}, ждём вас {booked.slotDate ? formatDateLong(booked.slotDate) : ""} в{" "}
                {booked.slotTime ?? "согласованное время"}
                {booked.city?.name ? `, ${booked.city.name}` : ""}. Автомобиль: {booked.carInfo}.
              </p>
              <p className="mt-1">
                Менеджер позвонит на {booked.phone} для подтверждения. Номер записи: <b>{booked.id.slice(-6)}</b>.
              </p>
            </Alert>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <InstallBookingForm
            cities={cityOptions}
            dates={dates}
            cartItems={cartItems}
            user={user ? { name: user.name, phone: user.phone, email: user.email } : null}
            price={price}
            defaultCityId={defaultCityId}
          />

          <div className="space-y-4">
            <Card className="px-5 py-4">
              <h2 className="text-base font-semibold text-ink-900">Как проходит установка</h2>
              <ol className="mt-3 space-y-2 text-sm text-ink-600">
                <li>1. Заявка и подтверждение слота менеджером.</li>
                <li>2. Проверка комплектации под ваш автомобиль.</li>
                <li>3. Монтаж 1–3 часа в зависимости от работ.</li>
                <li>4. Проверка крепления и подключения электрики.</li>
                <li>5. Документы: акт, гарантийный талон, паспорт изделия.</li>
              </ol>
            </Card>

            <Card className="px-5 py-4">
              <h2 className="text-base font-semibold text-ink-900">Фаркоп и ГИБДД</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                <li>• С 2021 года установленный фаркоп (ТСУ) нужно регистрировать в ГИБДД.</li>
                <li>• Мы выдаём паспорт изделия и сертификат соответствия — они нужны для регистрации.</li>
                <li>• По желанию подготовим пакет документов и подскажем порядок действий.</li>
                <li>• Электрику подключаем по штатной схеме, без вмешательства в блок управления.</li>
              </ul>
              <p className="mt-3 text-xs text-ink-400">
                Требования ГИБДД могут отличаться по регионам — уточните у менеджера при записи.
              </p>
            </Card>

            <Card className="px-5 py-4">
              <h2 className="text-base font-semibold text-ink-900">Что взять с собой</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                <li>• Свидетельство о регистрации ТС (СТС).</li>
                <li>• Документ, удостоверяющий личность.</li>
                <li>• Товары, которые нужно установить (если куплены не у нас).</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href="/cart" variant="outline" size="sm">
                  В корзину
                </ButtonLink>
                <ButtonLink href="/catalog" variant="ghost" size="sm">
                  В каталог
                </ButtonLink>
              </div>
            </Card>
          </div>
        </div>

        <Section title="Частые вопросы" className="pb-0">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="px-5 py-4">
              <h3 className="text-sm font-semibold text-ink-900">Можно установить товар, купленный не у вас?</h3>
              <p className="mt-1 text-sm text-ink-500">
                Да, если он предназначен для вашего автомобиля и есть паспорт изделия. Стоимость работ та же.
              </p>
            </Card>
            <Card className="px-5 py-4">
              <h3 className="text-sm font-semibold text-ink-900">Сколько занимает установка багажника?</h3>
              <p className="mt-1 text-sm text-ink-500">
                Поперечины на рейлинги — около часа, автобокс — 20–30 минут, фаркоп с электрикой — 2–3 часа.
              </p>
            </Card>
            <Card className="px-5 py-4">
              <h3 className="text-sm font-semibold text-ink-900">Нужно ли мыть машину перед установкой?</h3>
              <p className="mt-1 text-sm text-ink-500">
                Желательно: чистая крыша и точки крепления ускоряют монтаж и защищают ЛКП.
              </p>
            </Card>
            <Card className="px-5 py-4">
              <h3 className="text-sm font-semibold text-ink-900">А если не подойдёт по факту?</h3>
              <p className="mt-1 text-sm text-ink-500">
                Проверим совместимость до монтажа. Если товар не подошёл — обменяем или вернём деньги.{" "}
                <Link href="/page/vozvrat" className="underline">
                  Условия возврата
                </Link>
                .
              </p>
            </Card>
          </div>
        </Section>
      </Container>
    </>
  );
}
