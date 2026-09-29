"use client";

import { useState } from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import {
  changePasswordAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateProfileAction,
} from "@/lib/actions/account";
import { Alert, Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { AddressForm } from "@/components/account/AddressForm";
import { voidAction } from "@/lib/form-action";
import { formatPhoneInput } from "@/lib/utils";

/** Форма профиля: ФИО, телефон, e-mail, город. */
export function ProfileForm({
  user,
  cities,
}: {
  user: { name: string; email: string; phone: string | null; cityId: string | null };
  cities: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(updateProfileAction, {}, pathname);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert variant="danger">{state.error}</Alert>}
      {state?.success && <Alert variant="success">{state.success}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ФИО" required htmlFor="profile-name">
          <Input id="profile-name" name="name" defaultValue={user.name} autoComplete="name" required minLength={2} />
        </Field>

        <Field label="Телефон" htmlFor="profile-phone">
          <Input
            id="profile-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={user.phone ?? ""}
            placeholder="+7 (___) ___-__-__"
            onChange={(event) => {
              event.currentTarget.value = formatPhoneInput(event.currentTarget.value);
            }}
          />
        </Field>

        <Field label="E-mail" required htmlFor="profile-email" hint="Используется для входа">
          <Input
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={user.email}
            required
          />
        </Field>

        <Field label="Город" htmlFor="profile-city" hint="Подставляется при оформлении заказа">
          <Select id="profile-city" name="cityId" defaultValue={user.cityId ?? ""}>
            <option value="">— не выбран —</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить профиль"}
      </Button>
    </form>
  );
}

/** Смена пароля из личного кабинета. */
export function ChangePasswordForm() {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(changePasswordAction, {}, pathname);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert variant="danger">{state.error}</Alert>}
      {state?.success && <Alert variant="success">{state.success}</Alert>}

      <Field label="Текущий пароль" required htmlFor="current-password">
        <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Новый пароль" required htmlFor="new-password" hint="Минимум 6 символов">
          <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={6} required />
        </Field>
        <Field label="Повторите пароль" required htmlFor="new-password-repeat">
          <Input
            id="new-password-repeat"
            name="newPasswordRepeat"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </Field>
      </div>

      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Обновляем…" : "Сменить пароль"}
      </Button>
    </form>
  );
}

/** Список адресов доставки с редактированием, удалением и выбором основного. */
export function AddressList({
  addresses,
  cities,
}: {
  addresses: { id: string; title: string; cityId: string | null; street: string; comment: string | null; isDefault: boolean }[];
  cities: { id: string; name: string }[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(addresses.length === 0);

  const cityName = (cityId: string | null) => cities.find((city) => city.id === cityId)?.name ?? "";

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !creating && (
        <p className="text-sm text-ink-500">Адресов пока нет — добавьте, чтобы не заполнять их при заказе.</p>
      )}

      <ul className="space-y-3">
        {addresses.map((address) => (
          <li key={address.id} className="rounded-xl border border-ink-100 px-4 py-3">
            {editingId === address.id ? (
              <AddressForm cities={cities} initial={address} onDone={() => setEditingId(null)} />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{address.title}</p>
                    {address.isDefault && <Badge variant="brand">Основной</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-ink-600">
                    {cityName(address.cityId) ? `${cityName(address.cityId)}, ` : ""}
                    {address.street}
                  </p>
                  {address.comment && <p className="mt-0.5 text-xs text-ink-400">{address.comment}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <Button type="button" variant="ghost" size="xs" onClick={() => setEditingId(address.id)}>
                    Изменить
                  </Button>

                  {!address.isDefault && (
                    <form action={voidAction(setDefaultAddressAction)}>
                      <input type="hidden" name="id" value={address.id} />
                      <Button type="submit" variant="ghost" size="xs">
                        Сделать основным
                      </Button>
                    </form>
                  )}

                  <form action={voidAction(deleteAddressAction)}>
                    <input type="hidden" name="id" value={address.id} />
                    <Button type="submit" variant="ghost" size="xs" className="text-ink-400 hover:text-danger-600">
                      Удалить
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {creating ? (
        <Card className="px-4 py-4">
          <h3 className="mb-3 text-sm font-semibold text-ink-900">Новый адрес</h3>
          <AddressForm cities={cities} onDone={addresses.length > 0 ? () => setCreating(false) : undefined} />
        </Card>
      ) : (
        <Button type="button" variant="outline" onClick={() => setCreating(true)}>
          Добавить адрес
        </Button>
      )}
    </div>
  );
}
