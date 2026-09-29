"use client";

import { useActionState } from "react";
import { Alert, Select, Textarea } from "@/components/ui";
import { createCategoryAction, updateCategoryAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { CheckboxField, FormActions, FormSection, TextField } from "@/components/admin/form-fields";
import { MoveProductsForm } from "@/components/admin/category-move";

/**
 * Форма категории: используется и для создания, и для редактирования
 * (вложенные страницы /admin/categories/[id]).
 */

export type CategoryDefaults = {
  id?: string;
  name?: string;
  slug?: string;
  parentId?: string;
  description?: string;
  image?: string;
  icon?: string;
  sortOrder?: number | string;
  isActive?: boolean;
  showInMenu?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
};

export function CategoryForm({
  mode,
  defaults,
  parentOptions,
  categoryOptions,
  cancelHref,
}: {
  mode: "create" | "edit";
  defaults: CategoryDefaults;
  parentOptions: { value: string; label: string }[];
  categoryOptions?: { value: string; label: string }[];
  cancelHref: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    mode === "create" ? createCategoryAction : updateCategoryAction,
    null,
  );
  const error = state && "error" in state ? state.error : undefined;

  return (
    <div className="space-y-4">
      <form action={formAction} encType="multipart/form-data">
        {mode === "edit" && defaults.id && <input type="hidden" name="id" value={defaults.id} />}
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <FormSection title="Основное">
          <TextField label="Название" name="name" defaultValue={defaults.name} required />
          <TextField label="Slug (URL)" name="slug" defaultValue={defaults.slug} hint="Пусто — сгенерируем из названия" />
          <div>
            <label className="g19-label" htmlFor="parentId">
              Родительская категория
            </label>
            <Select id="parentId" name="parentId" defaultValue={defaults.parentId ?? ""}>
              <option value="">— корневая категория —</option>
              {parentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-ink-400">Поддерживается два уровня: категория и подкатегория.</p>
          </div>
          <TextField label="Порядок сортировки" name="sortOrder" type="number" defaultValue={String(defaults.sortOrder ?? 100)} />
          <TextField label="Иконка" name="icon" defaultValue={defaults.icon} hint="Название иконки, например Cargo" />
          <TextField label="Изображение (URL)" name="image" defaultValue={defaults.image} />
          <div className="sm:col-span-2">
            <label className="g19-label" htmlFor="imageFile">
              Загрузить изображение
            </label>
            <input
              id="imageFile"
              type="file"
              name="imageFile"
              accept="image/*"
              className="block w-full cursor-pointer text-xs text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            />
          </div>
          <CheckboxField label="Активна" name="isActive" defaultChecked={defaults.isActive ?? true} />
          <CheckboxField label="Показывать в меню" name="showInMenu" defaultChecked={defaults.showInMenu ?? true} />
        </FormSection>

        <FormSection title="Описание" columns={1}>
          <div>
            <label className="g19-label" htmlFor="description">
              Описание категории
            </label>
            <Textarea id="description" name="description" rows={4} defaultValue={defaults.description} />
          </div>
        </FormSection>

        <FormSection title="SEO" columns={1}>
          <TextField label="SEO Title" name="seoTitle" defaultValue={defaults.seoTitle} />
          <div>
            <label className="g19-label" htmlFor="seoDescription">
              SEO Description
            </label>
            <Textarea id="seoDescription" name="seoDescription" rows={2} defaultValue={defaults.seoDescription} />
          </div>
          <TextField label="SEO Keywords" name="seoKeywords" defaultValue={defaults.seoKeywords} />
        </FormSection>

        <FormActions>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {mode === "create" ? "Создать категорию" : "Сохранить категорию"}
          </button>
          <a
            href={cancelHref}
            className="inline-flex items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            Отмена
          </a>
        </FormActions>
      </form>

      {mode === "edit" && defaults.id && categoryOptions && (
        <MoveProductsForm fromId={defaults.id} categoryOptions={categoryOptions} />
      )}
    </div>
  );
}
