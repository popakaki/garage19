"use client";

import { useTransition } from "react";
import { repeatOrderAction } from "@/lib/actions/order";
import { Button } from "@/components/ui";

/**
 * «Повторить заказ»: товары из заказа добавляются в корзину Server Action.
 * Работает и без JavaScript (обычная форма), с JS — с индикацией загрузки.
 */
export function RepeatOrderButton({
  orderId,
  variant = "outline",
  size = "md",
  className,
}: {
  orderId: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "link";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={repeatOrderAction}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          await repeatOrderAction(formData);
        });
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" variant={variant} size={size} className={className} disabled={pending}>
        {pending ? "Добавляем…" : "Повторить заказ"}
      </Button>
    </form>
  );
}
