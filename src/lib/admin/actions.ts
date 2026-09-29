import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/constants";
import { resolveToast } from "@/lib/admin/toast";
import type { AdminResource } from "@/lib/admin/permissions";
import { canManage } from "@/lib/admin/permissions";
import { recordAudit, type AuditAction } from "@/lib/admin/audit";

/**
 * Общая обвязка Server Actions админки:
 *  * проверка прав;
 *  * аудит изменений;
 *  * предсказуемый результат `{ error }` и редиректы с сообщением.
 * Формы работают без JS: `<form action={someAction}>` — экшены необязаны
 * иметь клиентскую обвязку, поэтому состояние ошибки отдаётся и в редиректе,
 * и в возвращаемом значении (для useActionState).
 */

export type ActionState = { ok?: boolean; error?: string } | null;

export type ActionResult = { ok: true } | { ok: false; error: string };

export type TxClient = Prisma.TransactionClient;

// ─────────────────────────────────────────────────────────────────────────────
// Ошибки и результат
// ─────────────────────────────────────────────────────────────────────────────

export class AdminActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminActionError";
  }
}

/** Результат действия → состояние формы (для форм с useActionState). */
export function toState(result: ActionResult): ActionState {
  return result.ok ? { ok: true } : { error: result.error };
}

/** Системный бросок прав — форма ловит его и превращает в сообщение. */
export class AdminAccessError extends Error {
  constructor() {
    super("FORBIDDEN");
    this.name = "AdminAccessError";
  }
}

export function fail(message: string): ActionResult {
  return { ok: false, error: message };
}

export const ok: ActionResult = { ok: true };

/** Достаёт текст ошибки из исключения (для форм с useActionState). */
export function actionErrorState(error: unknown): ActionState {
  if (error instanceof AdminAccessError) return { error: "Недостаточно прав для этого действия" };
  if (error instanceof AdminActionError) return { error: error.message };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Права и текущий пользователь
// ─────────────────────────────────────────────────────────────────────────────

/** Проверяет роль и права на раздел. Бросает AdminAccessError. */
export async function requireCapability(resource: AdminResource): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !canManage(user, resource)) throw new AdminAccessError();
  return user;
}

/**
 * Обёртка мутирующего действия: права → работа → аудит → результат.
 * Ошибки БД не «текут» в UI — возвращается общее сообщение.
 */
export async function guardAction(
  resource: AdminResource,
  run: (user: SessionUser) => Promise<ActionResult>,
): Promise<ActionResult> {
  let user: SessionUser;
  try {
    user = await requireCapability(resource);
  } catch (error) {
    if (error instanceof AdminAccessError) return fail("Недостаточно прав для этого действия");
    return fail("Не удалось проверить права доступа");
  }
  try {
    return await run(user);
  } catch (error) {
    if (error instanceof AdminActionError) return fail(error.message);
    if (isPrismaKnownError(error)) return fail(mapPrismaError(error));
    return fail("Не удалось выполнить действие. Попробуйте ещё раз");
  }
}

/** Ключевые слова текста ошибки → код сообщения для редиректа. */
const TOAST_ERROR_HINTS: { match: RegExp; code: string }[] = [
  { match: /прав/i, code: "error.forbidden" },
  { match: /не найден|не найдена|не существует/i, code: "error.notfound" },
  { match: /уже (занят|есть|используется|существует)/i, code: "error.unique" },
  { match: /ссыл|связан|нельзя удалить|заказ/i, code: "error.relation" },
  { match: /файл|загруз/i, code: "error.upload" },
];

/** Код сообщения по тексту ошибки — для экшенов, которые отвечают редиректом. */
export function toastCodeForError(error: string): string {
  for (const hint of TOAST_ERROR_HINTS) {
    if (hint.match.test(error)) return hint.code;
  }
  return "error.invalid";
}

/**
 * Массовые действия и удаления отвечают редиректом, поэтому причину отказа
 * превращаем в код сообщения через `toastCodeForError`.
 */
export function errorToastCode(result: ActionResult): string | null {
  return result.ok ? null : toastCodeForError(result.error);
}

/** Проверка значения роли из формы. */
export function isKnownRole(value: string): value is UserRole {
  return value === "customer" || value === "manager" || value === "admin";
}

// ─────────────────────────────────────────────────────────────────────────────
// Аудит и редиректы
// ─────────────────────────────────────────────────────────────────────────────

