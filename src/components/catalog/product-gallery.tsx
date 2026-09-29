"use client";

import { useCallback, useEffect, useState, type ComponentProps } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn, productImage } from "@/lib/utils";

export type GalleryImage = { url: string; alt: string | null; isPrimary: boolean };
export type GalleryBadge = { label: string; variant: ComponentProps<typeof Badge>["variant"] };

/**
 * Галерея карточки товара: превью, стрелки, зум-лайтбокс.
 * Управление с клавиатуры: ←/→ — перелистывание, Esc — закрыть.
 */
export function ProductGallery({
  images,
  productName,
  badges,
}: {
  images: GalleryImage[];
  productName: string;
  badges?: GalleryBadge[];
}) {
  const list = images.length ? images : [{ url: productImage(null), alt: productName, isPrimary: true }];
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const total = list.length;
  const current = list[Math.min(index, total - 1)];

  const go = useCallback(
    (delta: number) => {
      setIndex((prev) => (prev + delta + total) % total);
      setZoomed(false);
    },
    [total],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setZoomed(false);
          }}
          className="relative block aspect-square w-full cursor-zoom-in"
          aria-label={`Открыть фото «${productName}» крупнее`}
        >
          <Image
            src={current.url}
            alt={current.alt ?? productName}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="object-contain p-6"
          />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg bg-ink-900/75 px-2 py-1 text-xs font-medium text-white">
            <ZoomIn className="size-3.5" aria-hidden /> Увеличить
          </span>
        </button>

        {badges && badges.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {badges.map((badge) => (
              <Badge key={badge.label} variant={badge.variant}>
                {badge.label}
              </Badge>
            ))}
          </div>
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Предыдущее фото"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-ink-200 bg-white/95 p-2 text-ink-600 shadow-sm hover:text-brand-700"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Следующее фото"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-ink-200 bg-white/95 p-2 text-ink-600 shadow-sm hover:text-brand-700"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
            <span className="absolute bottom-3 left-3 rounded-lg bg-ink-900/75 px-2 py-1 text-xs font-medium text-white">
              {index + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Дополнительные фото">
          {list.map((image, position) => (
            <li key={`${image.url}-${position}`}>
              <button
                type="button"
                onClick={() => {
                  setIndex(position);
                  setZoomed(false);
                }}
                aria-label={`Фото ${position + 1}`}
                aria-current={position === index}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-xl border bg-white transition-colors sm:size-20",
                  position === index ? "border-brand-500 ring-2 ring-brand-100" : "border-ink-200 hover:border-brand-300",
                )}
              >
                <Image
                  src={image.url}
                  alt={image.alt ?? `${productName}, фото ${position + 1}`}
                  fill
                  sizes="80px"
                  className="object-contain p-1.5"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Фото товара «${productName}»`}
          className="fixed inset-0 z-50 flex flex-col bg-ink-950/90 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="flex items-center justify-between text-white">
            <span className="text-sm font-medium">
              {index + 1} / {total}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть просмотр"
              className="rounded-full border border-white/30 p-2 hover:bg-white/10"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div
            className="relative mt-3 flex-1 overflow-hidden"
            onClick={(event) => {
              event.stopPropagation();
              setZoomed((prev) => !prev);
            }}
          >
            <Image
              src={current.url}
              alt={current.alt ?? productName}
              fill
              sizes="100vw"
              className={cn(
                "transition-transform duration-300",
                zoomed ? "scale-[1.8] cursor-zoom-out object-cover" : "cursor-zoom-in object-contain",
              )}
            />
          </div>

          {total > 1 && (
            <div
              className="mt-3 flex items-center justify-center gap-3"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => go(-1)}
                className="rounded-xl border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10"
              >
                ← Назад
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="rounded-xl border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10"
              >
                Вперёд →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
