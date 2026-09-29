"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createOrderAction } from "@/lib/actions/order";
import { Alert, Button, ButtonLink, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { formatPhoneInput, formatPrice, formatWeight } from "@/lib/utils";
import { DELIVERY_TYPES, PAYMENT_TYPES } from "@/lib/constants";

/**
 * Форма оформления заказа.
 *
 * • Все поля — обычные input внутри одного `<form action={createOrderAction}>`,
 *   поэтому заказ оформляется и без JavaScript (React 19 + Server Actions).
 * • Клиентский скрипт добавляет: маску телефона, живой пересчёт доставки,
 *   выбор пункта выдачи и показ ошибок сервера без перезагрузки.
 * • Цены, вес, скидку и стоимость доставки клиент не передаёт как значимые данные:
 *   сервер пересчитывает всё по БД при создании заказа.
 */

export type CheckoutCity = {
  id: string;
  name: string;
  deliveryDays: number;
  freeDeliveryFrom: number | null;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  address: string | null;
  phone: string | null;
  workTime: string | null;
};

export type CheckoutPickupPoint = {
  id: string;
  provider: string;
  cityId: string;
  code: string;
  address: string;
  name: string | null;
  workTime: string | null;
};

type DeliveryQuoteState = {
  price: number;
  daysMin: number;
  daysMax: number;
  tariffName: string;
  free: boolean;
};

const PREFS_KEY = "g19_checkout_prefs";

const PROVIDER_BY_TYPE: Record<string, string> = {
  cdek_pvz: "cdek",
  boxberry_pvz: "boxberry",
  post: "post",
  pickup: "pickup",
};

function positionsWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return "позиция";
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return "позиции";
  return "позиций";
}

