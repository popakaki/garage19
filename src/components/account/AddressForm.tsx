"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { saveAddressAction } from "@/lib/actions/account";
import { Alert, Button, Checkbox, Field, Input, Select } from "@/components/ui";

/**
 * Форма адреса доставки: добавление и редактирование (`Address`).
 * Город выбирается из справочника; ошибки показывает Server Action.
 */
export function AddressForm({
  cities,
  initial,
  onDone,
}: {
  cities: { id: string; name: string }[];
  initial?: { id: string; title: string; cityId: string | null; street: string; comment: string | null; isDefault: boolean };
  onDone?: () => void;
}) {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(saveAddressAction, {}, pathname);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert variant="danger">{state.error}</Alert>}
      {state?.success && <Alert variant="success">{state.success}</Alert>}

      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Название" htmlFor="address-title" hint="Например: «Дом» или «Офис»">
          <Input id="address-title" name="title" defaultValue={initial?.title ?? "Адрес"} maxLength={80} />
        </Field>

        <Field label="Город" htmlFor="address-city">
          <Select id="address-city" name="cityId" defaultValue={initial?.cityId ?? ""}>
            <option value="">— не указан —</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Адрес" required htmlFor="address-street" hint="Улица, дом, корпус, квартира">
        <Input
          id="address-street"
          name="street"
          defaultValue={initial?.street ?? ""}
          placeholder="ул. Автомобильная, 19, кв. 1"
          required
          minLength={5}
          maxLength={300}
        />
      </Field>

      <Field label="Комментарий" htmlFor="address-comment" hint="Домофон, подъезд, время доставки">
        <Input
          id="address-comment"
          name="comment"
          defaultValue={initial?.comment ?? ""}
          maxLength={300}
          placeholder="Код домофона 19"
        />
      </Field>

      <Checkbox name="isDefault" defaultChecked={initial?.isDefault} label="Сделать основным адресом" />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : initial?.id ? "Сохранить изменения" : "Добавить адрес"}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Отмена
          </Button>
        )}
      </div>
    </form>
  );
}
