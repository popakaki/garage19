"use client";

import { createContext, useActionState, useContext, type ReactNode } from "react";
import { Alert } from "@/components/ui";
import type { ActionState } from "@/lib/admin/actions";

/**
 * Обвязка форм с useActionState: серверное действие возвращает `{ error }`,
 * форма показывает общее сообщение и подсвечивает проблемные поля.
 * Обычные (не клиентские) формы отправляются напрямую в Server Action.
 */

type ActionFn = (state: ActionState, formData: FormData) => Promise<ActionState>;

type FormStateContextValue = {
  state: ActionState;
  pending: boolean;
  fieldError: (name: string) => string | undefined;
};

const FormStateContext = createContext<FormStateContextValue>({
  state: null,
  pending: false,
  fieldError: () => undefined,
});

export function useFormStateContext(): FormStateContextValue {
  return useContext(FormStateContext);
}

export function AdminActionForm({
  action,
  children,
  className,
  successMessage,
  id,
  encType,
}: {
  action: ActionFn;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  id?: string;
  encType?: "multipart/form-data";
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok === true;

  return (
    <FormStateContext.Provider value={{ state, pending, fieldError: () => undefined }}>
      <form id={id} action={formAction} className={className} encType={encType}>
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        {ok && successMessage && (
          <Alert variant="success" className="mb-4">
            {successMessage}
          </Alert>
        )}
        {children}
      </form>
    </FormStateContext.Provider>
  );
}

/** Кнопка отправки с индикацией ожидания (используется внутри AdminActionForm). */
export function PendingButton({
  children,
  className,
  variant = "primary",
  name,
  value,
}: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "danger" | "success";
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStateContext();
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-ink-900 text-white hover:bg-ink-800",
    outline: "border border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
    danger: "bg-red-600 text-white hover:bg-red-500",
    success: "bg-emerald-600 text-white hover:bg-emerald-500",
  } as const;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className ?? ""}`}
    >
      {pending ? "Сохраняем…" : children}
    </button>
  );
}
