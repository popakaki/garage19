"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { REVIEW_STATUSES } from "@/lib/constants";
import {
  audit,
  fail,
  getFormEnum,
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  recalcProductRating,
  redirectWith,
  type ActionResult,
  type ActionState,
} from "@/lib/admin/actions";

/**
 * Модерация отзывов: публикация/отклонение, ответ магазина, пометка «проверен».
 * После изменения статуса пересчитываются ratingAvg/ratingCount товара.
 */

const REVIEW_STATUS_KEYS = Object.keys(REVIEW_STATUSES);

function revalidateReviews(productId?: string): void {
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  if (productId) revalidatePath(`/admin/products/${productId}`);
}

export async function updateReviewStatusAction(formData: FormData): Promise<ActionResult> {
  return guardAction("reviews", async (user) => {
    const id = getFormString(formData, "id");
    const status = getFormEnum(formData, "status", REVIEW_STATUS_KEYS);
    if (!isId(id)) return fail("Отзыв не найден");
    if (!status) return fail("Выберите корректный статус");

    const review = await prisma.review.findUnique({
      where: { id },
      select: { id: true, productId: true, status: true, isVerified: true },
    });
    if (!review) return fail("Отзыв не найден");

    await prisma.review.update({
      where: { id },
      data: { status, ...(status === "published" ? { isVerified: true } : {}) },
    });
    await recalcProductRating(review.productId);

    await audit(user, "status_change", "review", id, { status: `${review.status} → ${status}` });
    revalidateReviews(review.productId);
    return { ok: true };
  });
}

/** Массовая модерация выбранных отзывов. */
export async function bulkReviewStatusAction(formData: FormData): Promise<void> {
  const ids = formData
    .getAll("ids")
    .filter((value): value is string => typeof value === "string" && isId(value));
  const status = getFormString(formData, "status");

  await guardAction("reviews", async (user) => {
    if (ids.length === 0) return fail("Выберите отзывы");
    if (!REVIEW_STATUS_KEYS.includes(status)) return fail("Выберите корректный статус");

    const reviews = await prisma.review.findMany({ where: { id: { in: ids } }, select: { productId: true } });
    await prisma.review.updateMany({
      where: { id: { in: ids } },
      data: { status, ...(status === "published" ? { isVerified: true } : {}) },
    });
    for (const productId of new Set(reviews.map((review) => review.productId))) {
      await recalcProductRating(productId);
    }

    await audit(user, "status_change", "review", null, { status, count: ids.length });
    revalidateReviews();
    return { ok: true };
  });

  redirectWith("/admin/reviews", "review.updated");
}

/** Ответ магазина на отзыв. */
export async function replyToReviewAction(formData: FormData): Promise<ActionResult> {
  return guardAction("reviews", async (user) => {
    const id = getFormString(formData, "id");
    const reply = getFormOptional(formData, "adminReply");
    if (!isId(id)) return fail("Отзыв не найден");
    if (!reply) return fail("Введите текст ответа");

    const review = await prisma.review.findUnique({ where: { id }, select: { productId: true } });
    if (!review) return fail("Отзыв не найден");

    await prisma.review.update({
      where: { id },
      data: { adminReply: reply, adminReplyAt: new Date() },
    });
    await audit(user, "update", "review", id, { adminReply: true });
    revalidateReviews(review.productId);
    return { ok: true };
  });
}

export async function deleteReviewReplyAction(formData: FormData): Promise<ActionResult> {
  return guardAction("reviews", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Отзыв не найден");
    const review = await prisma.review.findUnique({ where: { id }, select: { productId: true } });
    if (!review) return fail("Отзыв не найден");

    await prisma.review.update({ where: { id }, data: { adminReply: null, adminReplyAt: null } });
    await audit(user, "update", "review", id, { adminReply: null });
    revalidateReviews(review.productId);
    return { ok: true };
  });
}

/** Ручная правка рейтинга (пересчёт из опубликованных отзывов). */
export async function recalcRatingsAction(formData: FormData): Promise<void> {
  await guardAction("reviews", async (user) => {
    const productId = getFormString(formData, "productId");
    if (isId(productId)) {
      await recalcProductRating(productId);
    } else {
      const products = await prisma.product.findMany({ select: { id: true }, take: 500 });
      for (const product of products) {
        const aggregate = await prisma.review.aggregate({
          where: { productId: product.id, status: "published" },
          _avg: { rating: true },
          _count: { _all: true },
        });
        await prisma.product.update({
          where: { id: product.id },
          data: {
            ratingAvg: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
            ratingCount: aggregate._count._all,
          },
        });
      }
    }
    await audit(user, "update", "review", productId || null, { recalc: true });
    revalidateReviews(isId(productId) ? productId : undefined);
    return { ok: true };
  });

  redirectWith("/admin/reviews", "review.updated");
}

export async function deleteReviewAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/reviews", "error.forbidden");
  }
  if (!isId(id)) redirectWith("/admin/reviews", "error.notfound");

  try {
    const review = await prisma.review.findUnique({ where: { id }, select: { productId: true, authorName: true } });
    if (!review) redirectWith("/admin/reviews", "error.notfound");
    await prisma.review.delete({ where: { id } });
    await recalcProductRating(review.productId);
    await audit(user, "delete", "review", id, { authorName: review.authorName });
  } catch {
    redirectWith("/admin/reviews", "error.failed");
  }

  revalidateReviews();
  redirectWith("/admin/reviews", "review.deleted");
}

/** Форма ответа: возвращает состояние для useActionState. */
export async function replyToReviewStateAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await replyToReviewAction(formData);
  return result.ok ? { ok: true } : { error: result.error };
}

/** Пометка «проверенный покупатель» вручную. */
export async function toggleReviewVerifiedAction(formData: FormData): Promise<ActionResult> {
  return guardAction("reviews", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Отзыв не найден");
    const review = await prisma.review.findUnique({ where: { id }, select: { isVerified: true, productId: true } });
    if (!review) return fail("Отзыв не найден");

    await prisma.review.update({ where: { id }, data: { isVerified: !review.isVerified } });
    await audit(user, "update", "review", id, { isVerified: !review.isVerified });
    revalidateReviews(review.productId);
    return { ok: true };
  });
}
