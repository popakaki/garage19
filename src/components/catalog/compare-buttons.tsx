"use client";

import { Scale, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductStore } from "@/components/catalog/wishlist-store";

/**
 * Кнопки «Сравнить» и «В избранное».
 * Работают на localStorage, поэтому их можно ставить и в карточке листинга,
 * и в карточке товара, и в таблице сравнения.
 */

function iconButtonClass(active: boolean, className?: string): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "border-brand-500 bg-brand-50 text-brand-700"
      : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700",
    className,
  );
}

export function CompareToggle({
  productId,
  productName,
  className,
  withLabel = true,
}: {
  productId: string;
  productName?: string;
  className?: string;
  withLabel?: boolean;
}) {
  const compare = useProductStore("compare", 4);
  const active = compare.has(productId);

  return (
    <button
      type="button"
      onClick={() => compare.toggle(productId)}
      aria-pressed={active}
      aria-label={active ? `Убрать «${productName ?? "товар"}» из сравнения` : `Сравнить «${productName ?? "товар"}»`}
      title={active ? "Убрать из сравнения" : "Добавить к сравнению"}
      className={iconButtonClass(active, className)}
    >
      <Scale className="size-4" aria-hidden />
      {withLabel && <span>{active ? "В сравнении" : "Сравнить"}</span>}
    </button>
  );
}

export function WishlistToggle({
  productId,
  productName,
  className,
  withLabel = true,
}: {
  productId: string;
  productName?: string;
  className?: string;
  withLabel?: boolean;
}) {
  const wishlist = useProductStore("wishlist");
  const active = wishlist.has(productId);

  return (
    <button
      type="button"
      onClick={() => wishlist.toggle(productId)}
      aria-pressed={active}
      aria-label={
        active ? `Убрать «${productName ?? "товар"}» из избранного` : `Добавить «${productName ?? "товар"}» в избранное`
      }
      title={active ? "В избранном" : "В избранное"}
      className={iconButtonClass(active, className)}
    >
      <Star className={cn("size-4", active && "fill-brand-500 text-brand-500")} aria-hidden />
      {withLabel && <span>{active ? "В избранном" : "В избранное"}</span>}
    </button>
  );
}

/** Компактная иконка-сердечко/звёздочка для плитки каталога. */
export function WishlistIconButton({ productId, productName }: { productId: string; productName?: string }) {
  const wishlist = useProductStore("wishlist");
  const active = wishlist.has(productId);

  return (
    <button
      type="button"
      onClick={() => wishlist.toggle(productId)}
      aria-pressed={active}
      aria-label={
        active ? `Убрать «${productName ?? "товар"}» из избранного` : `Добавить «${productName ?? "товар"}» в избранное`
      }
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full border bg-white/95 shadow-sm backdrop-blur transition-colors",
        active ? "border-brand-400 text-brand-600" : "border-ink-200 text-ink-400 hover:text-brand-600",
      )}
    >
      <Star className={cn("size-4", active && "fill-brand-500 text-brand-500")} aria-hidden />
    </button>
  );
}

/** Счётчик сравнения для шапки/кнопок. */
export function CompareCount() {
  const compare = useProductStore("compare", 4);
  if (!compare.ready || compare.count === 0) return null;
  return <span className="text-xs font-semibold text-brand-700">({compare.count})</span>;
}
