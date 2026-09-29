"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { moveCategoryProductsAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { FormSection } from "@/components/admin/form-fields";

/** Перенос товаров из категории в другую (страница категории). */
export function MoveProductsForm({
  fromId,
  categoryOptions,
}: {
  fromId: string;
  categoryOptions: { value: string; label: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(moveCategoryProductsAction, null);
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok === true;

  return (
    <form action={formAction} className="g19-card overflow-hidden">
      <input type="hidden" name="fromId" value={fromId} />
      <FormSection
        title="Перенос товаров"
        description="Все товары этой категории перейдут в выбранную — удобно при реструктуризации каталога."
        columns={2}
      >
        <div>
          <label className="g19-label" htmlFor="toId">
            Категория назначения
          </label>
          <select id="toId" name="toId" required className="g19-input cursor-pointer">
            <option value="">— выберите категорию —</option>
            {categoryOptions
              .filter((option) => option.value !== fromId)
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            Перенести товары
          </button>
        </div>
        {error && (
          <div className="sm:col-span-2">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}
        {ok && (
          <div className="sm:col-span-2">
            <Alert variant="success">Товары перенесены</Alert>
          </div>
        )}
      </FormSection>
    </form>
  );
}
