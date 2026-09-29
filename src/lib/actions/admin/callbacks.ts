"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CALLBACK_STATUSES, CALLBACK_TYPES } from "@/lib/constants";
import {
  audit,
  errorToastCode,
  fail,
  getFormEnum,
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  redirectWith,
  toState,
  type ActionResult,
  type ActionState,
} from "@/lib/admin/actions";

/**
 * Заявки (CallbackRequest): обратный звонок, вопрос, VIN-подбор, запись на
 * установку, опт. Смена статуса, комментарий менеджера, удаление.
 */

const CALLBACK_STATUS_KEYS = Object.keys(CALLBACK_STATUSES);
const CALLBACK_TYPE_KEYS = Object.keys(CALLBACK_TYPES);

export async function updateCallbackAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return toState(await applyCallbackUpdate(formData));
}

async function applyCallbackUpdate(formData: FormData): Promise<ActionResult> {
  return guardAction("callbacks", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Заявка не найдена");

    const status = getFormEnum(formData, "status", CALLBACK_STATUS_KEYS);
    const type = getFormEnum(formData, "type", CALLBACK_TYPE_KEYS);
    if (!status) return fail("Выберите корректный статус");

    const current = await prisma.callbackRequest.findUnique({
      where: { id },
      select: { status: true, managerComment: true, processedAt: true },
    });
    if (!current) return fail("Заявка не найдена");

    await prisma.callbackRequest.update({
      where: { id },
      data: {
        status,
        ...(type ? { type } : {}),
        managerComment: getFormOptional(formData, "managerComment") ?? null,
        processedAt: status === "done" || status === "spam" ? current.processedAt ?? new Date() : null,
      },
    });

    await audit(user, "status_change", "callbackRequest", id, {
      status: `${current.status} → ${status}`,
      comment: getFormOptional(formData, "managerComment") ?? null,
    });
    revalidatePath("/admin/callbacks");
    revalidatePath("/admin");
    return { ok: true };
  });
}

/** Быстрая смена статуса из списка. */
export async function setCallbackStatusAction(formData: FormData): Promise<void> {
  const status = getFormString(formData, "status");
  let toast = "callback.updated";
  const result = await updateCallbackAction(null, formData);
  if (!result || !("ok" in result) || result.ok !== true) toast = "error.invalid";
  redirectWith("/admin/callbacks", toast, { status });
}

export async function deleteCallbackAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/callbacks", "error.forbidden");
  }
  if (!isId(id)) redirectWith("/admin/callbacks", "error.notfound");

  try {
    const callback = await prisma.callbackRequest.findUnique({ where: { id }, select: { name: true, phone: true } });
    if (!callback) redirectWith("/admin/callbacks", "error.notfound");
    await prisma.callbackRequest.delete({ where: { id } });
    await audit(user, "delete", "callbackRequest", id, { name: callback.name });
  } catch {
    redirectWith("/admin/callbacks", "error.failed");
  }

  revalidatePath("/admin/callbacks");
  revalidatePath("/admin");
  redirectWith("/admin/callbacks", "callback.deleted");
}

/** Массовая обработка: «спам» одним нажатием. */
export async function bulkCallbackSpamAction(formData: FormData): Promise<void> {
  const ids = formData.getAll("ids").filter((value): value is string => typeof value === "string" && isId(value));

  const result = await guardAction("callbacks", async (user) => {
    if (ids.length === 0) return fail("Выберите заявки");
    await prisma.callbackRequest.updateMany({
      where: { id: { in: ids } },
      data: { status: "spam", processedAt: new Date() },
    });
    await audit(user, "status_change", "callbackRequest", null, { status: "spam", count: ids.length });
    revalidatePath("/admin/callbacks");
    revalidatePath("/admin");
    return { ok: true };
  });

  redirectWith("/admin/callbacks", errorToastCode(result) ?? "callback.updated");
}

/** VIN-заявки: пометить обработанной и сохранить результат подбора. */
export async function completeVinCallbackAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return toState(await applyVinComplete(formData));
}

async function applyVinComplete(formData: FormData): Promise<ActionResult> {
  return guardAction("callbacks", async (user) => {
    const id = getFormString(formData, "id");
    const result = getFormOptional(formData, "result");
    if (!isId(id)) return fail("Заявка не найдена");
    if (!result) return fail("Впишите результат подбора");

    const callback = await prisma.callbackRequest.findUnique({
      where: { id },
      select: { message: true, productId: true },
    });
    if (!callback) return fail("Заявка не найдена");

    const message = callback.message ? `${callback.message}\n\nПодбор: ${result}` : `Подбор: ${result}`;
    await prisma.callbackRequest.update({
      where: { id },
      data: {
        status: "done",
        message,
        managerComment: result,
        processedAt: new Date(),
      },
    });

    await audit(user, "status_change", "callbackRequest", id, { vin: true });
    revalidatePath("/admin/callbacks");
    return { ok: true };
  });
}
