"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import {
  audit,
  fail,
  getFormEnum,
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  redirectWith,
  toState,
} from "@/lib/admin/actions";
import type { ActionResult, ActionState } from "@/lib/admin/actions";

/**
 * Заказы: смена статуса и статуса оплаты, менеджерский комментарий,
 * редактирование контактных данных, удаление.
 * Каждое изменение пишется в statusHistory заказа и в AuditLog.
 */

type HistoryEntry = {
  status: string;
  comment?: string;
  at: string;
  by: string;
  source: string;
};

function parseHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is HistoryEntry => {
    return typeof item === "object" && item !== null && "status" in item && "at" in item;
  });
}

const TIMESTAMP_FIELD: Record<string, "confirmedAt" | "shippedAt" | "doneAt" | "canceledAt" | "paidAt"> = {
  confirmed: "confirmedAt",
  shipped: "shippedAt",
  done: "doneAt",
  canceled: "canceledAt",
  paid: "paidAt",
};

const ORDER_STATUS_KEYS = Object.keys(ORDER_STATUSES);
const PAYMENT_STATUS_KEYS = Object.keys(PAYMENT_STATUSES);

function revalidateOrder(id?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  if (id) revalidatePath(`/admin/orders/${id}`);
}

/** Смена статуса заказа + запись в историю и аудит. */
export async function updateOrderStatusAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = getFormString(formData, "id");
  const result = await guardAction("orders", async (user) => {
    const status = getFormEnum(formData, "status", ORDER_STATUS_KEYS);
    const comment = getFormOptional(formData, "comment");

    if (!isId(id)) return fail("Заказ не найден");
    if (!status) return fail("Выберите корректный статус");

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, statusHistory: true },
    });
    if (!order) return fail("Заказ не найден");
    if (order.status === status) return fail("Статус уже установлен");

    const history = parseHistory(order.statusHistory);
    history.push({
      status,
      comment: comment ?? "",
      at: new Date().toISOString(),
      by: user.name,
      source: "admin",
    });

    await prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: history,
        ...(TIMESTAMP_FIELD[status] ? { [TIMESTAMP_FIELD[status]]: new Date() } : {}),
      },
    });

    await audit(user, "status_change", "order", id, { status: `${order.status} → ${status}`, comment });
    return { ok: true };
  });
  revalidateOrder(isId(id) ? id : undefined);
  return toState(result);
}

/** Смена статуса оплаты. */
export async function updateOrderPaymentStatusAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = getFormString(formData, "id");
  const result = await guardAction("orders", async (user) => {
    const paymentStatus = getFormEnum(formData, "paymentStatus", PAYMENT_STATUS_KEYS);

    if (!isId(id)) return fail("Заказ не найден");
    if (!paymentStatus) return fail("Выберите корректный статус оплаты");

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, paymentStatus: true, statusHistory: true },
    });
    if (!order) return fail("Заказ не найден");
    if (order.paymentStatus === paymentStatus) return fail("Статус оплаты уже установлен");

    const history = parseHistory(order.statusHistory);
    history.push({
      status: `payment:${paymentStatus}`,
      at: new Date().toISOString(),
      by: user.name,
      source: "admin",
    });

    await prisma.order.update({
      where: { id },
      data: {
        paymentStatus,
        statusHistory: history,
        ...(paymentStatus === "paid" ? { paidAt: new Date() } : {}),
      },
    });

    await audit(user, "status_change", "order", id, { paymentStatus: `${order.paymentStatus} → ${paymentStatus}` });
    return { ok: true };
  });
  revalidateOrder(isId(id) ? id : undefined);
  return toState(result);
}

/** Редактирование заказа: контакты, доставка, комментарий менеджера. */
export async function updateOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = getFormString(formData, "id");
  const result = await guardAction("orders", async (user) => {
    const customerName = getFormString(formData, "customerName");
    const customerPhone = getFormString(formData, "customerPhone");
    if (!customerName) return fail("Укажите имя клиента");
    if (!customerPhone) return fail("Укажите телефон клиента");

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, managerComment: true },
    });
    if (!order) return fail("Заказ не найден");

    const managerComment = getFormOptional(formData, "managerComment") ?? null;

    await prisma.order.update({
      where: { id },
      data: {
        customerName,
        customerPhone,
        customerEmail: getFormOptional(formData, "customerEmail") ?? null,
        cityName: getFormString(formData, "cityName") || "—",
        deliveryType: getFormString(formData, "deliveryType") || "pickup",
        deliveryProvider: getFormOptional(formData, "deliveryProvider") ?? null,
        deliveryAddress: getFormOptional(formData, "deliveryAddress") ?? null,
        pickupPointAddress: getFormOptional(formData, "pickupPointAddress") ?? null,
        paymentType: getFormString(formData, "paymentType") || "cash",
        comment: getFormOptional(formData, "comment") ?? null,
        managerComment,
        carInfo: getFormOptional(formData, "carInfo") ?? null,
      },
    });

    await audit(user, "update", "order", id, {
      managerComment: { before: order.managerComment, after: managerComment },
    });
    return { ok: true };
  });
  revalidateOrder(isId(id) ? id : undefined);
  return toState(result);
}

/** Удаление заказа — только администратор. */
export async function deleteOrderAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirectWith("/admin/orders", "error.forbidden");
  }
  if (!isId(id)) {
    redirectWith("/admin/orders", "error.notfound");
  }

  try {
    const order = await prisma.order.findUnique({ where: { id }, select: { number: true } });
    if (!order) {
      redirectWith("/admin/orders", "error.notfound");
    }
    await prisma.order.delete({ where: { id } });
    await audit(user, "delete", "order", id, { number: order.number });
  } catch {
    redirectWith("/admin/orders", "error.failed");
  }

  revalidateOrder();
  redirectWith("/admin/orders", "order.deleted");
}
