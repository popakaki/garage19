import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { AttributeFilterCheckbox, FilterCheckbox, PriceRangeFilter } from "@/components/catalog/filter-controls";
import type { CatalogQueryState, RawSearchParams } from "@/components/catalog/catalog-params";
import { paramValues } from "@/components/catalog/param-utils";
import type { Facets } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";

/**
 * Сайдбар фильтров листинга: чекбоксы со счётчиками, диапазон цены,
 * «в наличии», кнопка сброса. Серверный компонент: каждый фильтр — ссылка
 * или клиентский контрол, поэтому всё работает и без JavaScript.
 */
export function CatalogFilterSidebar({
  basePath,
  params,
  state,
  facets,
  totals,
  total,
}: {
  basePath: string;
  params: RawSearchParams;
  state: CatalogQueryState;
  /** Фасеты без фасетных сужений — что вообще доступно в категории (со счётчиками). */
  facets: Facets;
  /** Фасеты по текущим фильтрам — для точных значений «в наличии» и диапазона цены. */
  totals?: Facets;
  total: number;
}) {
  const availability = totals ?? facets;
  const group = (title: string, content: React.ReactNode, hint?: string) => (
    <section key={title} className="border-b border-ink-100 pb-4 last:border-b-0 last:pb-0">
      <h3 className="mb-2 text-sm font-semibold text-ink-900">{title}</h3>
      {hint && <p className="mb-2 text-xs text-ink-400">{hint}</p>}
      {content}
    </section>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="g19-card p-4">
        <p className="text-sm text-ink-500">
          Найдено <strong className="text-ink-900">{total}</strong> товаров
        </p>
        <Link
          href={basePath}
          scroll={false}
          className="mt-1 inline-block text-xs font-medium text-brand-700 underline hover:text-brand-800"
        >
          Сбросить все фильтры
        </Link>
      </div>

      <div className="g19-card flex flex-col gap-4 p-4">
        {group(
          "Цена, ₽",
          <PriceRangeFilter basePath={basePath} />,
          availability.priceMin || availability.priceMax
            ? `В продаже от ${formatPrice(availability.priceMin)} до ${formatPrice(availability.priceMax)}`
            : undefined,
        )}

        {group(
          "Наличие и бейджи",
          <>
            <FilterCheckbox
              basePath={basePath}
              param="stock"
              label="Только в наличии"
              count={availability.inStockCount}
              checked={state.inStock}
            />
            <FilterCheckbox basePath={basePath} param="new" label="Новинки" checked={state.isNew} />
            <FilterCheckbox basePath={basePath} param="hit" label="Хиты продаж" checked={state.isHit} />
            <FilterCheckbox
              basePath={basePath}
              param="lock"
              label="С замком (антивандальные)"
              checked={state.lock}
            />
          </>,
          "Фасеты «замок» и «в наличии» конкуренты почти не используют",
        )}

        {facets.manufacturers.length > 0 &&
          group(
            "Производитель",
            <div className="flex max-h-64 flex-col overflow-y-auto pr-1">
              {facets.manufacturers.map((manufacturer) => (
                <FilterCheckbox
                  key={manufacturer.slug}
                  basePath={basePath}
                  param="z"
                  value={manufacturer.slug}
                  label={manufacturer.name}
                  count={manufacturer.count}
                  checked={state.manufacturers.includes(manufacturer.slug)}
                />
              ))}
            </div>,
          )}

        {facets.mountPlaces.length > 0 &&
          group(
            "Место установки",
            <>
              {facets.mountPlaces.map((option) => (
                <FilterCheckbox
                  key={option.value}
                  basePath={basePath}
                  param="place"
                  value={option.value}
                  label={option.value}
                  count={option.count}
                  checked={state.mountPlaces.includes(option.value)}
                />
              ))}
            </>,
          )}

        {facets.materials.length > 0 &&
          group(
            "Материал",
            <>
              {facets.materials.map((option) => (
                <FilterCheckbox
                  key={option.value}
                  basePath={basePath}
                  param="material"
                  value={option.value}
                  label={option.value}
                  count={option.count}
                  checked={state.materials.includes(option.value)}
                />
              ))}
            </>,
          )}

        {facets.capacities.length > 0 &&
          group(
            "Грузоподъёмность / нагрузка",
            <>
              {facets.capacities.map((bucket) => {
                const value = `${bucket.min ?? ""}-${bucket.max ?? ""}`;
                return (
                  <FilterCheckbox
                    key={bucket.label}
                    basePath={basePath}
                    param="capacity"
                    value={value}
                    label={bucket.label}
                    count={bucket.count}
                    checked={
                      paramValues(params, "capacity").includes(value) ||
                      (state.capacityMin === bucket.min && state.capacityMax === bucket.max)
                    }
                  />
                );
              })}
            </>,
          )}

        {facets.volumes.length > 0 &&
          group(
            "Объём, л",
            <>
              {facets.volumes.map((bucket) => {
                const value = `${bucket.min ?? ""}-${bucket.max ?? ""}`;
                return (
                  <FilterCheckbox
                    key={bucket.label}
                    basePath={basePath}
                    param="volume"
                    value={value}
                    label={bucket.label}
                    count={bucket.count}
                    checked={
                      paramValues(params, "volume").includes(value) ||
                      (state.volumeMin === bucket.min && state.volumeMax === bucket.max)
                    }
                  />
                );
              })}
            </>,
          )}

        {group(
          "Особенности",
          <>
            <FilterCheckbox
              basePath={basePath}
              param="electric"
              label="Электрика в комплекте (ТСУ)"
              checked={state.electric}
            />
            <FilterCheckbox
              basePath={basePath}
              param="bumper"
              label="Без выреза бампера"
              checked={state.bumper}
            />
          </>,
        )}

        {facets.attributes.map((attribute) =>
          group(
            attribute.name,
            <>
              {attribute.values.slice(0, 12).map((option) => (
                <AttributeFilterCheckbox
                  key={option.value}
                  basePath={basePath}
                  slug={attribute.slug}
                  value={option.value}
                  count={option.count}
                  checked={state.attributes.some(
                    (item) => item.slug === attribute.slug && item.value === option.value,
                  )}
                />
              ))}
            </>,
          ),
        )}
      </div>

      <div className="g19-card p-4">
        <p className="text-sm font-semibold text-ink-900">Не нашли нужное?</p>
        <p className="mt-1 text-xs text-ink-500">
          Поможем подобрать по VIN и подскажем, что подойдёт без модельного комплекта.
        </p>
        <ButtonLink href="/podbor" variant="outline" size="sm" className="mt-3 w-full">
          Подбор по автомобилю
        </ButtonLink>
      </div>
    </div>
  );
}
