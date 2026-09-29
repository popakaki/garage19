"use client";

import { useActionState } from "react";
import { verifyGuestOrderAction } from "@/lib/actions/order";
import { Alert, Button, Field, Input } from "@/components/ui";
import { formatPhoneInput } from "@/lib/utils";

/**
 * Доступ к заказу для неавторизованного покупателя: номер заказа + телефон.
 * Проверка на сервере (`verifyGuestOrderAction`), затем cookie доступа и переход
 * на страницу заказа. Форма работает и без JavaScript.
 */
export function OrderLookupForm({ defaultNumber = "" }: { defaultNumber?: string }) {
  const [state, formAction, pending] = useActionState(verifyGuestOrderAction, {});

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert variant="danger">{state.error}</Alert>}

      <Field label="Номер заказа" required htmlFor="order-lookup-number" hint="Например, G19-000123">
        <Input
          id="order-lookup-number"
          name="number"
          defaultValue={defaultNumber}
          placeholder="G19-000123"
          required
          autoComplete="off"
        />
      </Field>

      <PhoneField />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Проверяем…" : "Показать заказ"}
      </Button>
    </form>
  );
}

/** Телефон с маской (клиентская часть); без JS принимается любой формат из 11 цифр. */
function PhoneField() {
  return (
    <Field label="Телефон" required htmlFor="order-lookup-phone" hint="Тот, что указывали при оформлении">
      <Input
        id="order-lookup-phone"
        name="phone"
        type="tel"
        inputMode="tel"
        placeholder="+7 (___) ___-__-__"
        required
        onChange={(event) => {
          event.currentTarget.value = formatPhoneInput(event.currentTarget.value);
        }}
      />
    </Field>
  );
}
