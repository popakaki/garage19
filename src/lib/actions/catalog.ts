"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { isValidPhone, toInt, toStr } from "@/lib/utils";

/**
 * Server Actions каталога и карточки товара.
 * Все заявки складываются в CallbackRequest со статусом «новая» — менеджер
 * видит их в админке. Ничего не публикуется автоматически.
 */

const MAX_TEXT = 2000;

function cut(value: string | undefined, length = MAX_TEXT): string | undefined {
  if (!value) return undefined;
  return value.slice(0, length);
}

// ─────────────────────────────────────────────────────────────────────────────
// Быстрый заказ («Купить в 1 клик»)
// ─────────────────────────────────────────────────────────────────────────────

export async function quickOrderAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const name = toStr(formData.get("name"));
  const phone = toStr(formData.get("phone"));
  const productId = toStr(formData.get("productId"));
  const qty = toInt(formData.get("qty"), 1) ?? 1;
  const comment = toStr(formData.get("comment"));

  if (!name || name.length < 2) return { error: "Укажите имя" };
  if (!phone || !isValidPhone(phone)) return { error: "Укажите телефон в формате +7 (999) 123-45-67" };
  if (!productId) return { error: "Товар не найден, обновите страницу" };

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, slug: true, name: true },
  });
  if (!product) return { error: "Товар больше недоступен" };

  const messageParts: string[] = [`Быстрый заказ: ${product.name}, ${qty} шт.`];
  const trimmedComment = cut(comment, 500);
  if (trimmedComment) messageParts.push(trimmedComment);

  await prisma.callbackRequest.create({
    data: {
      type: "callback",
      name,
      phone,
      message: messageParts.join(". "),
      productId: product.id,
      source: "quick_order",
      status: "new",
    },
  });

  revalidatePath(`/product/${product.slug}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Вопрос по товару (Q&A в карточке)
// ─────────────────────────────────────────────────────────────────────────────

export async function askQuestionAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const productId = toStr(formData.get("productId"));
  const authorName = toStr(formData.get("authorName"));
  const email = toStr(formData.get("email"));
  const question = toStr(formData.get("question"));

  if (!productId) return { error: "Товар не найден, обновите страницу" };
  if (!authorName || authorName.length < 2) return { error: "Укажите имя" };
  if (!question || question.length < 10) return { error: "Опишите вопрос подробнее (минимум 10 символов)" };

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, slug: true },
  });
  if (!product) return { error: "Товар больше недоступен" };

  await prisma.productQuestion.create({
    data: {
      productId: product.id,
      authorName,
      email: cut(email, 200),
      question: cut(question) ?? question,
      status: "pending",
    },
  });

  await prisma.callbackRequest.create({
    data: {
      type: "question",
      name: authorName,
      phone: "",
      email: cut(email, 200),
      message: cut(question),
      productId: product.id,
      source: "product_qa",
      status: "new",
    },
  });

  revalidatePath(`/product/${product.slug}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// «Нет моей модификации» — заявка на подбор (незанятая ниша рынка)
// ─────────────────────────────────────────────────────────────────────────────

export async function requestCarSelectionAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const name = toStr(formData.get("name"));
  const phone = toStr(formData.get("phone"));
  const carInfo = toStr(formData.get("carInfo"));
  const message = toStr(formData.get("message"));
  const vin = toStr(formData.get("vin"));
  const source = toStr(formData.get("source")) ?? "catalog_empty";

  if (!name || name.length < 2) return { error: "Укажите имя" };
  if (!phone || !isValidPhone(phone)) return { error: "Укажите телефон в формате +7 (999) 123-45-67" };
  if (vin && vin.replace(/\s/g, "").length < 11) return { error: "VIN состоит из 17 символов" };

  const messageParts: string[] = [];
  const trimmedMessage = cut(message);
  if (trimmedMessage) messageParts.push(trimmedMessage);
  if (vin) messageParts.push(`VIN: ${vin.toUpperCase()}`);

  await prisma.callbackRequest.create({
    data: {
      type: vin ? "vin" : "callback",
      name,
      phone,
      message: messageParts.join(". ") || undefined,
      carInfo: cut(carInfo, 300),
      source: cut(source, 100),
      status: "new",
    },
  });

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Запрос обратного звонка / оптовый запрос (используется страницами каталога)
// ─────────────────────────────────────────────────────────────────────────────

export async function createCallbackAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const name = toStr(formData.get("name"));
  const phone = toStr(formData.get("phone"));
  const message = toStr(formData.get("message"));
  const source = toStr(formData.get("source")) ?? "catalog";

  if (!name || name.length < 2) return { error: "Укажите имя" };
  if (!phone || !isValidPhone(phone)) return { error: "Укажите телефон в формате +7 (999) 123-45-67" };

  await prisma.callbackRequest.create({
    data: {
      type: "callback",
      name,
      phone,
      message: cut(message),
      source: cut(source, 100),
      status: "new",
    },
  });

  return { ok: true };
}
