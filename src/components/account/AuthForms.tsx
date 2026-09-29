"use client";

import Link from "next/link";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import {
  loginAction,
  registerAction,
  requestPasswordResetAction,
} from "@/lib/actions/account";
import { Alert, Button, Checkbox, Field, Input } from "@/components/ui";
import { formatPhoneInput } from "@/lib/utils";

/**
 * Формы авторизации личного кабинета.
 * Server Actions принимают `(prevState, formData)` — ошибки показываются без
 * перезагрузки страницы; без JavaScript формы всё равно отправляются.
 */

export function LoginForm({ next }: { next?: string }) {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(loginAction, {}, pathname);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert variant="danger">{state.error}</Alert>}

      <Field label="E-mail" required htmlFor="login-email">
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="mail@example.ru"
          required
        />
      </Field>

      <Field label="Пароль" required htmlFor="login-password">
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••"
          required
        />
      </Field>

      {next && <input type="hidden" name="next" value={next} />}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Входим…" : "Войти"}
      </Button>

      <p className="text-xs text-ink-400">
        Забыли пароль? Переключитесь на вкладку{" "}
        <span className="font-semibold text-ink-600">«Забыли пароль?»</span> — сформируем ссылку для сброса.
      </p>
    </form>
  );
}

export function RegisterForm() {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(registerAction, {}, pathname);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert variant="danger">{state.error}</Alert>}

      <Field label="Имя и фамилия" required htmlFor="register-name">
        <Input id="register-name" name="name" autoComplete="name" placeholder="Иван Иванов" required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail" required htmlFor="register-email">
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="mail@example.ru"
            required
          />
        </Field>

        <Field label="Телефон" htmlFor="register-phone" hint="Нужен для связи по заказу">
          <Input
            id="register-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 (___) ___-__-__"
            onChange={(event) => {
              event.currentTarget.value = formatPhoneInput(event.currentTarget.value);
            }}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Пароль" required htmlFor="register-password" hint="Минимум 6 символов">
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </Field>

        <Field label="Повторите пароль" required htmlFor="register-password-repeat">
          <Input
            id="register-password-repeat"
            name="passwordRepeat"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </Field>
      </div>

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

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Создаём аккаунт…" : "Зарегистрироваться"}
      </Button>

      <p className="text-xs text-ink-400">
        После регистрации товары из корзины сохранятся в вашем аккаунте — корзина переносится автоматически.
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, {}, pathname);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert variant="danger">{state.error}</Alert>}

      {state?.success && (
        <Alert variant="success" title="Ссылка создана">
          <p>{state.success}</p>
          {state.resetUrl && (
            <p className="mt-2 break-all rounded-lg bg-white/70 px-3 py-2 font-mono text-xs text-ink-700">
              <Link href={state.resetUrl} className="underline">
                {state.resetUrl}
              </Link>
            </p>
          )}
        </Alert>
      )}

      <Field label="E-mail аккаунта" required htmlFor="reset-email" hint="Почта пока не подключена — ссылку покажем здесь">
        <Input id="reset-email" name="email" type="email" autoComplete="email" placeholder="mail@example.ru" required />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Формируем ссылку…" : "Восстановить пароль"}
      </Button>
    </form>
  );
}
