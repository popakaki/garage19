"use client";

import { useActionState } from "react";
import { Alert, Select, Textarea } from "@/components/ui";
import { BANNER_POSITIONS } from "@/lib/constants";
import { createBannerAction, updateBannerAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { CheckboxField, FormActions, FormSection, TextField } from "@/components/admin/form-fields";
import { TEXT_ALIGN } from "@/lib/admin/labels";

/** Форма баннера главного слайдера и промо-блоков. */

export type BannerDefaults = {
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  mobileImage?: string;
  badge?: string;
  linkUrl?: string;
  linkText?: string;
  position?: string;
  textAlign?: string;
  sortOrder?: number;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
};

export function BannerForm({
  mode,
  defaults,
  cancelHref = "/admin/banners",
}: {
  mode: "create" | "edit";
  defaults: BannerDefaults;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    mode === "create" ? createBannerAction : updateBannerAction,
    null,
  );
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok === true;

  return (
    <form action={formAction} encType="multipart/form-data">
      {mode === "edit" && defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      {ok && (
        <Alert variant="success" className="mb-4">
          Баннер сохранён
        </Alert>
      )}

      <FormSection title="Содержимое">
        <TextField label="Заголовок" name="title" defaultValue={defaults.title} required />
        <TextField label="Подзаголовок" name="subtitle" defaultValue={defaults.subtitle} />
        <TextField label="Бейдж" name="badge" defaultValue={defaults.badge} placeholder="−20%, Новинка" />
        <div>
          <label className="g19-label" htmlFor={`position-${mode}-${defaults.id ?? "new"}`}>
            Показ на сайте
          </label>
          <Select id={`position-${mode}-${defaults.id ?? "new"}`} name="position" defaultValue={defaults.position ?? "hero"}>
            {Object.entries(BANNER_POSITIONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="g19-label" htmlFor={`textAlign-${mode}-${defaults.id ?? "new"}`}>
            Выравнивание текста
          </label>
          <Select id={`textAlign-${mode}-${defaults.id ?? "new"}`} name="textAlign" defaultValue={defaults.textAlign ?? "left"}>
            {Object.entries(TEXT_ALIGN).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <TextField label="Ссылка" name="linkUrl" defaultValue={defaults.linkUrl} placeholder="/catalog/avtoboksy" />
        <TextField label="Текст кнопки" name="linkText" defaultValue={defaults.linkText} placeholder="Смотреть" />
        <TextField label="Порядок" name="sortOrder" type="number" defaultValue={String(defaults.sortOrder ?? 100)} />
      </FormSection>

      <FormSection title="Изображения" columns={1}>
        <TextField label="Изображение (URL)" name="image" defaultValue={defaults.image} />
        <div>
          <label className="g19-label" htmlFor={`imageFile-${mode}-${defaults.id ?? "new"}`}>
            Загрузить изображение
          </label>
          <input
            id={`imageFile-${mode}-${defaults.id ?? "new"}`}
            type="file"
            name="imageFile"
            accept="image/*"
            className="block w-full cursor-pointer text-xs text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
          />
        </div>
        <TextField label="Мобильное изображение (URL)" name="mobileImage" defaultValue={defaults.mobileImage} />
        <div>
          <label className="g19-label" htmlFor="description">
            Описание
          </label>
          <Textarea id="description" name="description" rows={3} defaultValue={defaults.description} />
        </div>
      </FormSection>

      <FormSection title="Расписание">
        <TextField label="Показывать с" name="startsAt" type="datetime-local" defaultValue={defaults.startsAt} />
        <TextField label="Показывать по" name="endsAt" type="datetime-local" defaultValue={defaults.endsAt} />
        <CheckboxField label="Активен" name="isActive" defaultChecked={defaults.isActive ?? true} />
      </FormSection>

      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {mode === "create" ? "Создать баннер" : "Сохранить баннер"}
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
