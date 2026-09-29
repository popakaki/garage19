"use server";

import { createCallbackAction } from "@/lib/actions/callback";

/**
 * Обёртка для форм на публичных страницах (шапка, карточка товара, главная).
 * Форма обязана получать экшен возвращающий void, поэтому результат
 * внутреннего экшена не пробрасывается наружу — ошибки уходят в лог сервера.
 */
export async function submitCallbackForm(formData: FormData): Promise<void> {
  try {
    const result = (await createCallbackAction(formData)) as { error?: string } | void;
    if (result && typeof result === "object" && "error" in result && result.error) {
      console.error("[callback] форма заявки вернула ошибку:", result.error);
    }
  } catch (error) {
    console.error("[callback] не удалось сохранить заявку", error);
  }
}
