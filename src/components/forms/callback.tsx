"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, MessageCircleQuestion, PhoneCall, X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { CALLBACK_TYPES } from "@/lib/constants";
import { formatPhoneInput } from "@/lib/utils";
import { submitCallbackForm } from "@/lib/actions/contact";

type FormKind = keyof typeof CALLBACK_TYPES;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? "Отправляем…" : label}
    </Button>
  );
}

/**
 * Универсальная форма заявки: обратный звонок, вопрос, VIN-подбор, установка, опт.
 * Работает и как встроенный блок, и внутри модального окна.
 */
export function CallbackForm({
  kind = "callback",
  productId,
  compact,
  onSent,
  title,
  description,
}: {
  kind?: FormKind;
  productId?: string;
  compact?: boolean;
  onSent?: () => void;
  title?: string;
  description?: string;
}) {
  const [phone, setPhone] = useState("+7");
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => {
      onSent?.();
      setSent(false);
      formRef.current?.reset();
      setPhone("+7");
    }, 2200);
    return () => clearTimeout(timer);
  }, [sent, onSent]);

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="size-12 text-success-500" />
        <p className="text-lg font-semibold text-ink-900">Заявка отправлена</p>
        <p className="max-w-xs text-sm text-ink-500">
          Менеджер свяжется с вами в течение рабочего дня и поможет с подбором.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await submitCallbackForm(formData);
        setSent(true);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="type" value={kind} />
      {productId && <input type="hidden" name="productId" value={productId} />}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      {title && <p className="text-base font-semibold text-ink-900">{title}</p>}
      {description && <p className="text-sm text-ink-500">{description}</p>}

      <Field label="Как к вам обращаться" required htmlFor="cb-name">
        <Input id="cb-name" name="name" required placeholder="Иван" autoComplete="name" />
      </Field>

      <Field label="Телефон" required htmlFor="cb-phone">
        <Input
          id="cb-phone"
          name="phone"
          required
          inputMode="tel"
          value={phone}
          onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
          placeholder="+7 (___) ___-__-__"
          autoComplete="tel"
        />
      </Field>

      {!compact && (
        <>
          <Field label="Email" htmlFor="cb-email" hint="Если удобнее получить ответ письмом">
            <Input id="cb-email" name="email" type="email" placeholder="mail@example.ru" autoComplete="email" />
          </Field>

          <Field label="Автомобиль" htmlFor="cb-car" hint="Марка, модель, год — поможет подобрать точно">
            <Input id="cb-car" name="carInfo" placeholder="Toyota Camry XV70, 2019" />
          </Field>
        </>
      )}

      {kind !== "callback" && (
        <Field label="Марка / модель автомобиля" htmlFor="cb-car-short">
          <Input id="cb-car-short" name="carInfo" placeholder="Kia Sportage QL, 2018" />
        </Field>
      )}

      <Field label={kind === "vin" ? "VIN автомобиля" : "Комментарий"} htmlFor="cb-message">
        <Textarea
          id="cb-message"
          name="message"
          rows={compact ? 2 : 3}
          placeholder={kind === "vin" ? "XW7BF4FK0L0123456" : "Что нужно подобрать?"}
        />
      </Field>

      <SubmitButton label={kind === "vin" ? "Подобрать по VIN" : "Отправить заявку"} />

      <p className="text-center text-xs text-ink-400">
        Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
      </p>
    </form>
  );
}

/** Кнопка «Заказать звонок» с модальным окном. */
export function CallbackButton({
  label = "Заказать звонок",
  kind = "callback",
  variant = "outline",
  size = "sm",
  className,
  title,
}: {
  label?: string;
  kind?: FormKind;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors ${
          size === "sm" ? "px-3 py-2 text-sm" : size === "lg" ? "px-6 py-3 text-base" : "px-4 py-2.5 text-sm"
        } ${
          variant === "primary"
            ? "bg-brand-600 text-white hover:bg-brand-700"
            : variant === "secondary"
              ? "bg-ink-900 text-white hover:bg-ink-800"
              : variant === "dark"
                ? "bg-ink-950 text-white hover:bg-ink-800"
                : variant === "ghost"
                  ? "text-ink-700 hover:bg-ink-100"
                  : "border border-ink-200 bg-white text-ink-800 hover:border-brand-300 hover:text-brand-700"
        } ${className ?? ""}`}
      >
        <PhoneCall className="size-4" />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-pop">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100"
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </button>
            <h3 className="pr-8 text-lg font-bold text-ink-900">{title ?? "Обратный звонок"}</h3>
            <p className="mt-1 text-sm text-ink-500">
              Перезвоним в течение 15 минут и поможем подобрать товар под ваш автомобиль.
            </p>
            <div className="mt-4">
              <CallbackForm kind={kind} compact onSent={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Плавающая кнопка обратного звонка. */
export function CallbackFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-pop transition-transform hover:scale-105 hover:bg-brand-700 no-print"
      >
        <MessageCircleQuestion className="size-5" />
        <span className="hidden sm:inline">Помочь с подбором</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-pop">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100"
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </button>
            <h3 className="pr-8 text-lg font-bold text-ink-900">Подбор по вашему автомобилю</h3>
            <p className="mt-1 text-sm text-ink-500">
              Не нашли свою модификацию? Опишите авто — подберём подходящий багажник, бокс или фаркоп.
            </p>
            <div className="mt-4">
              <CallbackForm kind="question" compact onSent={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Форма подбора по VIN — незанятая ниша рынка. */
export function VinRequestForm() {
  return (
    <div className="g19-card p-6">
      <h3 className="text-lg font-bold text-ink-900">Точный подбор по VIN</h3>
      <p className="mt-1 text-sm text-ink-500">
        Укажите VIN — менеджер определит точную модификацию и предложит модели, которые гарантированно подойдут.
      </p>
      <div className="mt-4">
        <CallbackForm kind="vin" />
      </div>
    </div>
  );
}
