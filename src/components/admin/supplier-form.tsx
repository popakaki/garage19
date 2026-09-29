"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { createSupplierAction, updateSupplierAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { CheckboxField, FormActions, FormSection, TextField } from "@/components/admin/form-fields";
import { FEED_TYPES } from "@/lib/admin/labels";

/** Форма поставщика: контакты, прайс, наценка, активность. */

export type SupplierDefaults = {
  id?: string;
  name?: string;
  slug?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  priceUrl?: string;
  feedType?: string;
  marginPercent?: number | string;
  note?: string;
  isActive?: boolean;
};

export function SupplierForm({
  mode,
  defaults,
  compact = false,
}: {
  mode: "create" | "edit";
  defaults: SupplierDefaults;
  compact?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    mode === "create" ? createSupplierAction : updateSupplierAction,
    null,
  );
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok === true;

  return (
    <form action={formAction}>
      {mode === "edit" && defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      {ok && (
        <Alert variant="success" className="mb-4">
          Поставщик сохранён
        </Alert>
      )}

      <FormSection title="Поставщик" columns={compact ? 1 : 2}>
        <TextField label="Название" name="name" defaultValue={defaults.name} required />
        <TextField label="Slug" name="slug" defaultValue={defaults.slug} hint="Пусто — из названия" />
        {!compact && (
          <>
            <TextField label="Контактное лицо" name="contactPerson" defaultValue={defaults.contactPerson} />
            <TextField label="Телефон" name="phone" defaultValue={defaults.phone} />
            <TextField label="Email" name="email" type="email" defaultValue={defaults.email} />
          </>
        )}
        <TextField label="Ссылка на прайс" name="priceUrl" defaultValue={defaults.priceUrl} placeholder="https://…" />
        <div>
          <label className="g19-label" htmlFor={`feedType-${mode}-${defaults.id ?? "new"}`}>
            Тип фида
          </label>
          <select
            id={`feedType-${mode}-${defaults.id ?? "new"}`}
            name="feedType"
            defaultValue={defaults.feedType ?? ""}
            className="g19-input cursor-pointer"
          >
            <option value="">— не указан —</option>
            {Object.entries(FEED_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <TextField
          label="Наценка, %"
          name="marginPercent"
          inputMode="decimal"
          defaultValue={defaults.marginPercent === undefined ? "0" : String(defaults.marginPercent)}
          hint="Применяется при импорте прайса"
        />
        <CheckboxField label="Активен" name="isActive" defaultChecked={defaults.isActive ?? true} />
        {!compact && (
          <TextField label="Примечание" name="note" defaultValue={defaults.note} wrapperClassName="sm:col-span-2" />
        )}
      </FormSection>

      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {mode === "create" ? "Добавить поставщика" : "Сохранить"}
        </button>
      </FormActions>
    </form>
  );
}
