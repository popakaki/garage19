"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CALLBACK_TYPES } from "@/lib/constants";
import { isValidPhone } from "@/lib/utils";

/**
 * Заявки с форм сайта: обратный звонок, вопрос по товару, VIN-подбор, опт.
 * Запись в `CallbackRequest`; письма не отправляются (SMTP нет) —
 * событие пишется в лог сервера, менеджер видит заявку в админке.
 *
 * Антиспам: honeypot-поле `company` (люди его не видят) + минимальная длина телефона.
 * Формы работают без JavaScript: после обработки — redirect с меткой результата.
 */

const callbackSchema = z.object({
  type: z.enum(Object.keys(CALLBACK_TYPES) as [string, ...string[]]).default("callback"),
  name: z.string().trim().min(2, "Как к вам обращаться?").max(120),
  phone: z
    .string()
    .trim()
    .min(1, "Укажите телефон")
    .refine((value) => isValidPhone(value), "Телефон в формате +7 (999) 123-45-67"),
  email: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().max(2000).optional().default(""),
  carInfo: z.string().trim().max(200).optional().default(""),
  productId: z.string().trim().max(40).optional().default(""),
  source: z.string().trim().max(60).optional().default("site"),
  /** Honeypot: заполнено только ботами. */
  company: z.string().max(200).optional().default(""),
  redirectTo: z.string().trim().max(300).optional().default(""),
});

function buildRedirect(path: string, params: Record<string, string>): string {
  const base = path.split("?")[0] || "/";
  const search = new URLSearchParams(params);
  const hashIndex = path.indexOf("#");
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  return `${base}?${search.toString()}${hash}`;
}

export async function createCallbackAction(formData: FormData): Promise<void> {
  const raw = {
    type: String(formData.get("type") ?? "callback"),
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
    carInfo: String(formData.get("carInfo") ?? ""),
    productId: String(formData.get("productId") ?? ""),
    source: String(formData.get("source") ?? "site"),
    company: String(formData.get("company") ?? ""),
    redirectTo: String(formData.get("redirectTo") ?? ""),
  };

  const target = raw.redirectTo || "/";
  const parsed = callbackSchema.safeParse(raw);

  if (!parsed.success) {
    if (raw.company) return; // бот — молча выходим
    const firstError = parsed.error.issues[0]?.message ?? "Проверьте заполнение формы";
    redirect(buildRedirect(target, { callbackError: firstError }));
  }

  const data = parsed.data;

  // Honeypot: скрытое поле заполнено — помечаем как спам, пользователю показываем успех.
  if (data.company.trim() !== "") {
    console.warn(`[callback] honeypot triggered, source=${data.source}, phone=${data.phone}`);
    redirect(buildRedirect(target, { callback: "sent" }));
  }

  try {
    const user = await getCurrentUser();

    let ip: string | undefined;
    try {
      const headerList = await headers();
      ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? undefined;
    } catch {
      ip = undefined;
    }

    const productId = data.productId
      ? (await prisma.product.findUnique({ where: { id: data.productId }, select: { id: true } }))?.id ?? null
      : null;

    await prisma.callbackRequest.create({
      data: {
        type: data.type,
        name: data.name,
        phone: data.phone,
        email: data.email || user?.email || null,
        message: data.message || null,
        carInfo: data.carInfo || null,
        productId,
        source: data.source || "site",
      },
    });

    console.log(
      `[callback] created type=${data.type} phone=${data.phone} source=${data.source}` +
        `${productId ? ` product=${productId}` : ""}${ip ? ` ip=${ip}` : ""}`,
    );
  } catch (error) {
    console.error("[callback] failed", error);
    redirect(buildRedirect(target, { callbackError: "Не удалось отправить заявку. Позвоните нам, пожалуйста." }));
  }

  revalidatePath(target.split("?")[0] || "/");
  redirect(buildRedirect(target, { callback: "sent" }));
}
