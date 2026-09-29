"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/actions/account";
import { Alert, Button, Field, Input } from "@/components/ui";

/** Новый пароль по ссылке сброса (токен приходит в скрытом поле). */
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, {});

  if (state?.success) {
    return (
      <Alert variant="success" title="Пароль изменён">
        {state.success}
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert variant="danger">{state.error}</Alert>}

      <input type="hidden" name="token" value={token} />

      <Field label="Новый пароль" required htmlFor="new-password" hint="Минимум 6 символов">
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </Field>

      <Field label="Повторите пароль" required htmlFor="new-password-repeat">
        <Input
          id="new-password-repeat"
          name="passwordRepeat"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить новый пароль"}
      </Button>
    </form>
  );
}
