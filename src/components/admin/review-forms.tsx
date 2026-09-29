"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { deleteReviewReplyAction, replyToReviewAction, updateReviewStatusAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";

/**
 * Действия модерации отзыва: публикация/отклонение, ответ магазина,
 * удаление ответа. Работают без JavaScript (обычный POST).
 */

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if ("error" in state && state.error) return <Alert variant="danger">{state.error}</Alert>;
  if ("ok" in state && state.ok) return <Alert variant="success">Сохранено</Alert>;
  return null;
}

export function ReviewModerationForm({
  reviewId,
  status,
  adminReply,
}: {
  reviewId: string;
  status: string;
  adminReply: string | null;
}) {
  const [statusState, statusAction] = useActionState<ActionState, FormData>(updateReviewStatusAction, null);
  const [replyState, replyAction] = useActionState<ActionState, FormData>(replyToReviewAction, null);
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteReviewReplyAction, null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form action={statusAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={reviewId} />
          <select name="status" defaultValue={status} className="g19-input w-40 py-1.5 text-xs">
            <option value="pending">На модерации</option>
            <option value="published">Опубликован</option>
            <option value="rejected">Отклонён</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-800"
          >
            Сменить статус
          </button>
        </form>

        {adminReply && (
          <form action={deleteAction}>
            <input type="hidden" name="id" value={reviewId} />
            <button
              type="submit"
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Удалить ответ
            </button>
          </form>
        )}
      </div>

      <Feedback state={statusState} />
      <Feedback state={deleteState} />

      <form action={replyAction} className="space-y-2">
        <input type="hidden" name="id" value={reviewId} />
        <textarea
          name="adminReply"
          rows={2}
          defaultValue={adminReply ?? ""}
          placeholder="Ответ магазина (виден на странице товара)"
          className="g19-input text-sm"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            Сохранить ответ
          </button>
          <Feedback state={replyState} />
        </div>
      </form>
    </div>
  );
}
