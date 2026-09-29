import Link from "next/link";
import type { Metadata } from "next";
import { Alert, Badge, Card, EmptyState, Rating } from "@/components/ui";
import { requireUserPage } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { REVIEW_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";

/**
 * /account/reviews — мои отзывы: статус модерации, товар, ответ магазина.
 * Форму нового отзыва делает карточка товара (другой модуль) — здесь только просмотр.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Мои отзывы — Garage19",
    description: "Отзывы, которые вы оставили: статусы модерации, товары и ответы магазина.",
    path: "/account/reviews",
    noIndex: true,
  });
}

export default async function AccountReviewsPage() {
  const user = await requireUserPage("/account");

  const reviews = await prisma.review.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      title: true,
      text: true,
      pros: true,
      cons: true,
      status: true,
      isVerified: true,
      adminReply: true,
      adminReplyAt: true,
      createdAt: true,
      product: { select: { name: true, slug: true } },
    },
  });

  const published = reviews.filter((review) => review.status === "published").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Мои отзывы</h1>
          <p className="mt-1 text-sm text-ink-500">
            Всего отзывов: {reviews.length}
            {published > 0 ? ` · опубликовано: ${published}` : ""}
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          title="Отзывов пока нет"
          description="Отзыв можно оставить на странице купленного товара — он появится здесь со статусом модерации."
        />
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/product/${review.product.slug}`}
                      className="font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {review.product.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Rating value={review.rating} showValue={false} size="sm" />
                      <span className="text-xs text-ink-400">{formatDate(review.createdAt)}</span>
                      {review.isVerified && <Badge variant="success">Подтверждённая покупка</Badge>}
                    </div>
                  </div>

                  <Badge
                    variant={
                      review.status === "published" ? "success" : review.status === "rejected" ? "danger" : "warning"
                    }
                  >
                    {REVIEW_STATUSES[review.status as keyof typeof REVIEW_STATUSES] ?? review.status}
                  </Badge>
                </div>

                {review.title && <p className="mt-3 font-semibold text-ink-800">{review.title}</p>}
                <p className="mt-1 whitespace-pre-line text-sm text-ink-600">{review.text}</p>

                {(review.pros || review.cons) && (
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {review.pros && (
                      <p className="rounded-lg bg-success-50 px-3 py-2 text-emerald-900">
                        <span className="font-semibold">Плюсы: </span>
                        {review.pros}
                      </p>
                    )}
                    {review.cons && (
                      <p className="rounded-lg bg-danger-50 px-3 py-2 text-red-900">
                        <span className="font-semibold">Минусы: </span>
                        {review.cons}
                      </p>
                    )}
                  </div>
                )}

                {review.adminReply && (
                  <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50 px-3 py-2 text-sm">
                    <p className="text-xs font-semibold text-ink-500">
                      Ответ магазина{review.adminReplyAt ? ` · ${formatDate(review.adminReplyAt)}` : ""}
                    </p>
                    <p className="mt-1 text-ink-700">{review.adminReply}</p>
                  </div>
                )}

                <div className="mt-3">
                  <Link
                    href={`/product/${review.product.slug}#reviews`}
                    className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Открыть товар и отзывы →
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Alert variant="info">
        Отзыв можно оставить только по товару из вашего заказа — так мы сохраняем честность оценок.
      </Alert>
    </div>
  );
}
