"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, CheckCircle2, Search } from "lucide-react";
import { Alert, Badge, Button } from "@/components/ui";
import { requestCarSelectionAction } from "@/lib/actions/catalog";
import { formatYears } from "@/lib/utils";

export type CarSelectorBrand = {
  slug: string;
  name: string;
  popular: boolean;
  models: {
    slug: string;
    name: string;
    yearFrom: number | null;
    yearTo: number | null;
    generations: {
      slug: string;
      name: string;
      yearFrom: number;
      yearTo: number | null;
      modifications: { id: string; name: string }[];
    }[];
  }[];
};

export type CarSelection = {
  brandSlug?: string;
  modelSlug?: string;
  generationSlug?: string;
  modificationId?: string;
};

/**
 * Каскадный подбор по автомобилю: марка → модель → поколение → модификация.
 * Выбор сохраняется в query-параметрах каталога (marka/model/pokolenie/mod),
 * поэтому ссылки на карточки товаров можно строить с тем же контекстом.
 *
 * Отдельно проработан сценарий «нет моей модификации» — самая частая точка
 * отвала у конкурентов: заявка с VIN уходит менеджеру прямо из каталога.
 */
export function CarSelector({
  brands,
  selected,
  basePath,
  variant = "panel",
}: {
  brands: CarSelectorBrand[];
  selected: CarSelection;
  basePath: string;
  variant?: "panel" | "inline";
}) {
  const router = useRouter();
  const [brandSlug, setBrandSlug] = useState(selected.brandSlug ?? "");
  const [modelSlug, setModelSlug] = useState(selected.modelSlug ?? "");
  const [generationSlug, setGenerationSlug] = useState(selected.generationSlug ?? "");
  const [modificationId, setModificationId] = useState(selected.modificationId ?? "");
  const [notFound, setNotFound] = useState(false);

  const brand = useMemo(() => brands.find((item) => item.slug === brandSlug), [brands, brandSlug]);
  const model = useMemo(
    () => brand?.models.find((item) => item.slug === modelSlug),
    [brand, modelSlug],
  );
  const generation = useMemo(
    () => model?.generations.find((item) => item.slug === generationSlug),
    [model, generationSlug],
  );

  const popular = brands.filter((item) => item.popular).slice(0, 8);
  const anyBrands = brands.length > 0;

  const query: Record<string, string | null> = {
    marka: brandSlug || null,
    model: modelSlug || null,
    pokolenie: generationSlug || null,
    mod: modificationId || null,
    page: null,
  };

  const apply = () => {
    const search = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    const suffix = search.toString();
    router.push(suffix ? `${basePath}?${suffix}` : basePath, { scroll: false });
  };

  const podborHref =
    brandSlug && modelSlug
      ? `/podbor/${brandSlug}/${modelSlug}${generationSlug ? `/${generationSlug}` : ""}`
      : brandSlug
        ? `/podbor/${brandSlug}`
        : null;

  const label = [
    brand?.name,
    model?.name,
    generation ? `${generation.name} (${formatYears(generation.yearFrom, generation.yearTo)})` : undefined,
    generation?.modifications.find((item) => item.id === modificationId)?.name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={variant === "panel" ? "g19-card p-4 sm:p-5" : ""}>
      <div className="flex items-center gap-2">
        <Car className="size-5 text-brand-600" aria-hidden />
        <h2 className="text-base font-semibold text-ink-900">Подбор по автомобилю</h2>
      </div>
      <p className="mt-1 text-sm text-ink-500">
        Укажите марку, модель и поколение — покажем только подходящие товары.
      </p>

      {!anyBrands && (
        <Alert variant="warning" className="mt-3">
          Справочник автомобилей пока пуст. Оставьте заявку — подберём вручную.
        </Alert>
      )}

      {popular.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {popular.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => {
                setBrandSlug(item.slug);
                setModelSlug("");
                setGenerationSlug("");
                setModificationId("");
              }}
              className={
                item.slug === brandSlug
                  ? "rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white"
                  : "rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-600 hover:border-brand-300 hover:text-brand-700"
              }
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="g19-label">Марка</span>
          <select
            className="g19-input cursor-pointer"
            value={brandSlug}
            onChange={(event) => {
              setBrandSlug(event.target.value);
              setModelSlug("");
              setGenerationSlug("");
              setModificationId("");
              setNotFound(false);
            }}
          >
            <option value="">Выберите марку</option>
            {brands.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="g19-label">Модель</span>
          <select
            className="g19-input cursor-pointer disabled:bg-ink-50"
            value={modelSlug}
            disabled={!brand}
            onChange={(event) => {
              setModelSlug(event.target.value);
              setGenerationSlug("");
              setModificationId("");
              setNotFound(false);
            }}
          >
            <option value="">{brand ? "Выберите модель" : "Сначала марка"}</option>
            {brand?.models.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="g19-label">Поколение</span>
          <select
            className="g19-input cursor-pointer disabled:bg-ink-50"
            value={generationSlug}
            disabled={!model}
            onChange={(event) => {
              setGenerationSlug(event.target.value);
              setModificationId("");
              setNotFound(false);
            }}
          >
            <option value="">{model ? "Все поколения" : "Сначала модель"}</option>
            {model?.generations.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name} ({formatYears(item.yearFrom, item.yearTo)})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="g19-label">Модификация</span>
          <select
            className="g19-input cursor-pointer disabled:bg-ink-50"
            value={modificationId}
            disabled={!generation}
            onChange={(event) => setModificationId(event.target.value)}
          >
            <option value="">{generation ? "Все модификации" : "Сначала поколение"}</option>
            {generation?.modifications.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {label && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-600">
          <CheckCircle2 className="size-4 text-success-600" aria-hidden />
          Выбрано: <strong className="font-semibold text-ink-900">{label}</strong>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={apply} disabled={!brandSlug} size="sm">
          <Search className="size-4" aria-hidden />
          Показать товары
        </Button>
        {podborHref && (
          <Link
            href={podborHref}
            className="rounded-xl border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
          >
            Страница подбора
          </Link>
        )}
        <button
          type="button"
          onClick={() => setNotFound((prev) => !prev)}
          className="text-sm font-medium text-brand-700 underline hover:text-brand-800"
          aria-expanded={notFound}
        >
          Нет моей модификации?
        </button>
      </div>

      {notFound && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <p className="text-sm font-semibold text-ink-900">
            Нет вашей модификации в базе? Подберём вручную
          </p>
          <p className="mt-1 text-xs text-ink-600">
            Пришлите VIN или опишите автомобиль — менеджер проверит совместимость по каталогам
            производителей и вернётся с точным ответом. Это займёт до одного рабочего дня.
          </p>
          <form action={requestCarSelectionAction} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="source" value="car_selector" />
            <input type="hidden" name="carInfo" value={label} />
            <label className="block">
              <span className="g19-label">Имя *</span>
              <input name="name" required minLength={2} className="g19-input" placeholder="Как к вам обращаться" />
            </label>
            <label className="block">
              <span className="g19-label">Телефон *</span>
              <input
                name="phone"
                required
                inputMode="tel"
                className="g19-input"
                placeholder="+7 (999) 123-45-67"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="g19-label">VIN или описание автомобиля</span>
              <input name="vin" className="g19-input" placeholder="17 символов VIN" maxLength={17} />
            </label>
            <label className="block sm:col-span-2">
              <span className="g19-label">Комментарий</span>
              <textarea
                name="message"
                className="g19-input min-h-20"
                placeholder="Например: Camry XV70 2019, 2.5, комплектация с рейлингами"
              />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary" size="sm">
                Отправить заявку на подбор
              </Button>
            </div>
          </form>
          <p className="mt-2 text-xs text-ink-500">
            Универсальные товары тоже подойдут —{" "}
            <Link href={`${basePath}?fitment=universal`} className="text-brand-700 underline">
              показать универсальные
            </Link>
            <Badge variant="outline" className="ml-2">
              ниша: у конкурентов такого сценария нет
            </Badge>
          </p>
        </div>
      )}
    </div>
  );
}
