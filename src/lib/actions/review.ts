"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toInt, toStr } from "@/lib/utils";

/**
 * Отзывы о товаре.
 * Отзыв всегда создаётся со статусом «pending» — публикует модератор в админке.
 * После модерации пересчитывается агрегированный рейтинг товара
 * (функция recalculateProductRating вызывается из админки).
 */

const MAX_TEXT = 4000;

function cut(value: string | undefined, length = MAX_TEXT): string | undefined {
  if (!value) return undefined;
  return value.slice(0, length);
}

export async function submitReviewAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const productId = toStr(formData.get("productId"));
  const authorName = toStr(formData.get("authorName"));
  const rating = toInt(formData.get("rating"), 5) ?? 5;
  const title = toStr(formData.get("title"));
  const text = toStr(formData.get("text"));
  const pros = toStr(formData.get("pros"));
  const cons = toStr(formData.get("cons"));

  if (!productId) return { error: "Товар не найден, обновите страницу" };
  if (!authorName || authorName.length < 2) return { error: "Укажите имя" };
  if (rating < 1 || rating > 5) return { error: "Оценка должна быть от 1 до 5" };
  if (!text || text.length < 20) return { error: "Расскажите о товаре подробнее (минимум 20 символов)" };

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, slug: true },
  });
  if (!product) return { error: "Товар больше недоступен" };

  const user = await getCurrentUser();

  await prisma.review.create({
    data: {
      productId: product.id,
      userId: user?.id ?? null,
      authorName,
      rating,
      title: cut(title, 200),
      text: cut(text) ?? text,
      pros: cut(pros, 1000),
      cons: cut(cons, 1000),
      status: "pending",
      isVerified: false,
    },
  });

  revalidatePath(`/product/${product.slug}`);
  return { ok: true };
}

/** Пересчёт ratingAvg/ratingCount по опубликованным отзывам (админка после модерации). */
export async function recalculateProductRating(productId: string): Promise<void> {
  const aggregate = await prisma.review.aggregate({
    where: { productId, status: "published" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAvg: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
      ratingCount: aggregate._count._all,
    },
  });

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (product) revalidatePath(`/product/${product.slug}`);
}
