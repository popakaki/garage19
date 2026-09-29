import Link from "next/link";
import type { ReactNode } from "react";
import { Card, Container } from "@/components/ui";
import { AccountNav } from "@/components/account/AccountNav";
import { getCurrentUser } from "@/lib/auth";

/**
 * Каркас личного кабинета: у авторизованного пользователя — боковая навигация
 * (`ACCOUNT_NAV`), у гостя — только контент (вход, регистрация, сброс пароля).
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Container className="py-8">
        <nav className="mb-4 text-xs text-ink-500">
          <Link href="/" className="hover:text-brand-700">
            Главная
          </Link>{" "}
          / <span className="text-ink-700">Личный кабинет</span>
        </nav>
        {children}
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-ink-400">Покупатель</p>
            <p className="mt-1 font-semibold text-ink-900">{user.name}</p>
            <p className="text-xs text-ink-500">{user.email}</p>
            {user.phone && <p className="text-xs text-ink-500">{user.phone}</p>}
          </Card>

          <AccountNav />

          <Card className="px-4 py-4 text-xs text-ink-500">
            <p className="font-semibold text-ink-800">«Гараж» — наша фишка</p>
            <p className="mt-1">
              Сохраните автомобиль и смотрите, какие багажники, автобоксы и фаркопы подходят именно ему.
            </p>
            <Link
              href="/account/garage"
              className="mt-2 inline-block font-semibold text-brand-700 hover:text-brand-800"
            >
              Мой гараж →
            </Link>
          </Card>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
