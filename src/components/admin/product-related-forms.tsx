"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert, Select } from "@/components/ui";
import { DOCUMENT_TYPES, RELATION_TYPES } from "@/lib/admin/labels";
import {
  changeProductPriceAction,
  deleteProductRelationAction,
  updateProductDocumentsAction,
  updateProductImagesAction,
  updateProductRelationsAction,
} from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { AdminField, FormActions, FormSection, TextareaField } from "@/components/admin/form-fields";
import { ImageUpload } from "@/components/admin/image-upload";
import { ConfirmButton } from "@/components/admin/page-parts";

/**
 * Дополнительные формы карточки товара: изображения, документы, связи.
 * Все — обычные POST-формы в Server Actions, работают без JavaScript.
 */

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if ("error" in state && state.error) return <Alert variant="danger">{state.error}</Alert>;
  if ("ok" in state && state.ok) return <Alert variant="success">Сохранено</Alert>;
  return null;
}

export function ProductImagesForm({
  productId,
  images,
}: {
  productId: string;
  images: { url: string; alt: string | null }[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateProductImagesAction, null);
  void pending;

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={productId} />
      <div className="px-5 py-5">
        <ImageUpload
          name="images"
          filesName="imagesFiles"
          label="Ссылки на изображения"
          defaultValue={images.map((image) => image.url)}
          previews={images}
        />
        <div className="mt-4">
          <Feedback state={state} />
        </div>
      </div>
      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Сохранить изображения
        </button>
      </FormActions>
    </form>
  );
}

export function ProductDocumentsForm({
  productId,
  documents,
}: {
  productId: string;
  documents: { id: string; type: string; title: string; url: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateProductDocumentsAction, null);
  const defaults = documents.map((document) => `${document.type} | ${document.title} | ${document.url}`).join("\n");

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={productId} />
      <FormSection
        title="Документы"
        description="Инструкция, паспорт, сертификат. Формат строки: тип | название | ссылка"
        columns={1}
      >
        <AdminField
          label="Список документов"
          htmlFor="documents"
          hint={`Типы: ${Object.entries(DOCUMENT_TYPES)
            .map(([key, label]) => `${key} — ${label}`)
            .join(", ")}`}
        >
          <textarea
            id="documents"
            name="documents"
            rows={5}
            defaultValue={defaults}
            placeholder={"passport | Паспорт ТСУ | /uploads/documents/passport.pdf\ncertificate | Сертификат | https://…"}
            className="g19-input font-mono text-xs leading-relaxed"
          />
        </AdminField>
        <AdminField label="Загрузить PDF" htmlFor="documentFiles">
          <input
            id="documentFiles"
            type="file"
            name="documentFiles"
            multiple
            accept="application/pdf,image/*"
            className="block w-full cursor-pointer text-xs text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
          />
        </AdminField>
        <Feedback state={state} />
      </FormSection>
      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Сохранить документы
        </button>
      </FormActions>
    </form>
  );
}

export function ProductRelationsForm({
  productId,
  products,
  relations,
}: {
  productId: string;
  products: { id: string; name: string; sku: string | null }[];
  relations: { id: string; type: string; relatedProduct: { id: string; name: string } }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateProductRelationsAction, null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) || (product.sku ?? "").toLowerCase().includes(term),
    );
  }, [products, search]);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={productId} />
        <FormSection title="Добавить связи" description="Аксессуары, аналоги и похожие товары" columns={2}>
          <AdminField label="Поиск товара" htmlFor="relations-search">
            <input
              id="relations-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Название или артикул"
              className="g19-input"
            />
          </AdminField>
          <AdminField label="Тип связи" htmlFor="relationType">
            <Select id="relationType" name="relationType" defaultValue="accessory">
              {Object.entries(RELATION_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </AdminField>
          <AdminField label="Товары" htmlFor="relatedIds" className="sm:col-span-2" hint="Ctrl/Cmd + клик — выбрать несколько">
            <select id="relatedIds" name="relatedIds" multiple size={10} className="g19-input h-56 cursor-pointer">
              {filtered.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.sku ? ` (${product.sku})` : ""}
                </option>
              ))}
            </select>
          </AdminField>
          <div className="sm:col-span-2">
            <Feedback state={state} />
          </div>
        </FormSection>
        <FormActions>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Добавить связь
          </button>
        </FormActions>
      </form>

      {relations.length > 0 && (
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {relations.map((relation) => (
            <li key={relation.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-800">{relation.relatedProduct.name}</p>
                <p className="text-xs text-ink-400">{RELATION_TYPES[relation.type] ?? relation.type}</p>
              </div>
              <ConfirmButton
                action={deleteProductRelationAction}
                id={relation.id}
                idName="relationId"
                hiddenFields={{ productId }}
                title="Удалить связь?"
                description="Товар пропадёт из блока «Аналоги»/«Аксессуары»."
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProductPriceForm({ productId }: { productId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(changeProductPriceAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={productId} />
      <AdminField label="Изменить цену на %" htmlFor="percent" hint="Отрицательное значение — снизить цену">
        <input id="percent" name="percent" inputMode="decimal" placeholder="-10" className="g19-input" />
      </AdminField>
      <Feedback state={state} />
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
      >
        Пересчитать цену
      </button>
    </form>
  );
}
