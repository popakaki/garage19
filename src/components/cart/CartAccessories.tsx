import Link from "next/link";
import { addToCartAction } from "@/lib/actions/cart";
import { Button, Card, Price } from "@/components/ui";
import { productImage } from "@/lib/utils";
import type { ProductCard } from "@/lib/queries";

/**
 * Блок допродаж в корзине: аксессуары (крепёж, смазка, сумки, электрика).
 * Данные приходят из `getAccessories()`; добавление — Server Action корзины.
 */
export function CartAccessories({ items, title = "Добавить к заказу" }: { items: ProductCard[]; title?: string }) {
  if (items.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <p className="mt-1 text-sm text-ink-500">
            Аксессуары, которые чаще всего берут вместе с багажниками и фаркопами
          </p>
        </div>
        <Link
          href="/catalog/krepezh-i-aksessuary"
          className="text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          Все аксессуары →
        </Link>
      </div>

      <ul className="grid gap-4 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((product) => (
          <li key={product.id} className="flex flex-col gap-2 rounded-xl border border-ink-100 p-3">
            <Link href={`/product/${product.slug}`} className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={productImage(product.images)}
                alt={product.images[0]?.alt ?? product.name}
                className="mx-auto h-24 w-full object-contain"
              />
            </Link>
            <Link
              href={`/product/${product.slug}`}
              className="line-clamp-2 text-sm font-medium text-ink-800 hover:text-brand-700"
            >
              {product.name}
            </Link>
            <Price price={product.price} oldPrice={product.oldPrice} size="sm" />
            <form action={addToCartAction} className="mt-auto">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="qty" value={1} />
              <Button type="submit" variant="outline" size="xs" className="w-full">
                В корзину
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}
