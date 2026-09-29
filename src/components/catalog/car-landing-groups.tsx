import Link from "next/link";
import { Container } from "@/components/ui";
import { ProductGrid } from "@/components/catalog/product-card";
import type { ProductCard as ProductCardData } from "@/lib/queries";
import { cn, productWord } from "@/lib/utils";

export type CarLandingGroup = { name: string; slug: string; items: ProductCardData[] };

/**
 * Группы товаров по категориям на SEO-посадочных «авто → товары».
 * Для каждой категории — заголовок, счётчик, ссылка на каталог с сохранённым
 * фильтром по автомобилю и несколько товаров плиткой.
 */
export function CarLandingGroups({
  groups,
  brandSlug,
  modelSlug,
  generationSlug,
  limit = 4,
  className,
}: {
  groups: CarLandingGroup[];
  brandSlug: string;
  modelSlug?: string;
  generationSlug?: string;
  limit?: number;
  className?: string;
}) {
  if (!groups.length) return null;

  const filters = {
    marka: brandSlug,
    model: modelSlug,
    pokolenie: generationSlug,
  };

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {groups.map((group) => {
        const search = new URLSearchParams();
        search.set("marka", brandSlug);
        if (modelSlug) search.set("model", modelSlug);
        if (generationSlug) search.set("pokolenie", generationSlug);

        return (
          <section key={group.slug}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-bold text-ink-900">
                {group.name}{" "}
                <span className="text-sm font-normal text-ink-400">
                  {group.items.length} {productWord(group.items.length)}
                </span>
              </h2>
              <Link
                href={`/catalog/${group.slug}?${search.toString()}`}
                className="text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Смотреть все →
              </Link>
            </div>
            <ProductGrid products={group.items.slice(0, limit)} columns={4} filters={filters} />
          </section>
        );
      })}
    </div>
  );
}

/** Блок «Другие поколения» / «Другие модели» / «Другие марки» для перелинковки. */
export function LandingNavBlock({
  title,
  links,
}: {
  title: string;
  links: { name: string; href: string; note?: string }[];
}) {
  if (!links.length) return null;

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5">
      <h2 className="text-base font-semibold text-ink-900">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-brand-300 hover:text-brand-700"
            >
              {link.name}
              {link.note && <span className="text-ink-400">{link.note}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Контейнер посадочной страницы. */
export function LandingContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Container className={cn("flex flex-col gap-6 py-6", className)}>{children}</Container>;
}
