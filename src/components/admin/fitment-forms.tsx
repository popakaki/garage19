"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui";
import { CarPicker, type CarTreeBrand } from "@/components/admin/car-picker";
import { AdminField, FormSection } from "@/components/admin/form-fields";

/**
 * Выбор товаров чекбоксами с поиском по названию/артикулу.
 * Список ограничен выборкой страницы — для больших каталогов используйте
 * поиск и фильтры.
 */

export type FitmentProduct = {
  id: string;
  name: string;
  sku: string | null;
  fitmentType: string;
};

export function ProductCheckboxList({
  products,
  emptyText = "Товары не найдены",
}: {
  products: FitmentProduct[];
  emptyText?: string;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) || (product.sku ?? "").toLowerCase().includes(term),
    );
  }, [products, search]);

  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleAll = () => {
    setSelected((current) => (current.length === filtered.length ? [] : filtered.map((product) => product.id)));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <label className="g19-label" htmlFor="product-search">
            Поиск товара
          </label>
          <input
            id="product-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Название или артикул"
            className="g19-input"
          />
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
        >
          {selected.length === filtered.length && filtered.length > 0 ? "Снять все" : "Выбрать все"}
        </button>
        <span className="text-xs text-ink-500">
          Выбрано: <span className="font-semibold text-ink-800">{selected.length}</span> из {filtered.length}
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-xl border border-ink-200 bg-white">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-400">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {filtered.map((product) => (
              <li key={product.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-ink-50/60">
                  <input
                    type="checkbox"
                    name="productIds"
                    value={product.id}
                    checked={selected.includes(product.id)}
                    onChange={() => toggle(product.id)}
                    className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink-800">{product.name}</span>
                    <span className="block text-xs text-ink-400">
                      {product.sku ? `Арт. ${product.sku}` : "без артикула"}
                      {product.fitmentType === "universal" ? " · универсальный" : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected.length === 0 && (
        <p className="text-xs text-ink-400">
          Отметьте товары галочками — они уйдут в форму вместе с выбранным автомобилем.
        </p>
      )}
    </div>
  );
}

/** Форма массовой привязки: товары × автомобиль. */
export function MassFitmentForm({
  brands,
  products,
  action,
  submitLabel = "Привязать товары к авто",
}: {
  brands: CarTreeBrand[];
  products: FitmentProduct[];
  action: (formData: FormData) => Promise<void>;
  submitLabel?: string;
}) {
  return (
    <form action={action}>
      <FormSection title="1. Выберите автомобиль" columns={1}>
        <CarPicker brands={brands} required />
        <p className="text-xs text-ink-400">
          Если оставить модель/поколение пустыми, товар будет подходить ко всем автомобилям марки. Годы можно
          уточнить вручную.
        </p>
      </FormSection>

      <FormSection title="2. Уточните годы и примечание" columns={2}>
        <AdminField label="Год с" htmlFor="mass-yearFrom" hint="Пусто — возьмём из поколения">
          <input id="mass-yearFrom" name="yearFrom" type="number" className="g19-input" />
        </AdminField>
        <AdminField label="Год по" htmlFor="mass-yearTo">
          <input id="mass-yearTo" name="yearTo" type="number" className="g19-input" />
        </AdminField>
          <AdminField label="Примечание" htmlFor="mass-note">
            <input id="mass-note" name="note" placeholder="Только для версий с рейлингами" className="g19-input" />
          </AdminField>
      </FormSection>

      <FormSection title="3. Выберите товары" columns={1}>
        <ProductCheckboxList products={products} />
      </FormSection>

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {submitLabel}
        </button>
        <span className="text-xs text-ink-400">Привязки-дубликаты пропускаются автоматически.</span>
      </div>
    </form>
  );
}

/** Форма удаления привязок по фильтру (товары × авто). */
export function DeleteFitmentsForm({
  brands,
  products,
  action,
}: {
  brands: CarTreeBrand[];
  products: FitmentProduct[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action}>
      <FormSection title="Удаление привязок" columns={1} description="Задайте фильтр — будут удалены все подходящие привязки">
        <CarPicker brands={brands} namePrefix="delete_" />
        <ProductCheckboxList products={products} emptyText="Товары для удаления не выбраны" />
        <Alert variant="warning">
          Если не отметить ни одного товара, удалятся все привязки выбранной марки (модели, поколения) — с фильтром по
          авто.
        </Alert>
      </FormSection>
      <div className="flex flex-wrap items-center gap-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
        >
          Удалить привязки по фильтру
        </button>
      </div>
    </form>
  );
}
