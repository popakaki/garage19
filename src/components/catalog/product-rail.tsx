import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { ProductGrid } from "@/components/catalog/product-card";
import type { ProductCard as ProductCardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Блок-витрина товаров с заголовком: используется для «Аксессуары и допродажи»,
 * «Аналоги», «Похожие товары» и любых подборок на главной/посадочных.
 */
export function ProductRail({
  title,
  description,
  badge,
  action,
  products,
  columns = 4,
  compact = false,
  className,
  contained = true,
  filters,
}: {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  products: ProductCardData[];
  columns?: 2 | 3 | 4;
  compact?: boolean;
  className?: string;
  contained?: boolean;
  filters?: { marka?: string; model?: string; pokolenie?: string; mod?: string };
}) {
  if (!products.length) return null;

  const body = (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold text-ink-900 lg:text-2xl">
            {title}
            {badge}
          </h2>
          {description && <p className="mt-1.5 max-w-3xl text-sm text-ink-500">{description}</p>}
        </div>
        {action}
      </div>
      <ProductGrid products={products} columns={columns} compact={compact} filters={filters} />
    </>
  );

  return (
    <section className={cn("py-8", className)}>
      {contained ? <Container>{body}</Container> : body}
    </section>
  );
}
