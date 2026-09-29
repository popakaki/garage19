import Link from "next/link";
import type { Metadata } from "next";
import { Star } from "lucide-react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { REVIEW_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { buildHref, buildPagination, getPage, getPerPage, getStr, skipTake, type SearchParamsRecord } from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ReviewStatusBadge, StatusBadge } from "@/components/admin/badges";
import { FilterBar, FilterItem, QuickFilters } from "@/components/admin/filters";
import { TablePagination } from "@/components/admin/data-table";
import { ReviewModerationForm } from "@/components/admin/review-forms";
import { bulkReviewStatusAction, deleteReviewAction, recalcRatingsAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Отзывы" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="reviews">
      {async () => {
        const status = getStr(params, "status");
        const rating = getStr(params, "rating");
        const search = getStr(params, "q")?.trim();
        const reply = getStr(params, "reply");
        const page = getPage(params);
        const perPage = getPerPage(params, 20);

        const where: Prisma.ReviewWhereInput = {
          ...(status && status in REVIEW_STATUSES ? { status } : {}),
          ...(rating ? { rating: Number.parseInt(rating, 10) } : {}),
          ...(reply === "no" ? { adminReply: null } : reply === "yes" ? { adminReply: { not: null } } : {}),
          ...(search
            ? {
                OR: [
                  { text: { contains: search, mode: "insensitive" } },
                  { authorName: { contains: search, mode: "insensitive" } },
                  { product: { name: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        };

        const [total, reviews, counters] = await Promise.all([
          prisma.review.count({ where }),
          prisma.review.findMany({
            where,
            orderBy: { createdAt: "desc" },
            ...skipTake(page, perPage),
            select: {
              id: true,
              authorName: true,
              rating: true,
              title: true,
              text: true,
              pros: true,
              cons: true,
              status: true,
              isVerified: true,
              adminReply: true,
              createdAt: true,
              product: { select: { id: true, name: true, slug: true } },
              user: { select: { id: true, email: true } },
            },
          }),
          prisma.review.groupBy({ by: ["status"], _count: { _all: true } }),
        ]);

        const pagination = buildPagination(page, perPage, total);
        const record: SearchParamsRecord = {
          ...(status ? { status } : {}),
          ...(rating ? { rating } : {}),
          ...(reply ? { reply } : {}),
          ...(search ? { q: search } : {}),
        };
        const statusMap = new Map(counters.map((row) => [row.status, row._count._all]));

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Отзывы"
              description="Модерация, ответы магазина и пересчёт рейтинга товаров."
              actions={
                <form action={recalcRatingsAction}>
                  <button
                    type="submit"
                    className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    Пересчитать рейтинги
                  </button>
                </form>
              }
            />

            <QuickFilters
              items={[
                { label: "Все", href: buildHref("/admin/reviews", record, { status: null, page: 1 }), active: !status },
                ...Object.entries(REVIEW_STATUSES).map(([key, label]) => ({
                  label,
                  href: buildHref("/admin/reviews", record, { status: key, page: 1 }),
                  active: status === key,
                  count: statusMap.get(key) ?? 0,
                })),
                {
                  label: "Без ответа",
                  href: buildHref("/admin/reviews", record, { reply: "no", page: 1 }),
                  active: reply === "no",
                },
              ]}
            />

            <FilterBar action="/admin/reviews" resetHref="/admin/reviews">
              <FilterItem label="Поиск" htmlFor="q" width="lg">
                <input id="q" name="q" defaultValue={search ?? ""} placeholder="Текст, автор, товар" className="g19-input" />
              </FilterItem>
              <FilterItem label="Оценка" width="sm">
                <select name="rating" defaultValue={rating ?? ""} className="g19-input cursor-pointer">
                  <option value="">Любая</option>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} ★
                    </option>
                  ))}
                </select>
              </FilterItem>
              <input type="hidden" name="status" value={status ?? ""} />
            </FilterBar>

            <AdminCard
              title={`Отзывы (${total})`}
              padded={false}
              actions={
                <form action={bulkReviewStatusAction} className="flex items-center gap-2">
                  <select name="status" defaultValue="published" className="g19-input w-40 py-1.5 text-xs">
                    <option value="published">Опубликовать выбранные</option>
                    <option value="rejected">Отклонить выбранные</option>
                    <option value="pending">Вернуть на модерацию</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-800"
                  >
                    Применить к выбранным
                  </button>
                </form>
              }
            >
              <ul className="divide-y divide-ink-100">
                {reviews.map((review) => (
                  <li key={review.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <label className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          name="ids"
                          value={review.id}
                          className="mt-1 size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Star
                                  key={index}
                                  className={
                                    index < review.rating ? "size-3.5 fill-amber-400 text-amber-400" : "size-3.5 text-ink-300"
                                  }
                                  aria-hidden
                                />
                              ))}
                            </span>
                            {review.title && <span className="text-sm font-semibold text-ink-900">{review.title}</span>}
                            <ReviewStatusBadge status={review.status} />
                            {review.isVerified && <StatusBadge tone="success">проверен</StatusBadge>}
                            {review.user && <StatusBadge tone="info">покупатель</StatusBadge>}
                          </span>
                          <span className="mt-1 block text-sm text-ink-700">{review.text}</span>
                          {review.pros && <span className="mt-1 block text-xs text-emerald-700">Плюсы: {review.pros}</span>}
                          {review.cons && <span className="mt-1 block text-xs text-red-600">Минусы: {review.cons}</span>}
                          <span className="mt-1 block text-xs text-ink-400">
                            {review.authorName} · {formatDate(review.createdAt, true)} ·{" "}
                            <Link href={`/admin/products/${review.product.id}`} className="hover:text-brand-700">
                              {review.product.name}
                            </Link>
                          </span>
                        </span>
                      </label>

                      <div className="flex shrink-0 items-start gap-2">
                        <Link
                          href={`/product/${review.product.slug}`}
                          target="_blank"
                          className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                        >
                          На сайте
                        </Link>
                        <ConfirmButton
                          action={deleteReviewAction}
                          id={review.id}
                          title="Удалить отзыв?"
                          description="Рейтинг товара будет пересчитан."
                        />
                      </div>
                    </div>

                    <div className="mt-3 pl-7">
                      <ReviewModerationForm reviewId={review.id} status={review.status} adminReply={review.adminReply} />
                    </div>
                  </li>
                ))}
                {reviews.length === 0 && (
                  <li className="px-5 py-12 text-center text-sm text-ink-500">Отзывы не найдены.</li>
                )}
              </ul>
              <div className="px-5 pb-4">
                <TablePagination basePath="/admin/reviews" params={record} pagination={pagination} />
              </div>
            </AdminCard>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
