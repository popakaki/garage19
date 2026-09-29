import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { canManage, type AdminResource } from "@/lib/admin/permissions";

/**
 * Обёртка страницы раздела админки: проверяет права пользователя и
 * передаёт его в тело страницы. Используется всеми страницами
 * src/app/admin/(panel)/**.
 */
export async function AdminPanelPage({
  resource,
  requireAdminRole = false,
  children,
}: {
  resource: AdminResource;
  requireAdminRole?: boolean;
  children: (ctx: { user: SessionUser }) => ReactNode | Promise<ReactNode>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const allowed = requireAdminRole ? user.role === "admin" : canManage(user, resource);

  if (!allowed) {
    return (
      <div className="g19-card mx-auto max-w-lg px-6 py-10 text-center">
        <ShieldAlert className="mx-auto mb-3 size-8 text-amber-500" aria-hidden />
        <h1 className="text-lg font-bold text-ink-900">Раздел недоступен</h1>
        <p className="mt-2 text-sm text-ink-500">
          У вашей учётной записи нет прав на этот раздел. Обратитесь к администратору магазина.
        </p>
        <Link
          href="/admin"
          className="mt-5 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Вернуться к сводке
        </Link>
      </div>
    );
  }

  return <>{await children({ user })}</>;
}
