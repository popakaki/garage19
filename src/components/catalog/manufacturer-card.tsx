import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui";
import type { ManufacturerFacet } from "@/lib/queries";
import { cn, formatPrice, productWord } from "@/lib/utils";

/**
 * Карточка производителя товаров: логотип, количество товаров,
 * минимальная цена и ссылка на страницу бренда.
 */
export function ManufacturerCard({
  manufacturer,
  compact = false,
  className,
}: {
  manufacturer: ManufacturerFacet;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={`/brands/${manufacturer.slug}`}
      className={cn(
        "g19-card group flex flex-col items-start gap-2 p-4 transition-shadow hover:shadow-lg",
        compact && "items-center gap-1.5 p-3 text-center",
        className,
      )}
    >
      {manufacturer.logo ? (
        <span className={cn("relative block", compact ? "h-10 w-full" : "h-12 w-24")}>
          <Image
            src={manufacturer.logo}
            alt={manufacturer.name}
            fill
            sizes="96px"
            className="object-contain"
          />
        </span>
      ) : (
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl bg-ink-100 text-sm font-bold text-ink-600",
            compact && "mx-auto",
          )}
          aria-hidden
        >
          {manufacturer.name.slice(0, 2).toUpperCase()}
        </span>
      )}

      <span className={cn("font-semibold text-ink-900 group-hover:text-brand-700", compact ? "text-sm" : "text-base")}>
        {manufacturer.name}
      </span>

      {!compact && manufacturer.country && (
        <span className="text-xs text-ink-400">{manufacturer.country}</span>
      )}

      <span className="mt-auto text-xs text-ink-500">
        {manufacturer.productCount} {productWord(manufacturer.productCount)}
        {manufacturer.priceFrom > 0 && (
          <>
            {" · "}
            <span className="font-medium text-ink-700">от {formatPrice(manufacturer.priceFrom)}</span>
          </>
        )}
      </span>

      {manufacturer.productCount > 20 && !compact && <Badge variant="outline">Широкий выбор</Badge>}
    </Link>
  );
}
