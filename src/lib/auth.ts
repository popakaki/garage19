import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import prisma from "@/lib/prisma";
import type { UserRole } from "@/lib/constants";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "g19_session";
const SESSION_TTL_DAYS = 30;

// ─────────────────────────────────────────────────────────────────────────────
// Пароли: scrypt из стандартной библиотеки Node (без нативных зависимостей)
// ─────────────────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

// ─────────────────────────────────────────────────────────────────────────────
// Сессии
// ─────────────────────────────────────────────────────────────────────────────

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  cityId: string | null;
};

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  let userAgent: string | undefined;
  let ip: string | undefined;
  try {
    const headerList = await headers();
    userAgent = headerList.get("user-agent") ?? undefined;
    ip =
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      undefined;
  } catch {
    // headers() недоступен вне запроса — не критично
  }

  await prisma.session.create({
    data: { token, userId, expiresAt, userAgent, ip },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Текущий пользователь. Кэшируется на время одного запроса (React cache),
 * поэтому можно вызывать в layout и на страницах без лишних SQL.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  let token: string | undefined;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE)?.value;
  } catch {
    return null;
  }
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: { id: true, email: true, name: true, phone: true, role: true, cityId: true, isActive: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    if (session) {
      await prisma.session.deleteMany({ where: { id: session.id } });
    }
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role as UserRole,
    cityId: user.cityId,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

/**
 * Для страниц личного кабинета: неавторизованного посетителя отправляем на вход,
 * а не роняем страницу исключением. `next` возвращает пользователя на исходную страницу.
 */
export async function requireUserPage(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = nextPath ? `/account/login?next=${encodeURIComponent(nextPath)}` : "/account/login";
    redirect(target);
  }
  return user;
}

/**
 * Для страниц админки: без прав — редирект на форму входа.
 * (API и Server Actions используют `requireAdmin()` и обрабатывают исключение сами.)
 */
export async function requireAdminPage(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    const target = nextPath ? `/admin/login?next=${encodeURIComponent(nextPath)}` : "/admin/login";
    redirect(target);
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return Boolean(user && (user.role === "admin" || user.role === "manager"));
}

export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

/** Очистка просроченных сессий (вызывается из админки/крона). */
export async function cleanupSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return result.count;
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
