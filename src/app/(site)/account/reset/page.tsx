import type { Metadata } from "next";
import Link from "next/link";
import { Alert, ButtonLink, Card, Container, PageHero } from "@/components/ui";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";
import prisma from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";

/**
 * /account/reset?token=... — установка нового пароля по ссылке из письма.
 * Почта пока не подключена, поэтому ссылку показывает форма восстановления
 * на странице входа (`requestPasswordResetAction`).
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Сброс пароля — Garage19",
    description: "Установите новый пароль для личного кабинета Garage19.",
    path: "/account/reset",
    noIndex: true,
  });
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";

  const reset = token
    ? await prisma.passwordReset.findUnique({ where: { token }, select: { expiresAt: true, usedAt: true } })
    : null;

  const valid = Boolean(reset && !reset.usedAt && reset.expiresAt > new Date());

  return (
    <>
      <PageHero
        title="Сброс пароля"
        description="Придумайте новый пароль — после сохранения все активные сессии будут завершены."
        breadcrumbs={[
          { name: "Главная", href: "/" },
          { name: "Личный кабинет", href: "/account/login" },
          { name: "Сброс пароля" },
        ]}
      />

      <Container className="py-8">
        <div className="mx-auto max-w-lg">
          <Card className="px-5 py-5">
            {valid ? (
              <ResetPasswordForm token={token} />
            ) : (
              <div className="space-y-4">
                <Alert variant="danger" title="Ссылка недействительна">
                  Ссылка сброса устарела или уже использована. Запросите новую на странице входа — она
                  формируется мгновенно.
                </Alert>
                <ButtonLink href="/account/login" variant="outline" size="sm">
                  К странице входа
                </ButtonLink>
              </div>
            )}
          </Card>

          <p className="mt-4 px-1 text-xs text-ink-400">
            Если войти не получается, напишите нам —{" "}
            <Link href="/contacts" className="underline">
              контакты и обратный звонок
            </Link>
            .
          </p>
        </div>
      </Container>
    </>
  );
}
