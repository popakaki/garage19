"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image: string;
  mobileImage?: string | null;
  badge?: string | null;
  linkUrl?: string | null;
  linkText?: string | null;
};

const AUTOPLAY_MS = 7000;

/** Главный слайдер: автопрокрутка, стрелки, точки, свайп, пауза при наведении. */
export function HeroSlider({ slides, className }: { slides: HeroSlide[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const total = slides.length;

  const go = useCallback(
    (next: number) => {
      if (total === 0) return;
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (paused || total <= 1) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, total]);

  if (total === 0) return null;

  const slide = slides[index];

  return (
    <div
      className={cn("group relative overflow-hidden rounded-2xl bg-ink-900 shadow-card", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX ?? null;
        if (start === null || end === null) return;
        const delta = end - start;
        if (Math.abs(delta) > 45) go(index + (delta < 0 ? 1 : -1));
        touchStart.current = null;
      }}
      role="region"
      aria-roledescription="слайдер"
      aria-label={`Слайд ${index + 1} из ${total}`}
    >
      <div className="relative aspect-16/9 w-full sm:aspect-21/9">
        {slides.map((item, itemIndex) => (
          <div
            key={item.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              itemIndex === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <Image
              src={item.image}
              alt={item.title}
              fill
              priority={itemIndex === 0}
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/60 to-ink-950/10" />
          </div>
        ))}

        <div className="relative z-10 flex h-full flex-col justify-center gap-3 p-6 sm:p-10 lg:p-12">
          {slide.badge && (
            <span className="w-fit rounded-lg bg-brand-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              {slide.badge}
            </span>
          )}
          <h1 className="max-w-2xl text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className="max-w-xl text-sm font-medium text-brand-200 sm:text-base">{slide.subtitle}</p>
          )}
          {slide.description && (
            <p className="hidden max-w-xl text-sm text-ink-200 sm:block">{slide.description}</p>
          )}
          {slide.linkUrl && (
            <div className="mt-1 flex flex-wrap gap-2">
              <Link
                href={slide.linkUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                {slide.linkText ?? "Смотреть товары"}
              </Link>
              <Link
                href="/podbor"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                Подбор по авто
              </Link>
            </div>
          )}
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 z-20 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition-opacity hover:bg-white/30 group-hover:opacity-100"
            aria-label="Предыдущий слайд"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 z-20 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition-opacity hover:bg-white/30 group-hover:opacity-100"
            aria-label="Следующий слайд"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute bottom-4 left-6 z-20 flex gap-2 lg:left-12">
            {slides.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(itemIndex)}
                aria-label={`Слайд ${itemIndex + 1}`}
                aria-current={itemIndex === index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  itemIndex === index ? "w-8 bg-brand-500" : "w-4 bg-white/40 hover:bg-white/70",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
