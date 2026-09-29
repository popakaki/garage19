"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { addToCartAction } from "@/lib/actions/cart";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
} as const;

function SubmitInner({
  size,
  label,
  disabled,
  added,
}: {
  size: keyof typeof SIZES;
  label: string;
  disabled: boolean;
  added: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      title={disabled ? "Товара нет на складе — оформите заявку" : label}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
        disabled
          ? "cursor-not-allowed bg-ink-200 text-ink-500"
          : added
            ? "bg-success-600 text-white"
            : "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
        SIZES[size],
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : added ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <ShoppingCart className="size-4" aria-hidden />
      )}
      <span>{disabled ? "Под заказ" : added ? "Добавлено" : label}</span>
    </button>
  );
}

/**
 * Кнопка «В корзину» на Server Action: работает даже без JavaScript
 * (обычная отправка формы), а с JS показывает состояние отправки и подтверждение.
 */
export function AddToCartButton({
  productId,
  qty = 1,
  redirectTo,
  stock,
  size = "md",
  className,
  label = "В корзину",
}: {
  productId: string;
  qty?: number;
  redirectTo?: string;
  stock?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}) {
  const [added, setAdded] = useState(false);
  const disabled = stock !== undefined && stock <= 0;

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 2500);
    return () => window.clearTimeout(timer);
  }, [added]);

  return (
    <form
      action={addToCartAction}
      className={cn("relative", className)}
      onSubmit={() => {
        window.setTimeout(() => {
          setAdded(true);
        }, 400);
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="qty" value={qty} />
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <SubmitInner size={size} label={label} disabled={disabled} added={added} />
      <span aria-live="polite" className="sr-only">
        {added ? "Товар добавлен в корзину" : ""}
      </span>
    </form>
  );
}
