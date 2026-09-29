import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { filterNavForUser } from "@/lib/admin/permissions";
import { ADMIN_NAV } from "@/lib/constants";
import { PanelShell } from "@/components/admin/panel-shell";

/**
 * Защищённая часть админки.
 * Route group не влияет на URL: маршруты остаются /admin/...
 * Без прав — редирект на /admin/login.
 */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/admin/login");
  }

  const navCount = filterNavForUser(ADMIN_NAV, user).length;

  return (
    <PanelShell
      user={{ name: user.name, email: user.email, role: user.role }}
      navCount={navCount}
    >
      {children}
    </PanelShell>
  );
}
