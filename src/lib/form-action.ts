/**
 * Совместимость Server Actions с типом `action` у `<form>`.
 *
 * Server Actions, возвращающие результат (`{ error }`, `{ success }`) и показывающие
 * его через `useActionState`, нельзя передать в `form action` напрямую:
 * типы React ожидают `void | Promise<void>`.
 *
 * `voidAction` сохраняет поведение действия (включая `redirect`/`notFound`,
 * которые бросают управляющие исключения) и приводит тип к `void`
 * без `any` и `@ts-ignore`.
 */

type FormAction = (formData: FormData) => Promise<void>;

/** Ошибка управления потоком Next.js (`redirect`, `notFound`) — её нельзя проглатывать. */
function isControlFlowError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND");
}

export function voidAction<TResult>(action: (formData: FormData) => Promise<TResult>): FormAction {
  return ((formData: FormData) =>
    action(formData).then(
      () => undefined,
      (error: unknown) => {
        if (isControlFlowError(error)) throw error;
        console.error("[form] server action failed", error);
      },
    )) as FormAction;
}
