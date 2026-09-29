"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { createPickupPointAction, createTariffAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { CheckboxField, FormActions, FormSection, TextField } from "@/components/admin/form-fields";
import { PICKUP_PROVIDERS, TARIFF_PROVIDERS } from "@/lib/admin/labels";

/** Форма тарифа доставки (DeliveryTariff) для конкретного города. */
export function TariffForm({ cityId }: { cityId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createTariffAction, null);
  const error = state && "error" in state ? state.error : undefined;

  return (
    <form action={formAction}>
      <input type="hidden" name="cityId" value={cityId} />
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      <FormSection title="Новый тариф" columns={3}>
        <div>
          <label className="g19-label" htmlFor="tariff-provider">
            Служба
          </label>
          <select id="tariff-provider" name="provider" required className="g19-input cursor-pointer">
            {Object.entries(TARIFF_PROVIDERS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <TextField label="Название тарифа" name="name" required placeholder="Курьером до двери" />
        <TextField label="Стоимость, ₽" name="price" inputMode="decimal" required />
        <TextField label="Дней минимум" name="minDays" type="number" defaultValue="1" />
        <TextField label="Дней максимум" name="maxDays" type="number" defaultValue="5" />
        <TextField label="Мин. сумма заказа, ₽" name="minOrderTotal" inputMode="decimal" />
        <TextField label="Макс. вес, г" name="maxWeight" type="number" />
        <TextField label="Порядок" name="sortOrder" type="number" defaultValue="100" />
        <CheckboxField label="Активен" name="isActive" defaultChecked />
      </FormSection>
      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Добавить тариф
        </button>
      </FormActions>
    </form>
  );
}

/** Форма пункта выдачи (PickupPoint) для конкретного города. */
export function PickupPointForm({ cityId }: { cityId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createPickupPointAction, null);
  const error = state && "error" in state ? state.error : undefined;

  return (
    <form action={formAction}>
      <input type="hidden" name="cityId" value={cityId} />
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      <FormSection title="Новый пункт выдачи" columns={3}>
        <div>
          <label className="g19-label" htmlFor="pickup-provider">
            Служба
          </label>
          <select id="pickup-provider" name="provider" required className="g19-input cursor-pointer">
            {Object.entries(PICKUP_PROVIDERS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <TextField label="Код пункта" name="code" required placeholder="MSK123" />
        <TextField label="Название" name="name" />
        <TextField label="Адрес" name="address" required wrapperClassName="sm:col-span-2" />
        <TextField label="Часы работы" name="workTime" />
        <TextField label="Телефон" name="phone" />
        <TextField label="Широта" name="lat" inputMode="decimal" />
        <TextField label="Долгота" name="lng" inputMode="decimal" />
        <CheckboxField label="Активен" name="isActive" defaultChecked />
      </FormSection>
      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Добавить пункт
        </button>
      </FormActions>
    </form>
  );
}
