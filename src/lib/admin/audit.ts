import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

/**
 * Аудит действий в админке.
 * Каждое изменяющее действие пишет запись в AuditLog (кто, что, id сущности).
 * Ошибки записи аудита никогда не ломают основную операцию.
 */

export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "import" | "status_change";

export type AuditInput = {
  user?: Pick<SessionUser, "id" | "email" | "name" | "role"> | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
  ip?: string | null;
};

/** Значение, пригодное для записи в Json-колонку Prisma. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Приводит произвольный объект к JSON-совместимому виду:
 * убирает undefined, Date превращает в ISO-строку, обрезает длинные строки.
 */
export function toJsonSafe(value: unknown, depth = 0): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toJsonSafe(item, depth + 1));
  if (typeof value === "object") {
    if (depth > 4) return "[deep]";
    const result: { [key: string]: JsonValue } = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      result[key] = toJsonSafe(item, depth + 1);
    }
    return result;
  }
  return String(value);
}

/** Json-совместимое значение в терминах Prisma (null допустим только в объектах). */
function toPrismaJson(value: JsonValue | undefined): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) return value as Prisma.InputJsonObject;
  return { value } as Prisma.InputJsonObject;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.user?.id ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        payload: input.payload ? toPrismaJson(toJsonSafe(input.payload)) : undefined,
        ip: input.ip ?? null,
      },
    });
  } catch {
    // Аудит не должен ломать бизнес-операцию (например, если БД ещё не поднята).
  }
}

/** Последние записи аудита — для сводки и карточек сущностей. */
export async function getRecentAudit(take = 10, entityId?: string) {
  try {
    return await prisma.auditLog.findMany({
      where: entityId ? { entityId } : undefined,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    });
  } catch {
    return [];
  }
}

/** История изменений конкретной сущности (для карточки заказа/товара). */
export async function getEntityHistory(entity: string, entityId: string, take = 20) {
  try {
    return await prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        action: true,
        payload: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });
  } catch {
    return [];
  }
}
