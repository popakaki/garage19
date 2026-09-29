"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, ChevronRight, Loader2, Search, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfiguratorBrand = {
  id: string;
  name: string;
  slug: string;
  popular?: boolean;
};

type Option = {
  id: string;
  name: string;
  slug?: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  note?: string | null;
};

type Props = {
  brands: ConfiguratorBrand[];
  variant?: "hero" | "panel" | "inline";
  className?: string;
  /** Текущее состояние из URL (например, на странице каталога). */
  initial?: { brand?: string; model?: string; generation?: string };
  /** Куда вести после подбора. По умолчанию — SEO-посадочные /podbor/... */
  target?: "podbor" | "catalog";
  /** Колбэк вместо перехода (используется в сайдбаре каталога). */
  onSubmit?: (value: { brand: string; model?: string; generation?: string; modificationId?: string }) => void;
};

const POPULAR_LIMIT = 12;

/**
 * Конфигуратор подбора: марка → модель → поколение → модификация.
 * Явное поле «поколение» есть только у одного из конкурентов, а автосохранение
 * подобранного автомобиля не делает никто — это наши конкурентные преимущества.
 */
export function CarConfigurator({
  brands,
  variant = "hero",
  className,
  initial,
  target = "podbor",
  onSubmit,
}: Props) {
  const router = useRouter();
  const [brandSlug, setBrandSlug] = useState(initial?.brand ?? "");
  const [modelSlug, setModelSlug] = useState(initial?.model ?? "");
  const [generationSlug, setGenerationSlug] = useState(initial?.generation ?? "");
  const [modificationId, setModificationId] = useState("");

  const [models, setModels] = useState<Option[]>([]);
  const [generations, setGenerations] = useState<Option[]>([]);
  const [modifications, setModifications] = useState<Option[]>([]);
  const [loading, setLoading] = useState<"models" | "generations" | "modifications" | null>(null);

  const popular = useMemo(() => brands.filter((brand) => brand.popular).slice(0, POPULAR_LIMIT), [brands]);
  const brandGroups = useMemo(() => {
    const popularSlugs = new Set(popular.map((brand) => brand.slug));
    return {
      popular,
      rest: brands.filter((brand) => !popularSlugs.has(brand.slug)),
    };
  }, [brands, popular]);

  const loadModels = useCallback(async (slug: string) => {
    if (!slug) {
      setModels([]);
      return;
    }
    setLoading("models");
    try {
      const response = await fetch(`/api/cars?level=models&brand=${encodeURIComponent(slug)}`);
      const data = (await response.json()) as { items: Option[] };
      setModels(data.items ?? []);
    } catch {
      setModels([]);
    } finally {
      setLoading(null);
    }
  }, []);

  const loadGenerations = useCallback(async (brand: string, model: string) => {
    if (!brand || !model) {
      setGenerations([]);
      return;
    }
    setLoading("generations");
    try {
      const response = await fetch(
        `/api/cars?level=generations&brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`,
      );
      const data = (await response.json()) as { items: Option[] };
      setGenerations(data.items ?? []);
    } catch {
      setGenerations([]);
    } finally {
      setLoading(null);
    }
  }, []);

  const loadModifications = useCallback(async (brand: string, model: string, generation: string) => {
    if (!brand || !model || !generation) {
      setModifications([]);
      return;
    }
    setLoading("modifications");
    try {
      const response = await fetch(
        `/api/cars?level=modifications&brand=${encodeURIComponent(brand)}` +
          `&model=${encodeURIComponent(model)}&generation=${encodeURIComponent(generation)}`,
      );
      const data = (await response.json()) as { items: Option[] };
      setModifications(data.items ?? []);
    } catch {
      setModifications([]);
    } finally {
      setLoading(null);
    }
  }, []);

  // Первичная загрузка при наличии значений в URL
  useEffect(() => {
    if (initial?.brand) void loadModels(initial.brand);
    if (initial?.brand && initial?.model) void loadGenerations(initial.brand, initial.model);
    if (initial?.brand && initial?.model && initial?.generation) {
      void loadModifications(initial.brand, initial.model, initial.generation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBrand = (value: string) => {
    setBrandSlug(value);
    setModelSlug("");
    setGenerationSlug("");
    setModificationId("");
    setModels([]);
    setGenerations([]);
    setModifications([]);
    void loadModels(value);
  };

  const handleModel = (value: string) => {
    setModelSlug(value);
    setGenerationSlug("");
    setModificationId("");
    setGenerations([]);
    setModifications([]);
    void loadGenerations(brandSlug, value);
  };

  const handleGeneration = (value: string) => {
    setGenerationSlug(value);
    setModificationId("");
    setModifications([]);
    void loadModifications(brandSlug, modelSlug, value);
  };

  const buildUrl = useCallback(() => {
    const parts = [brandSlug, modelSlug, generationSlug].filter(Boolean);
    if (onSubmit) return null;
    if (target === "catalog") {
      const params = new URLSearchParams();
      if (brandSlug) params.set("marka", brandSlug);
      if (modelSlug) params.set("model", modelSlug);
      if (generationSlug) params.set("pokolenie", generationSlug);
      if (modificationId) params.set("mod", modificationId);
      return `/catalog?${params.toString()}`;
    }
    if (modelSlug && generationSlug) return `/podbor/${parts.join("/")}`;
    if (modelSlug) return `/podbor/${parts.join("/")}`;
    return `/podbor/${brandSlug}`;
  }, [brandSlug, modelSlug, generationSlug, modificationId, onSubmit, target]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!brandSlug) return;

    if (onSubmit) {
      onSubmit({
        brand: brandSlug,
        model: modelSlug || undefined,
        generation: generationSlug || undefined,
        modificationId: modificationId || undefined,
      });
      return;
    }

    const url = buildUrl();
    if (url) {
      try {
        window.localStorage.setItem(
          "g19_last_car",
          JSON.stringify({ brand: brandSlug, model: modelSlug, generation: generationSlug, modificationId }),
        );
      } catch {
        // localStorage может быть недоступен — не критично
      }
      router.push(url);
    }
  };

  const isHero = variant === "hero";
  const selectClass = cn("g19-input h-12 cursor-pointer", isHero && "border-transparent bg-ink-50");

  return (
    <form
      onSubmit={submit}
      className={cn(
        isHero ? "rounded-2xl border border-ink-100 bg-white p-5 shadow-card" : "space-y-3",
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <Car className="size-5" />
        </span>
        <div>
          <p className="text-base font-bold text-ink-900">Подбор по автомобилю</p>
          <p className="text-xs text-ink-500">
            Марка → модель → поколение. Покажем только то, что действительно подходит.
          </p>
        </div>
      </div>

      <div className={cn("grid gap-3", isHero ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
        <label className="block">
          <span className="g19-label">Марка</span>
          <select
            className={selectClass}
            value={brandSlug}
            onChange={(event) => handleBrand(event.target.value)}
            aria-label="Марка автомобиля"
          >
            <option value="">Выберите марку</option>
            {brandGroups.popular.length > 0 && (
              <optgroup label="Популярные">
                {brandGroups.popular.map((brand) => (
                  <option key={brand.id} value={brand.slug}>
                    {brand.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Все марки">
              {brandGroups.rest.map((brand) => (
                <option key={brand.id} value={brand.slug}>
                  {brand.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="block">
          <span className="g19-label">Модель</span>
          <select
            className={selectClass}
            value={modelSlug}
            onChange={(event) => handleModel(event.target.value)}
            disabled={!brandSlug || loading === "models"}
            aria-label="Модель автомобиля"
          >
            <option value="">{brandSlug ? (loading === "models" ? "Загрузка…" : "Выберите модель") : "Сначала марка"}</option>
            {models.map((model) => (
              <option key={model.id} value={model.slug ?? model.name}>
                {model.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="g19-label">Поколение</span>
          <select
            className={selectClass}
            value={generationSlug}
            onChange={(event) => handleGeneration(event.target.value)}
            disabled={!modelSlug || loading === "generations"}
            aria-label="Поколение автомобиля"
          >
            <option value="">
              {modelSlug ? (loading === "generations" ? "Загрузка…" : "Выберите поколение") : "Сначала модель"}
            </option>
            {generations.map((generation) => (
              <option key={generation.id} value={generation.slug ?? generation.name}>
                {generation.name}
                {generation.yearFrom ? ` (${generation.yearFrom}${generation.yearTo ? `–${generation.yearTo}` : "–н.в."})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="g19-label">
            Модификация <span className="font-normal text-ink-400">(необязательно)</span>
          </span>
          <select
            className={selectClass}
            value={modificationId}
            onChange={(event) => setModificationId(event.target.value)}
            disabled={!generationSlug || loading === "modifications"}
            aria-label="Модификация автомобиля"
          >
            <option value="">Все модификации</option>
            {modifications.map((modification) => (
              <option key={modification.id} value={modification.id}>
                {modification.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {popular.length > 0 && isHero && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-400">Часто ищут:</span>
          {popular.slice(0, 6).map((brand) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => handleBrand(brand.slug)}
              className={cn(
                "rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                brandSlug === brand.slug
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-brand-100 hover:text-brand-700",
              )}
            >
              {brand.name}
            </button>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={!brandSlug || loading !== null}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        Подобрать товары
      </button>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <Link href="/podbor" className="font-medium text-ink-500 hover:text-brand-700">
          Все марки и модели
        </Link>
        <Link href="/podbor-po-vin" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-800">
          <ShieldCheck className="size-3.5" />
          Подбор по VIN
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </form>
  );
}
