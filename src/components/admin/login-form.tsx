"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { Alert } from "@/components/ui";
import { loginAdminAction } from "@/lib/actions/admin/auth";
import type { ActionState } from "@/lib/admin/actions";

/** Форма входа: работает и без JavaScript (обычный POST в Server Action). */
export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(loginAdminAction, null);
  const error = state && "error" in state ? state.error : undefined;

  return (
    <form action={formAction} className="space-y-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <div>
        <label className="g19-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="admin@garage19.ru"
          className="g19-input"
        />
      </div>

      <div>
        <label className="g19-label" htmlFor="password">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="g19-input"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogIn className="size-4" aria-hidden />
        {pending ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
