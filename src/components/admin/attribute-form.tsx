"use client";

import { useActionState } from "react";
import { Alert, Select, Textarea } from "@/components/ui";
import { ATTRIBUTE_TYPES } from "@/lib/constants";
import { createAttributeAction, updateAttributeAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { CheckboxField, FormActions, FormSection, TextField } from "@/components/admin/form-fields";

/** Форма характеристики (Attribute): создание и редактирование. */

export type AttributeDefaults = {
  id?: string;
  name?: string;
  slug?: string;
  categoryId?: string;
  type?: string;
  unit?: string;
  options?: string;
  isFilterable?: boolean;
  isRequired?: boolean;
  group?: string;
  sortOrder?: number | string;
  isActive?: boolean;
};

export function AttributeForm({
  mode,
  defaults,
  categoryOptions,
  cancelHref = "/admin/attributes",
}: {
  mode: "create" | "edit";
  defaults: AttributeDefaults;
  categoryOptions: { value: string; label: string }[];
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    mode === "create" ? createAttributeAction : updateAttributeAction,
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
          Характеристика сохранена
        </Alert>
      )}

      <FormSection title="Основное">
        <TextField label="Название" name="name" defaultValue={defaults.name} required />
        <TextField label="Slug" name="slug" defaultValue={defaults.slug} hint="Пусто — сгенерируем из названия" />
        <div>
          <label className="g19-label" htmlFor="type">
            Тип значения
          </label>
          <Select id="type" name="type" defaultValue={defaults.type ?? "select"}>
            {Object.entries(ATTRIBUTE_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <TextField label="Единица измерения" name="unit" defaultValue={defaults.unit} placeholder="кг, л, мм" />
        <div>
          <label className="g19-label" htmlFor="categoryId">
            Категория
          </label>
          <Select id="categoryId" name="categoryId" defaultValue={defaults.categoryId ?? ""}>
            <option value="">Общая характеристика</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <TextField label="Группа" name="group" defaultValue={defaults.group} hint="Например: Габариты, Крепление" />
        <TextField label="Порядок сортировки" name="sortOrder" type="number" defaultValue={String(defaults.sortOrder ?? 100)} />
      </FormSection>

      <FormSection title="Варианты значений" columns={1}>
        <div>
          <label className="g19-label" htmlFor="options">
            Варианты для типа «Список»
          </label>
          <Textarea
            id="options"
            name="options"
            rows={4}
            defaultValue={defaults.options}
            placeholder={"Алюминий, Сталь, ABS-пластик"}
          />
          <p className="mt-1 text-xs text-ink-400">Через запятую или с новой строки. Для других типов не заполняется.</p>
        </div>
      </FormSection>

      <FormSection title="Отображение">
        <CheckboxField label="Использовать в фильтре каталога" name="isFilterable" defaultChecked={defaults.isFilterable ?? true} />
        <CheckboxField label="Обязательное значение" name="isRequired" defaultChecked={defaults.isRequired ?? false} />
        <CheckboxField label="Активна" name="isActive" defaultChecked={defaults.isActive ?? true} />
      </FormSection>

      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {mode === "create" ? "Создать характеристику" : "Сохранить"}
        </button>
        <a
          href={cancelHref}
          className="inline-flex items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
        >
          Отмена
        </a>
      </FormActions>
    </form>
  );
}
