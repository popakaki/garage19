"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { createCityAction, updateCityAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { CheckboxField, FormActions, FormSection, TextField } from "@/components/admin/form-fields";

/** Форма города: контакты, сроки доставки, самовывоз, SEO. */

export type CityDefaults = {
  id?: string;
  name?: string;
  slug?: string;
  region?: string;
  phone?: string;
  address?: string;
  workTime?: string;
  deliveryDays?: number;
  freeDeliveryFrom?: string;
  pickupAvailable?: boolean;
  deliveryAvailable?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
};

export function CityForm({
  mode,
  defaults,
  cancelHref = "/admin/cities",
}: {
  mode: "create" | "edit";
  defaults: CityDefaults;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    mode === "create" ? createCityAction : updateCityAction,
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
          Город сохранён
        </Alert>
      )}

      <FormSection title="Город">
        <TextField label="Название" name="name" defaultValue={defaults.name} required />
        <TextField label="Slug" name="slug" defaultValue={defaults.slug} hint="Пусто — из названия" />
        <TextField label="Регион" name="region" defaultValue={defaults.region} />
        <TextField label="Телефон" name="phone" defaultValue={defaults.phone} />
        <TextField label="Адрес склада" name="address" defaultValue={defaults.address} wrapperClassName="sm:col-span-2" />
        <TextField label="Часы работы" name="workTime" defaultValue={defaults.workTime} />
        <TextField label="Срок доставки, дней" name="deliveryDays" type="number" defaultValue={String(defaults.deliveryDays ?? 3)} />
        <TextField
          label="Бесплатная доставка от, ₽"
          name="freeDeliveryFrom"
          inputMode="decimal"
          defaultValue={defaults.freeDeliveryFrom}
          hint="Пусто — порог не задан"
        />
        <TextField label="Порядок" name="sortOrder" type="number" defaultValue={String(defaults.sortOrder ?? 100)} />
      </FormSection>

      <FormSection title="Условия">
        <CheckboxField label="Самовывоз доступен" name="pickupAvailable" defaultChecked={defaults.pickupAvailable ?? true} />
        <CheckboxField label="Доставка доступна" name="deliveryAvailable" defaultChecked={defaults.deliveryAvailable ?? true} />
        <CheckboxField label="Город по умолчанию" name="isDefault" defaultChecked={defaults.isDefault ?? false} />
        <CheckboxField label="Активен" name="isActive" defaultChecked={defaults.isActive ?? true} />
      </FormSection>

      <FormSection title="SEO">
        <TextField label="SEO Title" name="seoTitle" defaultValue={defaults.seoTitle} />
        <TextField label="SEO Description" name="seoDescription" defaultValue={defaults.seoDescription} />
      </FormSection>

      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {mode === "create" ? "Добавить город" : "Сохранить город"}
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
