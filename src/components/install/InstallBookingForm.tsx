"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { createInstallBookingAction } from "@/lib/actions/install";
import { INSTALL_SLOTS } from "@/lib/install-slots";
import { Alert, Button, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { formatDateLong, formatPhoneInput, formatPrice } from "@/lib/utils";

/**
 * Форма записи на установку (`InstallBooking`).
 * Дата — из ближайших рабочих дней, время — из простых слотов.
 * Товары можно выбрать из корзины (галочки) или описать текстом.
 */

export type InstallProductOption = { id: string; name: string; price: number; qty: number };

export function InstallBookingForm({
  cities,
  dates,
  cartItems,
  user,
  price,
  defaultCityId,
}: {
  cities: { id: string; name: string }[];
  dates: string[];
  cartItems: InstallProductOption[];
  user: { name: string; phone: string | null; email: string } | null;
  price: number;
  defaultCityId: string;
}) {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(createInstallBookingAction, {}, pathname);
  const [cityId, setCityId] = useState(defaultCityId);
  const [slotDate, setSlotDate] = useState(dates[0] ?? "");
  const [slotTime, setSlotTime] = useState<string>(INSTALL_SLOTS[0]);
  const [useCart, setUseCart] = useState(cartItems.length > 0);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <Alert variant="danger" title="Проверьте форму">
          {state.error}
        </Alert>
      )}

      <Card className="px-5 py-5">
        <h2 className="text-base font-semibold text-ink-900">1. Город и время</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Город" required htmlFor="install-city">
            <Select
              id="install-city"
              name="cityId"
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              required
            >
              {cities.length === 0 && <option value="">Города не настроены</option>}
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Дата" required htmlFor="install-date">
            <Select
              id="install-date"
              name="slotDate"
              value={slotDate}
              onChange={(event) => setSlotDate(event.target.value)}
              required
            >
              {dates.map((date) => (
                <option key={date} value={date}>
                  {formatDateLong(date)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Время" required htmlFor="install-time">
            <Select
              id="install-time"
              name="slotTime"
              value={slotTime}
              onChange={(event) => setSlotTime(event.target.value)}
              required
            >
              {INSTALL_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="px-5 py-5">
        <h2 className="text-base font-semibold text-ink-900">2. Автомобиль и товары</h2>

        <div className="mt-4">
          <Field
            label="Автомобиль"
            required
            htmlFor="install-car"
            hint="Марка, модель, год — можно добавить VIN"
          >
            <Input
              id="install-car"
              name="carInfo"
              placeholder="Toyota Camry XV70, 2019, VIN XW8ZZZ..."
              maxLength={200}
              required
            />
          </Field>
        </div>

        {cartItems.length > 0 && (
          <div className="mt-4 rounded-xl border border-ink-200 px-4 py-3">
            <Checkbox
              checked={useCart}
              onChange={(event) => setUseCart(event.target.checked)}
              label={
                <span className="text-sm text-ink-700">
                  Устанавливаем товары из корзины ({cartItems.length} поз. на {formatPrice(cartTotal)})
                </span>
              }
            />

            {useCart && (
              <ul className="mt-3 space-y-2">
                {cartItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 text-sm text-ink-600">
                    <input type="checkbox" name="productIds" value={item.id} defaultChecked className="size-4 rounded border-ink-300 text-brand-600" />
                    <span className="flex-1">{item.name}</span>
                    <span className="text-xs text-ink-400">
                      {item.qty} × {formatPrice(item.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {!useCart && (
              <p className="mt-2 text-xs text-ink-400">
                Установим товары, купленные у нас. Если товар ещё не куплен — опишите его ниже.
              </p>
            )}
          </div>
        )}

        <div className="mt-4">
          <Field
            label="Что устанавливаем"
            htmlFor="install-products"
            hint="Например: багажник WingBar + автобокс, фаркоп с электрикой"
          >
            <Input
              id="install-products"
              name="productText"
              placeholder="Багажник на рейлинги + автобокс 430 л"
              maxLength={300}
            />
          </Field>
        </div>
      </Card>

      <Card className="px-5 py-5">
        <h2 className="text-base font-semibold text-ink-900">3. Контакты</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Имя" required htmlFor="install-name">
            <Input id="install-name" name="name" defaultValue={user?.name ?? ""} autoComplete="name" required minLength={2} />
          </Field>

          <Field label="Телефон" required htmlFor="install-phone">
            <Input
              id="install-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={user?.phone ?? ""}
              placeholder="+7 (___) ___-__-__"
              required
              onChange={(event) => {
                event.currentTarget.value = formatPhoneInput(event.currentTarget.value);
              }}
            />
          </Field>

          <Field label="E-mail" htmlFor="install-email" hint="Пришлём подтверждение записи">
            <Input
              id="install-email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={user?.email ?? ""}
            />
          </Field>

          <Field label="Комментарий" htmlFor="install-comment">
            <Textarea
              id="install-comment"
              name="comment"
              placeholder="Удобное время, особенности авто, нужна ли электрика"
              maxLength={1000}
              className="min-h-20"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Checkbox
            name="agreement"
            required
            label={<span className="text-sm text-ink-600">Согласен на обработку персональных данных</span>}
          />
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-sm text-ink-500">Стоимость работ</p>
          <p className="text-2xl font-bold text-ink-900">{formatPrice(price)}</p>
          <p className="mt-1 text-xs text-ink-400">
            Точная сумма зависит от авто и объёма работ. Оплата после установки.
          </p>
        </div>
        <Button type="submit" size="lg" disabled={pending || !cityId || dates.length === 0}>
          {pending ? "Записываем…" : "Записаться на установку"}
        </Button>
      </Card>

      <p className="text-xs text-ink-400">
        Запись не является оплатой. Менеджер подтвердит слот звонком в течение рабочего дня. Если товары из{" "}
        <Link href="/cart" className="underline">
          корзины
        </Link>{" "}
        ещё не оплачены — установка возможна после получения товара.
      </p>
    </form>
  );
}
