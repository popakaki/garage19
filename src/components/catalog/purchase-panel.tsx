"use client";

import { useState } from "react";
import { Minus, Plus, X, Zap } from "lucide-react";
import { AddToCartButton } from "@/components/catalog/add-to-cart-button";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { quickOrderAction } from "@/lib/actions/catalog";
import { cn } from "@/lib/utils";

/**
 * Колонка покупки в карточке товара: количество, «В корзину» (Server Action),
 * «Купить в 1 клик» (модалка с Server Action quickOrderAction).
 */
export function PurchasePanel({
  productId,
  productName,
  priceLabel,
  stock,
  maxQty = 99,
}: {
  productId: string;
  productName: string;
  priceLabel: string;
  stock: number;
  maxQty?: number;
}) {
  const limit = Math.max(1, Math.min(maxQty, stock > 0 ? stock : maxQty));
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-xl border border-ink-200 bg-white">
          <button
            type="button"
            onClick={() => setQty((value) => Math.max(1, value - 1))}
            aria-label="Уменьшить количество"
            className="px-3 py-2.5 text-ink-600 hover:text-brand-700 disabled:opacity-40"
            disabled={qty <= 1}
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <input
            type="number"
            name="qty"
            min={1}
            max={limit}
            value={qty}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              setQty(Number.isFinite(next) ? Math.min(Math.max(1, next), limit) : 1);
            }}
            aria-label="Количество"
            className="w-14 border-x border-ink-200 py-2 text-center text-sm font-semibold text-ink-900 outline-none"
          />
          <button
            type="button"
            onClick={() => setQty((value) => Math.min(limit, value + 1))}
            aria-label="Увеличить количество"
            className="px-3 py-2.5 text-ink-600 hover:text-brand-700 disabled:opacity-40"
            disabled={qty >= limit}
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <span className="text-xs text-ink-400">
          {stock > 0 ? `Доступно: ${stock} шт.` : "Доступно под заказ"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <AddToCartButton productId={productId} qty={qty} stock={stock} size="lg" redirectTo="/cart" />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => setOpen(true)}
          className="w-full"
        >
          <Zap className="size-4" aria-hidden />
          Купить в 1 клик
        </Button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Быстрый заказ в один клик"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-ink-950/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-pop">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-ink-900">Быстрый заказ</h3>
                <p className="mt-1 text-sm text-ink-500">
                  {productName} — {priceLabel}, {qty} шт.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть окно быстрого заказа"
                className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <form action={quickOrderAction} className="mt-4 grid gap-3">
              <input type="hidden" name="productId" value={productId} />
              <input type="hidden" name="qty" value={qty} />
              <Field label="Имя" required htmlFor="quick-order-name">
                <Input id="quick-order-name" name="name" required minLength={2} placeholder="Ваше имя" />
              </Field>
              <Field label="Телефон" required hint="Перезвоним в рабочее время" htmlFor="quick-order-phone">
                <Input
                  id="quick-order-phone"
                  name="phone"
                  required
                  inputMode="tel"
                  placeholder="+7 (999) 123-45-67"
                />
              </Field>
              <Field label="Комментарий" htmlFor="quick-order-comment">
                <Textarea
                  id="quick-order-comment"
                  name="comment"
                  className="min-h-16"
                  placeholder="Город, нужна ли установка"
                />
              </Field>
              <Button type="submit" size="lg" className={cn("w-full")} onClick={() => setOpen(false)}>
                Отправить заказ
              </Button>
              <p className="text-xs text-ink-400">
                Менеджер подтвердит наличие и способ получения. Оплата — после подтверждения.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
