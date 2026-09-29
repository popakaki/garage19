import type { Metadata } from "next";
import { Alert, Card, Section } from "@/components/ui";
import { ProfileForm, ChangePasswordForm, AddressList } from "@/components/account/ProfileForms";
import { requireUserPage } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCities } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";

/**
 * /account/profile — ФИО, телефон, e-mail, город, адреса доставки и смена пароля.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Профиль — Garage19",
    description: "Контактные данные, адреса доставки и пароль личного кабинета.",
    path: "/account/profile",
    noIndex: true,
  });
}

export default async function AccountProfilePage() {
  const user = await requireUserPage("/account");

  const [record, cities, addresses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, phone: true, cityId: true, createdAt: true },
    }),
    getCities(),
    prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true, title: true, cityId: true, street: true, comment: true, isDefault: true },
    }),
  ]);

  if (!record) {
    return (
      <Alert variant="danger" title="Профиль недоступен">
        Не удалось загрузить данные аккаунта. Попробуйте выйти и войти снова.
      </Alert>
    );
  }

  const citiesForForm = cities.map((city) => ({ id: city.id, name: city.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Профиль</h1>
        <p className="mt-1 text-sm text-ink-500">
          Данные используются при оформлении заказов и для связи с вами.
        </p>
      </div>

      <Section title="Контактные данные" className="py-0">
        <Card className="px-5 py-5">
          <ProfileForm
            user={{ name: record.name, email: record.email, phone: record.phone, cityId: record.cityId }}
            cities={citiesForForm}
          />
        </Card>
      </Section>

      <Section title="Адреса доставки" subtitle="Основной адрес подставляется при оформлении заказа" className="py-0">
        <Card className="px-5 py-5">
          <AddressList addresses={addresses} cities={citiesForForm} />
        </Card>
      </Section>

      <Section title="Безопасность" className="py-0">
        <Card className="px-5 py-5">
          <ChangePasswordForm />
        </Card>
      </Section>
    </div>
  );
}
