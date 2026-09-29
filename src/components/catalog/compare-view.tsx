"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ShoppingCart, Trash2, X } from "lucide-react";
import { Badge, ButtonLink, EmptyState, Price, Rating, StockBadge } from "@/components/ui";
import { AddToCartButton } from "@/components/catalog/add-to-cart-button";
import { WishlistToggle } from "@/components/catalog/compare-buttons";
import { STORE_KEYS, type StoreKind } from "@/components/catalog/wishlist-store";
import type { ProductCard } from "@/lib/queries";
import { cn, formatPrice, productImage } from "@/lib/utils";

async function fetchProducts(ids: string[]): Promise<ProductCard[]> {
  if (ids.length === 0) return [];
  const response = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error("Не удалось загрузить товары");
  const data = (await response.json()) as { items?: ProductCard[] };
  return data.items ?? [];
}

function readIds(kind: StoreKind): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEYS[kind]);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function writeIds(kind: StoreKind, ids: string[]): void {
  try {
    window.localStorage.setItem(STORE_KEYS[kind], JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent("g19-store-change", { detail: { kind } }));
  } catch {
    // localStorage недоступен — игнорируем
  }
}

/** Плитка избранного (сетка). */
export function WishlistGrid() {
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = readIds("wishlist");
    setIds(current);
    void fetchProducts(current)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const remove = useCallback((id: string) => {
    const next = readIds("wishlist").filter((item) => item !== id);
    writeIds("wishlist", next);
    setIds(next);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-ink-500">
        <Loader2 className="size-5 animate-spin" aria-hidden /> Загружаем избранное…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="В избранном пока пусто"
        description="Нажимайте «В избранное» в каталоге и карточках товаров — список сохраняется в вашем браузере и не требует регистрации."
        action={
          <ButtonLink href="/catalog" size="lg">
            Перейти в каталог
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((product) => (
        <article key={product.id} className="g19-card flex flex-col gap-3 p-4">
          <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-ink-100 bg-white">
            <Image
              src={productImage(product.images)}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-contain p-3"
            />
            <button
              type="button"
              onClick={() => remove(product.id)}
              aria-label={`Убрать «${product.name}» из избранного`}
              className="absolute right-2 top-2 rounded-full border border-ink-200 bg-white/95 p-1.5 text-ink-500 hover:border-danger-500 hover:text-danger-600"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <h3 className="text-sm font-semibold text-ink-900">
            <Link href={`/product/${product.slug}`} className="line-clamp-2 hover:text-brand-700">
              {product.name}
            </Link>
          </h3>

          <div className="mt-auto flex flex-col gap-2">
            <Price price={product.price} oldPrice={product.oldPrice} />
            <StockBadge stock={product.stock} unit={product.unit} />
            <AddToCartButton productId={product.id} stock={product.stock} />
          </div>
        </article>
      ))}
    </div>
  );
}

const COMPARE_ROWS: { label: string; render: (product: ProductCard) => string }[] = [
  { label: "Цена", render: (product) => formatPrice(product.price) },
  {
    label: "Старая цена",
    render: (product) => (product.oldPrice ? formatPrice(product.oldPrice) : "—"),
  },
  { label: "Производитель", render: (product) => product.manufacturer?.name ?? product.brandName ?? "—" },
  { label: "Артикул", render: (product) => product.sku ?? "—" },
  { label: "Наличие", render: (product) => (product.stock > 0 ? `${product.stock} ${product.unit}` : "Под заказ") },
  { label: "Категория", render: (product) => product.category.name },
  { label: "Тип совместимости", render: (product) => (product.fitmentType === "universal" ? "Универсальный" : "Под конкретные авто") },
  { label: "Грузоподъёмность / тяговая", render: (product) => (product.capacityKg ? `${product.capacityKg} кг` : "—") },
  { label: "Вертикальная нагрузка", render: (product) => (product.verticalLoadKg ? `${product.verticalLoadKg} кг` : "—") },
  { label: "Объём", render: (product) => (product.volumeL ? `${product.volumeL} л` : "—") },
  { label: "Место установки", render: (product) => product.mountPlace ?? "—" },
  { label: "Материал", render: (product) => product.material ?? "—" },
  { label: "Профиль", render: (product) => product.profile ?? "—" },
  { label: "Замок в комплекте", render: (product) => bool(product.lockIncluded) },
  { label: "Электрика в комплекте", render: (product) => bool(product.electricIncluded) },
  { label: "Вырез бампера", render: (product) => bool(product.bumperCut) },
  { label: "Гарантия", render: (product) => (product.warrantyMonths ? `${product.warrantyMonths} мес.` : "—") },
  { label: "Рейтинг", render: (product) => (product.ratingCount ? `${product.ratingAvg.toFixed(1)} (${product.ratingCount})` : "нет отзывов") },
];

function bool(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value ? "Да" : "Нет";
}

/** Таблица сравнения характеристик. */
export function CompareTable() {
  const [items, setItems] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = readIds("compare").slice(0, 4);
    void fetchProducts(current)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const remove = (id: string) => {
    const next = readIds("compare").filter((item) => item !== id);
    writeIds("compare", next);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clear = () => {
    writeIds("compare", []);
    setItems([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-ink-500">
        <Loader2 className="size-5 animate-spin" aria-hidden /> Загружаем сравнение…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Список сравнения пуст"
        description="Добавьте от 2 до 4 товаров кнопкой «Сравнить» — покажем характеристики в одной таблице: грузоподъёмность, объём, место установки, замок, электрику и вырез бампера."
        action={
          <ButtonLink href="/catalog" size="lg">
            Выбрать товары
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          Сравниваем {items.length} товар{items.length > 1 ? "а" : ""} из 4 возможных
        </p>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-danger-600 hover:text-danger-500"
        >
          <Trash2 className="size-4" aria-hidden /> Очистить сравнение
        </button>
      </div>

      <div className="g19-card overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <caption className="sr-only">Сравнение характеристик товаров</caption>
          <thead>
            <tr>
              <th scope="col" className="w-52 border-b border-ink-100 bg-ink-50 px-4 py-3 text-left font-semibold text-ink-700">
                Характеристика
              </th>
              {items.map((product) => (
                <th key={product.id} scope="col" className="border-b border-ink-100 px-4 py-3 text-left align-top">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => remove(product.id)}
                      aria-label={`Убрать «${product.name}» из сравнения`}
                      className="self-end rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-danger-600"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                    <span className="relative block h-24 w-full">
                      <Image
                        src={productImage(product.images)}
                        alt={product.name}
                        fill
                        sizes="200px"
                        className="object-contain"
                      />
                    </span>
                    <Link href={`/product/${product.slug}`} className="line-clamp-2 font-semibold text-ink-900 hover:text-brand-700">
                      {product.name}
                    </Link>
                    <Rating value={product.ratingAvg} count={product.ratingCount} size="sm" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row, index) => (
              <tr key={row.label} className={index % 2 === 1 ? "bg-ink-50/60" : undefined}>
                <th scope="row" className="border-b border-ink-100 px-4 py-2.5 text-left font-medium text-ink-500">
                  {row.label}
                </th>
                {items.map((product) => (
                  <td key={product.id} className="border-b border-ink-100 px-4 py-2.5 text-ink-900">
                    {row.render(product)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className="px-4 py-3 text-left font-medium text-ink-500">
                Действия
              </th>
              {items.map((product) => (
                <td key={product.id} className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <AddToCartButton productId={product.id} stock={product.stock} size="sm" />
                    <WishlistToggle productId={product.id} productName={product.name} withLabel={false} />
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className={cn("flex flex-wrap items-center gap-3")}>
        <Badge variant="outline">
          <ShoppingCart className="size-3.5" aria-hidden /> Сравнение сохраняется в браузере
        </Badge>
        <span className="text-xs text-ink-400">
          Максимум 4 товара. Данные видны только вам — регистрация не требуется.
        </span>
      </div>
    </div>
  );
}