export function CheckoutForm({
  cities,
  pickupPoints,
  user,
  subtotal,
  weight,
  discount,
  promoCode,
  count,
  defaultCityId,
  prefill,
  installPrice,
}: {
  cities: CheckoutCity[];
  pickupPoints: CheckoutPickupPoint[];
  user: { name: string; phone: string | null; email: string } | null;
  subtotal: number;
  weight: number;
  discount: number;
  promoCode: string | null;
  count: number;
  defaultCityId: string;
  prefill: { name: string; phone: string; email: string; address: string; carInfo: string; cityId: string };
  installPrice: number;
}) {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(createOrderAction, {}, pathname);

  const [deliveryType, setDeliveryType] = useState<string>("cdek_pvz");
  const [cityId, setCityId] = useState<string>(prefill.cityId || defaultCityId);
  const [paymentType, setPaymentType] = useState<string>("card_online");
  const [installRequested, setInstallRequested] = useState(false);
  const [pickupPointCode, setPickupPointCode] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState(prefill.address);
  const [phone, setPhone] = useState(prefill.phone);
  const [quote, setQuote] = useState<DeliveryQuoteState | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const city = useMemo(() => cities.find((item) => item.id === cityId) ?? null, [cities, cityId]);
  const provider = PROVIDER_BY_TYPE[deliveryType] ?? "cdek";
  const needsPickupPoint =
    deliveryType === "cdek_pvz" || deliveryType === "boxberry_pvz" || deliveryType === "post";
  const needsAddress = deliveryType === "cdek_courier" || deliveryType === "courier_local";
  const isInvoice = paymentType === "invoice";

  const points = useMemo(
    () =>
      pickupPoints
        .filter((point) => point.cityId === cityId && point.provider === provider)
        .sort((a, b) => a.address.localeCompare(b.address, "ru")),
    [pickupPoints, cityId, provider],
  );

  const selectedPoint = points.find((point) => point.code === pickupPointCode) ?? null;

  // Запоминаем выбранные способ доставки/город/оплату между визитами.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { deliveryType?: string; cityId?: string; paymentType?: string };
      if (saved.deliveryType && saved.deliveryType in DELIVERY_TYPES) setDeliveryType(saved.deliveryType);
      if (saved.cityId && cities.some((item) => item.id === saved.cityId)) setCityId(saved.cityId);
      if (saved.paymentType && saved.paymentType in PAYMENT_TYPES) setPaymentType(saved.paymentType);
    } catch {
      // localStorage может быть недоступен — не критично
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify({ deliveryType, cityId, paymentType }));
    } catch {
      // игнорируем
    }
  }, [deliveryType, cityId, paymentType]);

  // Сбрасываем пункт выдачи, если он больше не подходит городу/перевозчику.
  useEffect(() => {
    if (!pickupPointCode) return;
    if (!points.some((point) => point.code === pickupPointCode)) setPickupPointCode("");
  }, [points, pickupPointCode]);

  const calculate = useCallback(
    async (signal: AbortSignal) => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const response = await fetch("/api/delivery/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cityId,
            deliveryType,
            weightGrams: weight,
            subtotal,
            pickupPointCode: pickupPointCode || null,
          }),
          signal,
        });
        if (!response.ok) throw new Error("calculate failed");
        setQuote((await response.json()) as DeliveryQuoteState);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setQuoteError("Не удалось рассчитать доставку — стоимость уточнит менеджер");
      } finally {
        setQuoteLoading(false);
      }
    },
    [cityId, deliveryType, weight, subtotal, pickupPointCode],
  );

  // Живой расчёт: город, способ доставки, пункт выдачи.
  useEffect(() => {
    if (!cityId || !(deliveryType in DELIVERY_TYPES)) return;
    if (needsPickupPoint && !pickupPointCode) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    void calculate(controller.signal);
    return () => controller.abort();
  }, [cityId, deliveryType, pickupPointCode, needsPickupPoint, calculate]);

  const deliveryPrice = needsPickupPoint && !pickupPointCode ? null : quote?.price ?? 0;
  const total = Math.max(0, subtotal - discount) + (deliveryPrice ?? 0) + (installRequested ? installPrice : 0);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <input type="hidden" name="promoCode" value={promoCode ?? ""} />
      <input type="hidden" name="pickupPointAddress" value={selectedPoint?.address ?? ""} />

      <div className="space-y-6">
        {state?.error && (
          <Alert variant="danger" title="Не удалось оформить заказ">
            {state.error}
          </Alert>
        )}

        {/* 1. Контактные данные */}
        <Card className="px-5 py-5">
          <h2 className="text-base font-semibold text-ink-900">1. Контактные данные</h2>
          <p className="mt-1 text-sm text-ink-500">Менеджер свяжется с вами для подтверждения заказа.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="ФИО" required htmlFor="customerName">
              <Input
                id="customerName"
                name="customerName"
                defaultValue={prefill.name}
                placeholder="Иванов Иван Иванович"
                autoComplete="name"
                required
                minLength={3}
              />
            </Field>

            <Field label="Телефон" required htmlFor="customerPhone">
              <Input
                id="customerPhone"
                name="customerPhone"
                value={phone}
                onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                placeholder="+7 (___) ___-__-__"
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </Field>

            <Field
              label="E-mail"
              htmlFor="customerEmail"
              hint="Пришлём номер заказа и документы"
              className="sm:col-span-2 sm:max-w-md"
            >
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                defaultValue={prefill.email}
                placeholder="mail@example.ru"
                autoComplete="email"
              />
            </Field>
          </div>

          {!user && (
            <p className="mt-3 text-xs text-ink-400">
              Заказ оформляется как гость.{" "}
              <Link href="/account/login" className="font-semibold text-brand-700 hover:text-brand-800">
                Войдите
              </Link>
              , чтобы видеть историю заказов и «Гараж».
            </p>
          )}
        </Card>

        {/* 2. Доставка */}
        <Card className="px-5 py-5">
          <h2 className="text-base font-semibold text-ink-900">2. Доставка</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Город" required htmlFor="cityId">
              <Select
                id="cityId"
                name="cityId"
                value={cityId}
                onChange={(event) => setCityId(event.target.value)}
                required
              >
                {cities.length === 0 && <option value="">Города не настроены</option>}
                {cities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.deliveryDays > 0 ? ` — ${item.deliveryDays} дн.` : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Способ получения" required htmlFor="deliveryType">
              <Select
                id="deliveryType"
                name="deliveryType"
                value={deliveryType}
                onChange={(event) => setDeliveryType(event.target.value)}
                required
              >
                {(Object.keys(DELIVERY_TYPES) as (keyof typeof DELIVERY_TYPES)[]).map((type) => {
                  const unavailable =
                    city &&
                    ((type === "pickup" && !city.pickupAvailable) ||
                      (type !== "pickup" && !city.deliveryAvailable));
                  return (
                    <option key={type} value={type} disabled={Boolean(unavailable)}>
                      {DELIVERY_TYPES[type]}
                      {unavailable ? " — недоступно" : ""}
                    </option>
                  );
                })}
              </Select>
            </Field>
          </div>

          {needsPickupPoint && (
            <div className="mt-4">
              <Field
                label="Пункт выдачи"
                required
                htmlFor="pickupPointCode"
                hint={
                  points.length === 0
                    ? "Для этого города пункты выдачи не заполнены — доставку согласует менеджер"
                    : "Выберите удобный адрес"
                }
              >
                <Select
                  id="pickupPointCode"
                  name="pickupPointCode"
                  value={pickupPointCode}
                  onChange={(event) => setPickupPointCode(event.target.value)}
                  disabled={points.length === 0}
                  required={points.length > 0}
                >
                  <option value="">— выберите пункт выдачи —</option>
                  {points.map((point) => (
                    <option key={point.id} value={point.code}>
                      {point.address}
                      {point.workTime ? ` (${point.workTime})` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          {needsAddress && (
            <div className="mt-4">
              <Field
                label={deliveryType === "courier_local" ? "Адрес доставки курьером" : "Адрес доставки СДЭК"}
                required
                htmlFor="deliveryAddress"
                hint="Улица, дом, корпус, квартира"
              >
                <Input
                  id="deliveryAddress"
                  name="deliveryAddress"
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  placeholder="ул. Автомобильная, 19, кв. 1"
                  autoComplete="street-address"
                />
              </Field>
            </div>
          )}

          {deliveryType === "pickup" && city && (
            <Alert variant="info" className="mt-4" title="Самовывоз со склада">
              {city.address ?? "Адрес склада уточнит менеджер"}
              {city.workTime ? ` · ${city.workTime}` : ""}
            </Alert>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Комментарий к доставке" htmlFor="deliveryComment" hint="Домофон, удобное время">
              <Input id="deliveryComment" name="deliveryComment" placeholder="Например: звонить за час" />
            </Field>
            <Field label="Автомобиль" htmlFor="carInfo" hint="Поможет проверить совместимость">
              <Input id="carInfo" name="carInfo" defaultValue={prefill.carInfo} placeholder="Toyota Camry XV70, 2019" />
            </Field>
          </div>

          {quoteError && (
            <Alert variant="warning" className="mt-4">
              {quoteError}
            </Alert>
          )}
        </Card>

        {/* 3. Оплата */}
        <Card className="px-5 py-5">
          <h2 className="text-base font-semibold text-ink-900">3. Оплата</h2>

          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">Способ оплаты</legend>
            {(Object.keys(PAYMENT_TYPES) as (keyof typeof PAYMENT_TYPES)[]).map((type) => (
              <label
                key={type}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 px-4 py-3 transition hover:border-brand-300"
              >
                <input
                  type="radio"
                  name="paymentType"
                  value={type}
                  checked={paymentType === type}
                  onChange={() => setPaymentType(type)}
                  className="mt-0.5 size-4 border-ink-300 text-brand-600 focus:ring-brand-400"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{PAYMENT_TYPES[type]}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    {type === "cash" && "Оплата наличными курьеру или в пункте выдачи"}
                    {type === "card_on_delivery" && "Терминал у курьера или в пункте выдачи"}
                    {type === "card_online" && "Ссылка на оплату придёт после подтверждения заказа"}
                    {type === "invoice" && "Счёт на организацию — по реквизитам ниже"}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {isInvoice && (
            <div className="mt-4 grid gap-3 rounded-xl bg-ink-50 p-4 sm:grid-cols-2">
              <Field label="Название организации" required htmlFor="companyName">
                <Input id="companyName" name="companyName" placeholder="ООО «Ромашка»" />
              </Field>
              <Field label="ИНН" required htmlFor="companyInn">
                <Input id="companyInn" name="companyInn" inputMode="numeric" placeholder="7701234567" />
              </Field>
              <Field label="КПП" htmlFor="companyKpp">
                <Input id="companyKpp" name="companyKpp" inputMode="numeric" placeholder="770101001" />
              </Field>
              <Field label="Юридический адрес" htmlFor="companyAddress">
                <Input id="companyAddress" name="companyAddress" placeholder="г. Москва, ул. ..." />
              </Field>
            </div>
          )}
        </Card>

        {/* 4. Установка и пожелания */}
        <Card className="px-5 py-5">
          <h2 className="text-base font-semibold text-ink-900">4. Установка и пожелания</h2>

          <div className="mt-4 rounded-xl border border-ink-200 px-4 py-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="installRequested"
                checked={installRequested}
                onChange={(event) => setInstallRequested(event.target.checked)}
                className="mt-0.5 size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
              />
              <span>
                <span className="block text-sm font-semibold text-ink-900">
                  Нужна установка в сервисе — {formatPrice(installPrice)}
                </span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  Монтаж багажника, автобокса или фаркопа, подключение электрики. Дату согласует менеджер.
                </span>
              </span>
            </label>

            {installRequested && (
              <div className="mt-3">
                <Field
                  label="Адрес сервиса / пожелания"
                  required
                  htmlFor="installAddress"
                  hint="Можно указать «уточню при звонке менеджера»"
                >
                  <Input id="installAddress" name="installAddress" placeholder="Москва, ул. Автомобильная, 19" />
                </Field>
              </div>
            )}
          </div>

          <div className="mt-4">
            <Field label="Комментарий к заказу" htmlFor="comment" hint="До 1000 символов">
              <Textarea id="comment" name="comment" placeholder="Например: нужен крепёж под рейлинги" maxLength={1000} />
            </Field>
          </div>
        </Card>

        <Card className="px-5 py-5">
          <Checkbox
            name="agreement"
            required
            label={
              <span className="text-sm text-ink-600">
                Согласен с{" "}
                <Link href="/page/oferta" className="underline">
                  офертой
                </Link>{" "}
                и обработкой персональных данных
              </span>
            }
          />
        </Card>
      </div>

      {/* Итоги */}
      <div>
        <Card className="overflow-hidden lg:sticky lg:top-24">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-semibold text-ink-900">Ваш заказ</h2>
            <p className="mt-1 text-sm text-ink-500">
              {count} {positionsWord(count)} · {formatWeight(weight)}
            </p>
          </div>

          <dl className="space-y-3 px-5 py-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-500">Товары</dt>
              <dd className="font-semibold text-ink-900">{formatPrice(subtotal)}</dd>
            </div>

            {discount > 0 && (
              <div className="flex items-center justify-between">
                <dt className="text-success-600">Промокод {promoCode}</dt>
                <dd className="font-semibold text-success-600">−{formatPrice(discount)}</dd>
              </div>
            )}

            <div className="flex items-start justify-between gap-3">
              <dt className="text-ink-500">
                Доставка
                {quote && (
                  <span className="block text-xs text-ink-400">
                    {quote.tariffName}
                    {quote.daysMax > 0 ? ` · ${quote.daysMin}–${quote.daysMax} дн.` : ""}
                  </span>
                )}
              </dt>
              <dd className="text-right font-semibold text-ink-900">
                {quoteLoading ? (
                  <span className="text-xs text-ink-400">считаем…</span>
                ) : deliveryPrice === null ? (
                  <span className="text-xs text-ink-400">выберите ПВЗ</span>
                ) : deliveryPrice === 0 ? (
                  <span className="text-success-600">бесплатно</span>
                ) : (
                  formatPrice(deliveryPrice)
                )}
              </dd>
            </div>

            {installRequested && (
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Установка в сервисе</dt>
                <dd className="font-semibold text-ink-900">{formatPrice(installPrice)}</dd>
              </div>
            )}

            <div className="flex items-baseline justify-between border-t border-dashed border-ink-200 pt-3">
              <dt className="font-semibold text-ink-700">Итого</dt>
              <dd className="text-2xl font-bold text-ink-900">{formatPrice(total)}</dd>
            </div>
          </dl>

          <div className="space-y-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4">
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Оформляем заказ…" : "Подтвердить заказ"}
            </Button>
            <p className="text-xs text-ink-400">
              Нажимая кнопку, вы соглашаетесь с условиями оферты. Цены и наличие проверяются сервером при
              оформлении.
            </p>
            <ButtonLink href="/cart" variant="ghost" size="sm" className="w-full">
              Вернуться в корзину
            </ButtonLink>
          </div>
        </Card>

        {selectedPoint && (
          <p className="mt-3 px-1 text-xs text-ink-400">
            Пункт выдачи: {selectedPoint.address}
            {selectedPoint.workTime ? ` · ${selectedPoint.workTime}` : ""}
          </p>
        )}
      </div>
    </form>
  );
}
