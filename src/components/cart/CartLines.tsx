import Link from "next/link";
import type { ReactNode } from "react";
import { Price } from "@/components/ui";
import { formatPrice, formatWeight, plural, productImage } from "@/lib/utils";
import { QtyControl, RemoveLineButton } from "@/components/cart/QtyControl";
import { Badge } from "@/components/ui";

type CartLineLike = {
  qty: number;
  total: number;
  product: {
    id: string;
    slug: string;
    name: string;
    sku: string | null;
    price: number;
    oldPrice: number | null;
    stock: number;
    unit: string;
    weight?: number | null;
    brandName: string | null;
    category: { name: string };
    images: { url: string; alt: string | null; isPrimary: boolean }[];
  };
};

/** Список строк корзины: изображение, название, артикул, цена, количество, удаление. */
export function CartLines({
  lines,
  footer,
}: {
  lines: CartLineLike[];
  footer?: ReactNode;
}) {
  return (
    <ul className="divide-y divide-ink-100">
      {lines.map((line) => {
        const product = line.product;
        const image = productImage(product.images);
        const shortage = product.stock > 0 && line.qty > product.stock;
        const preorder = product.stock <= 0;

        return (
          <li key={product.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
            <Link
              href={`/product/${product.slug}`}
              className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-white sm:size-28"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={product.images[0]?.alt ?? product.name} className="size-full object-contain p-2" />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-ink-400">
                    {product.category.name}
                    {product.brandName ? ` · ${product.brandName}` : ""}
                  </p>
                  <Link
                    href={`/product/${product.slug}`}
                    className="line-clamp-2 font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {product.name}
                  </Link>
                  {product.sku && <p className="mt-0.5 text-xs text-ink-400">Артикул: {product.sku}</p>}
                </div>
                <div className="text-right">
                  <Price price={product.price} oldPrice={product.oldPrice} size="md" />
                  <p className="mt-0.5 text-xs text-ink-400">
                    {product.weight ? `Вес: ${formatWeight(product.weight)}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <QtyControl productId={product.id} qty={line.qty} stock={product.stock} />
                <div className="text-right">
                  <p className="text-xs text-ink-400">Сумма</p>
                  <p className="text-lg font-bold text-ink-900">{formatPrice(line.total)}</p>
                </div>
              </div>

              {(shortage || preorder) && (
                <div className="flex flex-wrap items-center gap-2">
                  {preorder ? (
                    <Badge variant="warning">Под заказ — уточним срок у поставщика</Badge>
                  ) : (
                    <Badge variant="warning">
                      На складе {product.stock} {product.unit} — остаток уточнит менеджер
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1">
                <RemoveLineButton productId={product.id} />
                <span className="text-xs text-ink-300">·</span>
                <Link href={`/product/${product.slug}`} className="text-xs text-ink-500 hover:text-brand-700">
                  Перейти к товару
                </Link>
              </div>
            </div>
          </li>
        );
      })}
      {footer}
    </ul>
  );
}

export function cartWord(count: number): string {
  return plural(count, "товар", "товара", "товаров");
}
