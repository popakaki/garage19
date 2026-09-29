import { ORDER_STATUSES } from "@/lib/constants";

/**
 * Чтение журнала статусов заказа (`Order.statusHistory`, Json).
 * Обычный модуль (не Server Actions) — можно использовать где угодно.
 */

export type OrderStatusEntry = { status: string; at: string; comment?: string };

export function orderStatusLabel(status: string): string {
  return ORDER_STATUSES[status as keyof typeof ORDER_STATUSES] ?? status;
}

export function orderHistory(history: unknown): OrderStatusEntry[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (entry): entry is OrderStatusEntry =>
        Boolean(entry) && typeof entry === "object" && "status" in (entry as Record<string, unknown>),
    )
    .map((entry) => ({
      status: String(entry.status),
      at: String(entry.at ?? new Date().toISOString()),
      comment: entry.comment ? String(entry.comment) : undefined,
    }));
}
