"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { applyPromoAction, removePromoAction } from "@/lib/actions/order";
import { Button, Input } from "@/components/ui";

/**
 * Промокод: применение — Server Action, проверка кода только на сервере.
 * Скидка применяется повторно при создании заказа, значение из формы не используется.
 * `permalink` делает форму работоспособной и при отключённом JavaScript.
 */
export function PromoForm({
  applied,
  hint,
}: {
  applied?: { code: string; percent: number } | null;
  hint?: string | null;
}) {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(
    applyPromoAction,
    {} as { error?: string; success?: string },
    pathname,
  );

  if (applied) {
    return (
      <div className="rounded-xl border border-success-500/30 bg-success-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-success-600">
            Промокод {applied.code}: скидка {applied.percent}%
          </p>
          <form action={removePromoAction}>
            <Button type="submit" variant="ghost" size="xs" className="text-ink-500">
              Убрать
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="promoCode">
          Промокод
        </label>
        <Input
          id="promoCode"
          name="promoCode"
          placeholder="Промокод"
          autoComplete="off"
          className="h-11 uppercase"
        />
        <Button type="submit" variant="outline" size="md" disabled={pending} className="shrink-0">
          {pending ? "Проверяем…" : "Применить"}
        </Button>
      </div>
      {state?.error && <p className="text-xs font-medium text-danger-600">{state.error}</p>}
      {state?.success && <p className="text-xs font-medium text-success-600">{state.success}</p>}
      {!state?.error && !state?.success && hint && <p className="text-xs text-ink-400">{hint}</p>}
    </form>
  );
}
