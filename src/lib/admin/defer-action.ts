import { redirect } from "next/navigation";

/**
 * Совместимость Server Actions с атрибутом `<form action>`.
 *
 * Экшены админки возвращают `{ ok } | { error }` — это разрешено в рантайме
 * Next.js (результат игнорируется при отправке формы), но типы форм React
 * требуют `Promise<void>`. Чтобы не терять типизацию, экшены передаются
 * в формы через этот помощник: результат отбрасывается, при исключении
 * показывается страница ошибки приложения.
 */
export function deferAction<T>(action: (formData: FormData) => Promise<T>): (formData: FormData) => Promise<void> {
  return async (formData: FormData): Promise<void> => {
    try {
      await action(formData);
    } catch (error) {
      // redirect() из Server Action тоже приходит как исключение — его нельзя глотать.
      if (isRedirectError(error)) throw error;
      redirect("/admin?toast=error.failed&toastType=danger");
    }
  };
}

function isRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
