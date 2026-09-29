import Image from "next/image";
import Link from "next/link";
import { Badge, Price, Rating, StockBadge } from "@/components/ui";
import { AddToCartButton } from "@/components/catalog/add-to-cart-button";
import { CompareToggle, WishlistIconButton, WishlistToggle } from "@/components/catalog/compare-buttons";
import type { ProductCard as ProductCardData } from "@/lib/queries";
import { cn, discountPercent, formatPrice, productImage, truncate } from "@/lib/utils";

/**
 * Плитка товара для листингов, главной, посадочных и карточек.
 *
 * Публичный API (используется и ведущим разработчиком на главной):
 *   <ProductCard product={p} />                     — плитка
 *   <ProductCard product={p} view="list" />         — строка списка
 *   <ProductCard product={p} view="grid" compact /> — уменьшенная плитка (сайдбары)
 *
 * Компонент серверный: внутри только клиентские кнопки (корзина/сравнение/избранное).
 */

export type ProductCardProps = {
  product: ProductCardData;
  view?: "grid" | "list";
  /** Компактный режим: меньше отступы, без блока характеристик. */
  compact?: boolean;
  className?: string;
  priority?: boolean;
  /** Переопределить ссылку (например, сохранить фильтр по авто). */
  href?: string;
  /**
   * Контекст листинга (подбор по авто) — добавляется в ссылку на карточку,
   * чтобы карточка знала выбранный автомобиль.
   */
  filters?: { marka?: string; model?: string; pokolenie?: string; mod?: string };
};

/** Ссылка на карточку с сохранением контекста подбора по автомобилю. */
function productHrefWithFilters(
  product: ProductCardData,
  filters?: ProductCardProps["filters"],
): string {
  const base = `/product/${product.slug}`;
  if (!filters) return base;
  const search = new URLSearchParams();
  if (filters.marka) search.set("marka", filters.marka);
  if (filters.model) search.set("model", filters.model);
  if (filters.pokolenie) search.set("pokolenie", filters.pokolenie);
  if (filters.mod) search.set("mod", filters.mod);
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

/** «Маркеры» товара — узкие характеристики, по которым выбирают в нише. */
function markers(product: ProductCardData): string[] {
  const list: string[] = [];
  if (product.capacityKg) list.push(`${product.capacityKg} кг`);
  if (product.volumeL) list.push(`${product.volumeL} л`);
  if (product.verticalLoadKg) list.push(`верт. ${product.verticalLoadKg} кг`);
  if (product.mountPlace) list.push(product.mountPlace);
  if (product.material) list.push(product.material);
  if (product.lockIncluded) list.push("замок");
  if (product.electricIncluded) list.push("электрика");
  return list.slice(0, 5);
}

export function ProductCard({
  product,
  view = "grid",
  compact = false,
  className,
  priority = false,
  href,
  filters,
}: ProductCardProps) {
  const productHref = href ?? productHrefWithFilters(product, filters);
  const discount = discountPercent(product.price, product.oldPrice);
  const brand = product.manufacturer?.name ?? product.brandName ?? null;
  const specs = markers(product);
  const isList = view === "list";

  const badges = (
    <div className="flex flex-wrap items-center gap-1.5">
      {discount > 0 && <Badge variant="danger">Скидка {discount}%</Badge>}
      {product.isNew && <Badge variant="brand">Новинка</Badge>}
      {product.isHit && <Badge variant="dark">Хит</Badge>}
      {product.fitmentType === "universal" && <Badge variant="outline">Универсальный</Badge>}
    </div>
  );

  const media = (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-white",
        isList ? "h-36 w-36 sm:h-44 sm:w-44" : "aspect-4/3 w-full",
      )}
    >
      <Image
        src={productImage(product.images)}
        alt={product.name}
        fill
        sizes={isList ? "176px" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
        priority={priority}
        className="object-contain p-3 transition-transform duration-300 group-hover/media:scale-105"
      />
      <div className="absolute left-2 top-2">{badges}</div>
      <div className="absolute right-2 top-2">
        <WishlistIconButton productId={product.id} productName={product.name} />
      </div>
    </div>
  );

  const priceBlock = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Price price={product.price} oldPrice={product.oldPrice} size={isList ? "lg" : "md"} />
      {product.oldPrice && product.oldPrice > product.price && !isList && (
        <span className="sr-only">Цена со скидкой {formatPrice(product.price)}</span>
      )}
    </div>
  );

  const actions = (
    <div className={cn("flex items-center gap-2", isList ? "flex-row" : "flex-col")}>
      <div className={cn(isList ? "w-40" : "w-full")}>
        <AddToCartButton
          productId={product.id}
          stock={product.stock}
          redirectTo={productHref}
          size={compact ? "sm" : "md"}
        />
      </div>
      <CompareToggle
        productId={product.id}
        productName={product.name}
        className={cn("shrink-0 text-xs", isList && "w-36")}
      />
    </div>
  );

  return (
    <article
      className={cn(
        "g19-card group/card flex flex-col overflow-hidden transition-shadow hover:shadow-lg",
        isList ? "gap-4 p-3 sm:flex-row sm:p-4" : compact ? "gap-3 p-3" : "gap-4 p-4",
        className,
      )}
    >
      <Link
        href={productHref}
        className={cn("group/media relative block", isList && "shrink-0")}
        tabIndex={-1}
        aria-hidden
      >
        {media}
      </Link>

      <div className={cn("flex min-w-0 flex-1 flex-col", compact ? "gap-1.5" : "gap-2.5")}>
        {brand && <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">{brand}</span>}

        <h3 className={cn("font-semibold leading-snug text-ink-900", compact ? "text-sm" : "text-base")}>
          <Link href={productHref} className="line-clamp-2 hover:text-brand-700">
            {compact ? truncate(product.name, 70) : product.name}
          </Link>
        </h3>

        {product.ratingCount > 0 && (
          <Rating value={product.ratingAvg} count={product.ratingCount} size="sm" />
        )}

        {!compact && specs.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Ключевые характеристики">
            {specs.map((spec) => (
              <li
                key={spec}
                className="rounded-lg bg-ink-50 px-2 py-1 text-xs font-medium text-ink-600"
              >
                {spec}
              </li>
            ))}
          </ul>
        )}

        {!compact && product.shortDescription && !isList && (
          <p className="line-clamp-2 text-sm text-ink-500">{product.shortDescription}</p>
        )}

        <div className="mt-auto flex flex-col gap-2.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {priceBlock}
            <StockBadge stock={product.stock} unit={product.unit} />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
            {product.sku && <span>Арт. {product.sku}</span>}
            {product.warrantyMonths ? <span>Гарантия {product.warrantyMonths} мес.</span> : null}
          </div>

          {actions}
        </div>
      </div>
    </article>
  );
}

/** Горизонтальная лента товаров (главная, «Похожие», «Аксессуары»). */
export function ProductGrid({
  products,
  view = "grid",
  compact = false,
  className,
  columns = 4,
  filters,
}: {
  products: ProductCardData[];
  view?: "grid" | "list";
  compact?: boolean;
  className?: string;
  columns?: 2 | 3 | 4;
  filters?: ProductCardProps["filters"];
}) {
  const columnClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div
      className={cn(
        view === "list" ? "flex flex-col gap-4" : cn("grid grid-cols-1 gap-4", columnClass),
        className,
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          view={view}
          compact={compact}
          filters={filters}
          priority={index < 4}
        />
      ))}
    </div>
  );
}

export { WishlistToggle };
