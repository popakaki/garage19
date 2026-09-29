"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { CALLBACK_STATUSES, CALLBACK_TYPES } from "@/lib/constants";
import { completeVinCallbackAction, updateCallbackAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";

/** Обработка заявки: статус, тип, комментарий менеджера, результат VIN-подбора. */
export function CallbackManageForm({
  callbackId,
  status,
  type,
  managerComment,
  isVin,
}: {
  callbackId: string;
  status: string;
  type: string;
  managerComment: string;
  isVin: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateCallbackAction, null);
  const [vinState, vinAction] = useActionState<ActionState, FormData>(completeVinCallbackAction, null);
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok === true;
  const vinError = vinState && "error" in vinState ? vinState.error : undefined;
  const vinOk = vinState && "ok" in vinState && vinState.ok === true;

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={callbackId} />
        <div>
          <label className="g19-label" htmlFor={`status-${callbackId}`}>
            Статус
          </label>
          <select id={`status-${callbackId}`} name="status" defaultValue={status} className="g19-input w-40 py-1.5 text-xs">
            {Object.entries(CALLBACK_STATUSES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="g19-label" htmlFor={`type-${callbackId}`}>
            Тип
          </label>
          <select id={`type-${callbackId}`} name="type" defaultValue={type} className="g19-input w-44 py-1.5 text-xs">
            {Object.entries(CALLBACK_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-56 flex-1">
          <label className="g19-label" htmlFor={`comment-${callbackId}`}>
            Комментарий менеджера
          </label>
          <input
            id={`comment-${callbackId}`}
            name="managerComment"
            defaultValue={managerComment}
            placeholder="Кто и когда связался"
            className="g19-input py-1.5 text-xs"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
        >
          Сохранить
        </button>
      </form>

      {error && <Alert variant="danger">{error}</Alert>}
      {ok && <Alert variant="success">Заявка обновлена</Alert>}

      {isVin && (
        <form action={vinAction} className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-ink-200 p-3">
          <input type="hidden" name="id" value={callbackId} />
          <div className="min-w-64 flex-1">
            <label className="g19-label" htmlFor={`vin-${callbackId}`}>
              Результат VIN-подбора
            </label>
            <input
              id={`vin-${callbackId}`}
              name="result"
              placeholder="Подобранные товары, артикулы, комментарий"
              className="g19-input py-1.5 text-xs"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white hover:bg-ink-800"
          >
            Завершить подбор
          </button>
          {vinError && <Alert variant="danger">{vinError}</Alert>}
          {vinOk && <Alert variant="success">Подбор сохранён, заявка закрыта</Alert>}
        </form>
      )}
    </div>
  );
}
