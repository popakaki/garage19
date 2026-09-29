"use client";

import { useState, useTransition } from "react";
import { updateCartQtyAction, removeFromCartAction } from "@/lib/actions/cart";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Управление количеством в строке корзины.
 *
 * Без JavaScript работают обе кнопки: у каждой своё значение `qty`,
 * последняя нажатая кнопка побеждает (submit-кнопки переопределяют поле `qty`).
 * С JavaScript количество меняется мгновенно, без перезагрузки страницы.
 */
export function QtyControl({
  productId,
  qty,
  max = 99,
  stock,
  className,
}: {
  productId: string;
  qty: number;
  max?: number;
  stock?: number;
  className?: string;
}) {
  const [value, setValue] = useState(qty);
  const [pending, startTransition] = useTransition();
  const limit = Math.max(1, Math.min(max, stock && stock > 0 ? stock : max));

  const submit = (next: number) => {
    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("qty", String(next));
    startTransition(async () => {
      await updateCartQtyAction(formData);
    });
  };

  const step = (delta: number) => {
    const next = Math.min(limit, Math.max(1, value + delta));
    setValue(next);
    submit(next);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <form action={updateCartQtyAction} className="inline-flex items-center rounded-xl border border-ink-200 bg-white">
        <input type="hidden" name="productId" value={productId} />

        <button
          type="submit"
          name="qty"
          value={Math.max(1, value - 1)}
          aria-label="Уменьшить количество"
          disabled={value <= 1}
          className="flex size-10 items-center justify-center rounded-l-xl text-lg font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
        >
          −
        </button>

        <label className="sr-only" htmlFor={`qty-${productId}`}>
          Количество
        </label>
        <Input
          id={`qty-${productId}`}
          name="qty"
          type="number"
          inputMode="numeric"
          min={1}
          max={limit}
          value={value}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            setValue(Number.isFinite(parsed) ? Math.min(limit, Math.max(1, parsed)) : 1);
          }}
          onBlur={() => {
            if (value !== qty) submit(value);
          }}
          className="h-10 w-14 rounded-none border-x-0 border-y-0 text-center font-semibold focus:ring-0"
        />

        <button
          type="submit"
          name="qty"
          value={Math.min(limit, value + 1)}
          aria-label="Увеличить количество"
          disabled={value >= limit}
          className="flex size-10 items-center justify-center rounded-r-xl text-lg font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
        >
          +
        </button>
      </form>

      {pending && <span className="text-xs text-ink-400">Обновляем…</span>}
      {stock !== undefined && stock > 0 && value >= stock && (
        <span className="text-xs font-medium text-warning-500">Больше {stock} шт. нет на складе</span>
      )}
    </div>
  );
}

/** Кнопка удаления позиции — обычная форма, работает без JS. */
export function RemoveLineButton({ productId }: { productId: string }) {
  return (
    <form action={removeFromCartAction}>
      <input type="hidden" name="productId" value={productId} />
      <Button type="submit" variant="ghost" size="xs" className="text-ink-500 hover:text-danger-600">
        Удалить
      </Button>
    </form>
  );
}
