"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircleQuestion, Star } from "lucide-react";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { askQuestionAction } from "@/lib/actions/catalog";
import { submitReviewAction } from "@/lib/actions/review";
import { cn, formatDate, timeAgo } from "@/lib/utils";

type ActionState = { error?: string; ok?: boolean };

const INITIAL: ActionState = {};

/**
 * Форма отзыва. Отзыв уходит на модерацию (статус pending) — публикуется
 * администратором, о чём честно написано в форме.
 */
export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      formData.set("rating", String(rating));
      return submitReviewAction(formData);
    },
    INITIAL,
  );

  if (state.ok) {
    return (
      <Alert variant="success" title="Спасибо за отзыв!">
        Он отправлен на модерацию и появится на странице после проверки. Обычно это занимает
        несколько часов в рабочее время.
      </Alert>
    );
  }

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="flex flex-wrap items-center gap-3">
        <span className="g19-label mb-0">Ваша оценка</span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Оценка товара">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} из 5`}
              onClick={() => setRating(value)}
              className="p-0.5"
            >
              <Star
                className={cn("size-6", value <= rating ? "fill-amber-400 text-amber-400" : "text-ink-300")}
                aria-hidden
              />
            </button>
          ))}
        </div>
        <span className="text-sm font-semibold text-ink-700">{rating} / 5</span>
      </div>

      {state.error && <Alert variant="danger">{state.error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Имя" required htmlFor="review-author">
          <Input id="review-author" name="authorName" required minLength={2} placeholder="Как вас подписать" />
        </Field>
        <Field label="Заголовок" htmlFor="review-title">
          <Input id="review-title" name="title" maxLength={120} placeholder="Коротко о главном" />
        </Field>
      </div>

      <Field label="Отзыв" required hint="Минимум 20 символов" htmlFor="review-text">
        <Textarea id="review-text" name="text" required minLength={20} className="min-h-28" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Плюсы" htmlFor="review-pros">
          <Textarea id="review-pros" name="pros" className="min-h-20" placeholder="Что понравилось" />
        </Field>
        <Field label="Минусы" htmlFor="review-cons">
          <Textarea id="review-cons" name="cons" className="min-h-20" placeholder="Что не устроило" />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Отправляем…" : "Отправить отзыв"}
        </Button>
        <span className="text-xs text-ink-400">
          Публикуем отзывы без правок, кроме нецензурных и рекламных.
        </span>
      </div>
    </form>
  );
}

/** Форма вопроса о товаре (Q&A) — ответ менеджера появляется на странице. */
export function QuestionForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => askQuestionAction(formData),
    INITIAL,
  );

  if (state.ok) {
    return (
      <Alert variant="success" title="Вопрос отправлен">
        Ответим в рабочее время и опубликуем здесь — вопрос увидят другие покупатели.
        Если нужен срочный ответ, позвоните:{" "}
        <Link href="/contacts" className="underline">
          контакты
        </Link>
        .
      </Alert>
    );
  }

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="productId" value={productId} />
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Имя" required htmlFor="question-author">
          <Input id="question-author" name="authorName" required minLength={2} placeholder="Ваше имя" />
        </Field>
        <Field label="E-mail" hint="Не публикуем, нужен для ответа" htmlFor="question-email">
          <Input id="question-email" name="email" type="email" placeholder="you@example.com" />
        </Field>
      </div>
      <Field label="Вопрос" required hint="Минимум 10 символов" htmlFor="question-text">
        <Textarea
          id="question-text"
          name="question"
          required
          minLength={10}
          className="min-h-24"
          placeholder="Подойдёт ли этот багажник на мою комплектацию с рейлингами?"
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>
          <MessageCircleQuestion className="size-4" aria-hidden />
          {pending ? "Отправляем…" : "Задать вопрос"}
        </Button>
        <span className="text-xs text-ink-400">Отвечаем в течение рабочего дня.</span>
      </div>
    </form>
  );
}

/** Карточка опубликованного отзыва: рейтинг, плюсы/минусы, ответ магазина. */
export function ReviewItem({
  review,
}: {
  review: {
    id: string;
    authorName: string;
    rating: number;
    title: string | null;
    text: string;
    pros: string | null;
    cons: string | null;
    createdAt: Date;
    isVerified: boolean;
    adminReply: string | null;
  };
}) {
  return (
    <article className="rounded-xl border border-ink-100 bg-white p-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1" aria-label={`Оценка ${review.rating} из 5`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn("size-4", star <= review.rating ? "fill-amber-400 text-amber-400" : "text-ink-200")}
              aria-hidden
            />
          ))}
        </div>
        <span className="font-semibold text-ink-900">{review.authorName}</span>
        {review.isVerified && <span className="text-xs font-medium text-success-600">Покупка подтверждена</span>}
        <time className="ml-auto text-xs text-ink-400" dateTime={review.createdAt.toISOString()} title={formatDate(review.createdAt, true)}>
          {timeAgo(review.createdAt)}
        </time>
      </header>

      {review.title && <h4 className="mt-2 font-semibold text-ink-900">{review.title}</h4>}
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-700">{review.text}</p>

      {(review.pros || review.cons) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {review.pros && (
            <div className="rounded-lg bg-success-50 p-3 text-sm text-ink-700">
              <span className="font-semibold text-success-600">Плюсы: </span>
              {review.pros}
            </div>
          )}
          {review.cons && (
            <div className="rounded-lg bg-danger-50 p-3 text-sm text-ink-700">
              <span className="font-semibold text-danger-600">Минусы: </span>
              {review.cons}
            </div>
          )}
        </div>
      )}

      {review.adminReply && (
        <div className="mt-3 rounded-lg border-l-4 border-brand-400 bg-brand-50/60 p-3 text-sm text-ink-700">
          <span className="font-semibold text-brand-800">Ответ магазина: </span>
          {review.adminReply}
        </div>
      )}
    </article>
  );
}

/** Карточка «вопрос — ответ». */
export function QuestionItem({
  question,
}: {
  question: {
    id: string;
    authorName: string;
    question: string;
    answer: string | null;
    answeredAt: Date | null;
    createdAt: Date;
    isPinned: boolean;
  };
}) {
  return (
    <article className="rounded-xl border border-ink-100 bg-white p-4">
      <header className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="size-4 text-brand-600" aria-hidden />
        <span className="font-semibold text-ink-900">{question.authorName}</span>
        {question.isPinned && <span className="text-xs font-semibold text-brand-700">Частый вопрос</span>}
        <time className="ml-auto text-xs text-ink-400" dateTime={question.createdAt.toISOString()}>
          {formatDate(question.createdAt)}
        </time>
      </header>
      <p className="mt-2 text-sm font-medium text-ink-900">{question.question}</p>
      {question.answer ? (
        <div className="mt-2 rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
          <span className="font-semibold text-ink-900">Ответ магазина: </span>
          {question.answer}
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink-400">Ответ готовится</p>
      )}
    </article>
  );
}

/** Карточка «вопрос — ответ». */
