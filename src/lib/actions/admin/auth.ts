"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createSession, destroySession, getCurrentUser, verifyPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/admin/audit";
import { redirectWith, type ActionState } from "@/lib/admin/actions";

/**
 * Вход и выход из админки.
 * Вход доступен только пользователям с ролью admin или manager.
 */

export async function loginAdminAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Укажите email и пароль" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, isActive: true, passwordHash: true },
    });

    if (!user || !user.isActive) {
      return { error: "Неверный email или пароль" };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { error: "Неверный email или пароль" };
    }

    if (user.role !== "admin" && user.role !== "manager") {
      return { error: "У этого пользователя нет доступа к админ-панели" };
    }

    await createSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await recordAudit({
      user: { id: user.id, email: user.email, name: user.name, role: user.role === "admin" ? "admin" : "manager" },
      action: "login",
      entity: "user",
      entityId: user.id,
      payload: { via: "admin" },
    });
  } catch {
    return { error: "Не удалось войти: сервис временно недоступен" };
  }

  redirect("/admin");
}

/** Выход: удаляет сессию и возвращает на страницу входа. */
export async function logoutAdminAction(): Promise<void> {
  const user = await getCurrentUser();
  try {
    if (user) {
      await recordAudit({ user, action: "logout", entity: "user", entityId: user.id });
    }
    await destroySession();
  } catch {
    // даже если сессию не удалось удалить, пользователя отправляем на вход
  }
  redirectWith("/admin/login", "auth.loggedOut");
}
