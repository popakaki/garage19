import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/login-form";

/** Вход в админку. Если сессия уже есть — сразу в панель. */

export const metadata: Metadata = {
  title: "Вход в админ-панель — Garage19",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user && (user.role === "admin" || user.role === "manager")) {
    redirect("/admin");
  }

  return (
    <div
      data-admin-shell
      className="flex min-h-[70vh] items-center justify-center bg-ink-50 px-4 py-12"
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-600 text-base font-black text-white">
              G19
            </span>
            <span className="text-lg font-bold text-ink-900">Garage19</span>
          </Link>
          <h1 className="mt-4 text-xl font-bold text-ink-900">Вход в админ-панель</h1>
          <p className="mt-1 text-sm text-ink-500">
            Доступ для администраторов и менеджеров магазина
          </p>
        </div>

        <div className="g19-card px-6 py-6">
          <AdminLoginForm />
        </div>

        <p className="mt-5 text-center text-xs text-ink-400">
          Нет доступа? Обратитесь к администратору магазина — учётные записи создаются в разделе
          «Пользователи».
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/" className="font-medium text-brand-700 hover:text-brand-800">
            ← Вернуться на сайт
          </Link>
        </p>
      </div>
    </div>
  );
}
