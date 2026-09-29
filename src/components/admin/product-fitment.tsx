"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { addProductFitmentAction, deleteFitmentAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { CarPicker, type CarTreeBrand } from "@/components/admin/car-picker";
import { AdminField, FormActions } from "@/components/admin/form-fields";
import { ConfirmButton } from "@/components/admin/page-parts";

/**
 * Совместимость в карточке товара: привязка к марке/модели/поколению
 * и список существующих привязок с удалением.
 * Массовая привязка — в разделе «Совместимость».
 */

export type ProductFitment = {
  id: string;
  yearFrom: number | null;
  yearTo: number | null;
  brand: { name: string };
  model: { name: string } | null;
  generation: { name: string; yearFrom: number; yearTo: number | null } | null;
  modification: { name: string } | null;
};

export function ProductFitmentCard({
  productId,
  brands,
  fitments,
}: {
  productId: string;
  brands: CarTreeBrand[];
  fitments: ProductFitment[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(addProductFitmentAction, null);
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok === true;

  // ConfirmButton ожидает действие вида (formData) => Promise<void>.
  const removeFitment = async (formData: FormData): Promise<void> => {
    await deleteFitmentAction(null, formData);
  };

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="productId" value={productId} />
        <div className="space-y-4 px-5 py-5">
          {error && <Alert variant="danger">{error}</Alert>}
          {ok && <Alert variant="success">Привязка добавлена</Alert>}

          <CarPicker brands={brands} required />

          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Год с" htmlFor="fitment-yearFrom" hint="Пусто — возьмём из поколения">
              <input id="fitment-yearFrom" name="yearFrom" type="number" className="g19-input" />
            </AdminField>
            <AdminField label="Год по" htmlFor="fitment-yearTo">
              <input id="fitment-yearTo" name="yearTo" type="number" className="g19-input" />
            </AdminField>
            <AdminField label="Примечание" htmlFor="fitment-note">
              <input id="fitment-note" name="note" placeholder="Только с рейлингами" className="g19-input" />
            </AdminField>
          </div>
        </div>
        <FormActions>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Добавить привязку
          </button>
        </FormActions>
      </form>

      {fitments.length === 0 ? (
        <p className="border-t border-ink-100 px-5 py-6 text-center text-sm text-ink-400">
          Привязок пока нет — товар не подбирается по автомобилю.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {fitments.map((fitment) => (
            <li key={fitment.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-ink-800">
                  {fitment.brand.name}
                  {fitment.model ? ` ${fitment.model.name}` : ""}
                  {fitment.generation ? ` · ${fitment.generation.name}` : ""}
                </p>
                <p className="text-xs text-ink-400">
                  {fitment.yearFrom ?? fitment.generation?.yearFrom ?? "—"}–
                  {fitment.yearTo ?? fitment.generation?.yearTo ?? "…"}
                  {fitment.modification ? ` · ${fitment.modification.name}` : ""}
                </p>
              </div>
              <ConfirmButton
                action={removeFitment}
                id={fitment.id}
                title="Удалить привязку?"
                description="Товар перестанет подходить к этому автомобилю."
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
