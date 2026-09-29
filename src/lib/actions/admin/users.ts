"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { USER_ROLES, type UserRole } from "@/lib/constants";
import { isValidEmail } from "@/lib/utils";
import {
  audit,
  fail,
  getFormBoolStrict,
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  redirectWith,
  type ActionState,
} from "@/lib/admin/actions";

/**
 * Пользователи: список, роли, блокировка, создание менеджера.
 * Раздел доступен только администратору; понизить или заблокировать себя нельзя.
 */

const ROLE_KEYS = Object.keys(USER_ROLES);

function normalizeRole(value: string | undefined): UserRole | undefined {
  if (!value) return undefined;
  return (ROLE_KEYS as UserRole[]).find((role) => role === value);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Создание сотрудника (менеджера или администратора). */
export async function createUserAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("users", async (user) => {
    const email = normalizeEmail(getFormString(formData, "email"));
    const name = getFormString(formData, "name");
    const password = getFormString(formData, "password");
    const role = normalizeRole(getFormString(formData, "role")) ?? "manager";

    if (!isValidEmail(email)) return fail("Укажите корректный email");
    if (!name) return fail("Укажите имя сотрудника");
    if (password.length < 8) return fail("Пароль должен быть не короче 8 символов");

    const busy = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (busy) return fail("Пользователь с таким email уже существует");

    const created = await prisma.user.create({
      data: {
        email,
        name,
        phone: getFormOptional(formData, "phone") ?? null,
        role,
        isActive: getFormBoolStrict(formData, "isActive") ?? true,
        passwordHash: await hashPassword(password),
      },
    });

    await audit(user, "create", "user", created.id, { email, role });
    revalidatePath("/admin/users");
    redirectWith("/admin/users", "user.created");
  });
}

/** Редактирование профиля пользователя (имя, телефон). */
export async function updateUserAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("users", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Пользователь не найден");

    const name = getFormString(formData, "name");
    if (!name) return fail("Укажите имя пользователя");

    const target = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } });
    if (!target) return fail("Пользователь не найден");

    await prisma.user.update({
      where: { id },
      data: {
        name,
        phone: getFormOptional(formData, "phone") ?? null,
        isActive: getFormBoolStrict(formData, "isActive") ?? true,
      },
    });

    await audit(user, "update", "user", id, { name, email: target.email });
    revalidatePath("/admin/users");
    return { ok: true };
  });
}

/** Смена роли. Админ не может понизить сам себя. */
export async function changeUserRoleAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const role = normalizeRole(getFormString(formData, "role"));

  await guardAction("users", async (user) => {
    if (!isId(id)) return fail("Пользователь не найден");
    if (!role) return fail("Выберите корректную роль");
    if (id === user.id && role !== "admin") return fail("Нельзя понизить собственную роль");
    if (id === user.id && role === "admin") return fail("Ваша роль уже администратор");

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true, email: true } });
    if (!target) return fail("Пользователь не найден");

    await prisma.user.update({ where: { id }, data: { role } });
    await audit(user, "update", "user", id, { role: `${target.role} → ${role}`, email: target.email });
    revalidatePath("/admin/users");
    return { ok: true };
  });

  redirectWith("/admin/users", "user.role");
}

/** Блокировка/разблокировка пользователя. */
export async function toggleUserActiveAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");

  await guardAction("users", async (user) => {
    if (!isId(id)) return fail("Пользователь не найден");
    if (id === user.id) return fail("Нельзя заблокировать собственную учётную запись");

    const target = await prisma.user.findUnique({ where: { id }, select: { isActive: true, email: true } });
    if (!target) return fail("Пользователь не найден");

    await prisma.user.update({ where: { id }, data: { isActive: !target.isActive } });
    if (target.isActive) {
      // Активные сессии заблокированного пользователя сразу прекращаются.
      await prisma.session.deleteMany({ where: { userId: id } });
    }
    await audit(user, "update", "user", id, { isActive: !target.isActive, email: target.email });
    revalidatePath("/admin/users");
    return { ok: true };
  });

  redirectWith("/admin/users", "user.updated");
}

/** Сброс пароля пользователю (только администратор). */
export async function resetUserPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("users", async (user) => {
    const id = getFormString(formData, "id");
    const password = getFormString(formData, "password");
    if (!isId(id)) return fail("Пользователь не найден");
    if (password.length < 8) return fail("Пароль должен быть не короче 8 символов");

    const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
    if (!target) return fail("Пользователь не найден");

    await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
    await prisma.session.deleteMany({ where: { userId: id } });
    await audit(user, "update", "user", id, { passwordReset: true, email: target.email });
    revalidatePath("/admin/users");
    return { ok: true };
  });
}

/** Удаление пользователя вместе с сессиями (только администратор). */
export async function deleteUserAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirectWith("/admin/users", "error.forbidden");
  }
  if (id === user.id) {
    redirectWith("/admin/users", "error.forbidden");
  }
  if (!isId(id)) {
    redirectWith("/admin/users", "error.notfound");
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { email: true, _count: { select: { orders: true } } },
    });
    if (!target) redirectWith("/admin/users", "error.notfound");

    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    await audit(user, "delete", "user", id, { email: target.email, orders: target._count.orders });
  } catch {
    redirectWith("/admin/users", "error.failed");
  }

  revalidatePath("/admin/users");
  redirectWith("/admin/users", "user.updated");
}