export async function audit(
  user: SessionUser,
  action: AuditAction,
  entity: string,
  entityId: string | null,
  payload?: Record<string, unknown>,
): Promise<void> {
  await recordAudit({ user, action, entity, entityId, payload: payload ?? null });
}

type RedirectQuery = Record<string, string | number | null | undefined>;

export function redirectFailed(path: string, errorCode = "error.invalid", query?: RedirectQuery): never {
  return redirectWith(path, errorCode, query);
}

/** Редирект с сообщением (код сообщения — из ADMIN_TOASTS). */
export function redirectWith(path: string, toastCode: string, query?: RedirectQuery): never {
  const search = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      search.set(key, String(value));
    }
  }
  search.set("toast", toastCode);
  const resolved = resolveToast(toastCode);
  if (resolved) search.set("toastType", resolved.type);
  const amount = search.toString();
  redirect(`${path}${path.includes("?") ? "&" : "?"}${amount}`);
}

/** Сохраняет введённые значения формы в query-строке (чтобы не потерять их при ошибке). */
export function stickyQuery(formData: FormData, keys: string[]): RedirectQuery {
  const query: RedirectQuery = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed === "") continue;
    query[`f_${key}`] = trimmed.slice(0, 200);
  }
  return query;
}

// ─────────────────────────────────────────────────────────────────────────────
// Разбор FormData
// ─────────────────────────────────────────────────────────────────────────────

export function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function getFormRaw(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Пустая строка → undefined (для необязательных колонок Prisma). */
export function getFormOptional(formData: FormData, key: string): string | undefined {
  const value = getFormString(formData, key);
  return value === "" ? undefined : value;
}

export function getFormInt(formData: FormData, key: string): number | undefined {
  const value = getFormString(formData, key).replace(/\s/g, "").replace(",", ".");
  if (value === "") return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

export function getFormFloat(formData: FormData, key: string): number | undefined {
  const value = getFormString(formData, key).replace(/\s/g, "").replace(",", ".");
  if (value === "") return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getFormBool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

/** Чекбокс с учётом «снять галочку» (hidden-поле с тем же именем и значением ""). */
export function getFormBoolStrict(formData: FormData, key: string): boolean | undefined {
  const values = formData.getAll(key);
  if (values.length === 0) return undefined;
  return values.some((value) => value === "on" || value === "true" || value === "1");
}

export function getFormEnum<T extends string>(
  formData: FormData,
  key: string,
  allowed: readonly T[],
  fallback?: T,
): T | undefined {
  const value = getFormString(formData, key);
  const found = allowed.find((item) => item === value);
  return found ?? fallback;
}

export function getFormList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value !== "");
}

/** Многострочный текст → массив строк (изображения, документы, варианты). */
export function getFormLines(formData: FormData, key: string): string[] {
  return getFormRaw(formData, key)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** «1 | Автобокс | /uploads/a.jpg» → массивы по индексам. */
export function parseDelimited(lines: string[], fields: number, delimiter = "|"): string[][] {
  return lines.map((line) => {
    const parts = line.split(delimiter).map((part) => part.trim());
    while (parts.length < fields) parts.push("");
    return parts;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Ошибки Prisma
// ─────────────────────────────────────────────────────────────────────────────

type PrismaKnownError = { code: string; meta?: { target?: unknown } };

export function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    (error as { code: string }).code.startsWith("P")
  );
}

export function mapPrismaError(error: PrismaKnownError): string {
  switch (error.code) {
    case "P2002":
      return "Такое значение уже используется (slug, артикул или код)";
    case "P2003":
      return "Нельзя выполнить: на запись ссылаются другие данные";
    case "P2025":
      return "Запись не найдена — возможно, её уже удалили";
    default:
      return "Ошибка базы данных. Попробуйте ещё раз";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Транзакции
// ─────────────────────────────────────────────────────────────────────────────

export function runTransaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

/** Пересчёт рейтинга товара по опубликованным отзывам. */
export async function recalcProductRating(productId: string): Promise<void> {
  const aggregate = await prisma.review.aggregate({
    where: { productId, status: "published" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = aggregate._count._all;
  const avg = aggregate._avg.rating ?? 0;
  await prisma.product.update({
    where: { id: productId },
    data: { ratingAvg: Math.round(avg * 10) / 10, ratingCount: count },
  });
}

/** Проверка, что строка — непустой id (cuid). */
export function isId(value: string | undefined): value is string {
  return typeof value === "string" && value.length >= 5 && value.length <= 60 && !value.includes(" ");
}
