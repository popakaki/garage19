"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { saveSettingsAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { FormActions, FormSection, TextField, TextareaField } from "@/components/admin/form-fields";
import type { SettingsField } from "@/lib/admin/settings";

/**
 * Редактор группы настроек: поля называются так же, как ключи в Setting.
 * Пустое значение для незаполненной настройки допустимо.
 */
export function SettingsGroupForm({
  group,
  title,
  description,
  fields,
  values,
}: {
  group: string;
  title: string;
  description: string;
  fields: SettingsField[];
  values: Record<string, string>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveSettingsAction, null);
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok === true;

  return (
    <form action={formAction}>
      <input type="hidden" name="group" value={group} />
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      {ok && (
        <Alert variant="success" className="mb-4">
          Настройки сохранены
        </Alert>
      )}

      <FormSection title={title} description={description} columns={2}>
        {fields.map((field) =>
          field.type === "textarea" ? (
            <TextareaField
              key={field.key}
              label={field.label}
              name={field.key}
              hint={field.hint}
              rows={3}
              defaultValue={values[field.key] ?? ""}
              wrapperClassName="sm:col-span-2"
            />
          ) : (
            <TextField
              key={field.key}
              label={field.label}
              name={field.key}
              hint={field.hint}
              defaultValue={values[field.key] ?? ""}
              inputMode={field.type === "number" ? "decimal" : undefined}
            />
          ),
        )}
      </FormSection>

      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Сохранить настройки
        </button>
        <span className="text-xs text-ink-400">Изменения сразу применяются на сайте.</span>
      </FormActions>
    </form>
  );
}
