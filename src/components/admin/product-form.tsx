"use client";

import { useActionState, useState } from "react";
import { Alert, Select, Textarea } from "@/components/ui";
import { ATTRIBUTE_TYPES, FITMENT_TYPES } from "@/lib/constants";
import { createProductAction, updateProductAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import {
  AdminField,
  CheckboxField,
  FormActions,
  FormSection,
  PriceField,
  TextField,
} from "@/components/admin/form-fields";
import { ImageUpload } from "@/components/admin/image-upload";

/**
 * Форма товара: покрывает все поля модели Product, включая фасетные
 * характеристики, SEO, поставщика и изображения.
 * Категория меняется с автоотправкой формы — от неё зависит набор
 * характеристик (ProductAttribute).
 */

export type ProductFormOption = { value: string; label: string };

export type ProductFormAttribute = {
  id: string;
  name: string;
  type: string;
  unit: string | null;
  options: string[] | null;
  isRequired: boolean;
  group: string | null;
  value: string;
};

export type ProductFormDefaults = {
  id?: string;
  name?: string;
  slug?: string;
  sku?: string;
  categoryId?: string;
  manufacturerId?: string;
  brandName?: string;
  shortDescription?: string;
  description?: string;
  warrantyMonths?: string | number | null;
  price?: string | number | null;
  oldPrice?: string | number | null;
  purchasePrice?: string | number | null;
  stock?: string | number | null;
  reserved?: string | number | null;
  unit?: string;
  weight?: string | number | null;
  lengthMm?: string | number | null;
  widthMm?: string | number | null;
  heightMm?: string | number | null;
  fitmentType?: string;
  fitmentNote?: string;
  capacityKg?: string | number | null;
  verticalLoadKg?: string | number | null;
  volumeL?: string | number | null;
  material?: string;
  mountPlace?: string;
  profile?: string;
  doorsCount?: string | number | null;
  lockIncluded?: boolean;
  bumperCut?: boolean;
  electricIncluded?: boolean;
  rentAvailable?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  isHit?: boolean;
  isNew?: boolean;
  sortOrder?: string | number | null;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  supplierId?: string;
  externalId?: string;
  images?: string[];
};

/** Материалы и места установки — подсказки из схемы (значения хранятся строками). */
const MATERIAL_HINTS = ["алюминий", "сталь", "ABS-пластик", "композит"];
const MOUNT_HINTS = ["рейлинги", "штатные места", "гладкая крыша", "фаркоп", "задняя дверь", "водосточный желоб"];
const PROFILE_HINTS = ["WingBar", "прямоугольный", "аэродинамический"];

function value(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function ProductForm({
  mode,
  defaults,
  categoryOptions,
  brandOptions,
  supplierOptions,
  attributeDefs,
  attributeValues,
  cancelHref,
}: {
  mode: "create" | "edit";
  defaults: ProductFormDefaults;
  categoryOptions: ProductFormOption[];
  brandOptions: ProductFormOption[];
  supplierOptions: ProductFormOption[];
  attributeDefs: { id: string; name: string; type: string; unit: string | null; options: string[] | null; isRequired: boolean; group: string | null }[];
  attributeValues: Record<string, string>;
  cancelHref: string;
}) {
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const [categoryId, setCategoryId] = useState(defaults.categoryId ?? "");
  const error = state && "error" in state ? state.error : undefined;

  const attributes: ProductFormAttribute[] = attributeDefs.map((attribute) => ({
    ...attribute,
    value: attributeValues[attribute.id] ?? "",
  }));

  const hasUploads = true;

  return (
    <form action={formAction} encType={hasUploads ? "multipart/form-data" : undefined}>
      {mode === "edit" && defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="g19-card mb-4 overflow-hidden">
        <FormSection title="Основное" description="Название, адрес страницы, артикул и категория">
          <TextField label="Название" name="name" defaultValue={defaults.name} required wrapperClassName="sm:col-span-2" />
          <TextField
            label="Slug (URL)"
            name="slug"
            defaultValue={defaults.slug}
            hint="Пусто — сгенерируем из названия автоматически"
          />
          <TextField label="Артикул (SKU)" name="sku" defaultValue={defaults.sku} hint="Должен быть уникальным" />
          <AdminField label="Категория" required htmlFor="categoryId">
            <Select
              id="categoryId"
              name="categoryId"
              value={categoryId}
              required
              onChange={(event) => {
                setCategoryId(event.target.value);
                event.currentTarget.form?.requestSubmit();
              }}
            >
              <option value="">— выберите категорию —</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </AdminField>
          <AdminField label="Производитель (справочник)" htmlFor="manufacturerId" hint="Марка авто из справочника, если применимо">
            <Select id="manufacturerId" name="manufacturerId" defaultValue={defaults.manufacturerId ?? ""}>
              <option value="">— не указан —</option>
              {brandOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </AdminField>
          <TextField
            label="Бренд (текстом)"
            name="brandName"
            defaultValue={defaults.brandName}
            hint="Thule, Atera, Menabo, LUX…"
          />
          <TextField
            label="Единица измерения"
            name="unit"
            defaultValue={defaults.unit ?? "шт"}
            placeholder="шт"
          />
          <TextField
            label="Порядок сортировки"
            name="sortOrder"
            type="number"
            defaultValue={value(defaults.sortOrder ?? 100)}
          />
        </FormSection>

        <FormSection title="Цены и наличие" description="Цены в рублях — сохраняются в копейках">
          <PriceField label="Цена, ₽" name="price" value={value(defaults.price)} required />
          <PriceField label="Старая цена, ₽" name="oldPrice" value={value(defaults.oldPrice)} hint="Для отображения скидки" />
          <PriceField label="Закупочная цена, ₽" name="purchasePrice" value={value(defaults.purchasePrice)} />
          <TextField label="Остаток" name="stock" type="number" defaultValue={value(defaults.stock ?? 0)} />
          <TextField label="В резерве" name="reserved" type="number" defaultValue={value(defaults.reserved ?? 0)} />
          <TextField
            label="Гарантия, мес."
            name="warrantyMonths"
            type="number"
            defaultValue={value(defaults.warrantyMonths)}
          />
        </FormSection>

        <FormSection title="Вес и габариты" description="Вес в граммах, габариты в миллиметрах">
          <TextField label="Вес, г" name="weight" type="number" defaultValue={value(defaults.weight)} />
          <TextField label="Длина, мм" name="lengthMm" type="number" defaultValue={value(defaults.lengthMm)} />
          <TextField label="Ширина, мм" name="widthMm" type="number" defaultValue={value(defaults.widthMm)} />
          <TextField label="Высота, мм" name="heightMm" type="number" defaultValue={value(defaults.heightMm)} />
        </FormSection>

        <FormSection
          title="Совместимость и характеристики"
          description="Фасетные поля используются фильтром каталога и сравнением товаров"
          columns={3}
        >
          <AdminField label="Тип совместимости" htmlFor="fitmentType">
            <Select id="fitmentType" name="fitmentType" defaultValue={defaults.fitmentType ?? "specific"}>
              {Object.entries(FITMENT_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </AdminField>
          <TextField
            label="Примечание по совместимости"
            name="fitmentNote"
            defaultValue={defaults.fitmentNote}
            hint="Например: только для моделей с рейлингами"
          />
          <TextField
            label="Грузоподъёмность, кг"
            name="capacityKg"
            type="number"
            defaultValue={value(defaults.capacityKg)}
          />
          <TextField
            label="Вертикальная нагрузка, кг"
            name="verticalLoadKg"
            type="number"
            defaultValue={value(defaults.verticalLoadKg)}
            hint="Для фаркопов (ТСУ)"
          />
          <TextField label="Объём, л" name="volumeL" type="number" defaultValue={value(defaults.volumeL)} hint="Для автобоксов" />
          <TextField
            label="Материал"
            name="material"
            defaultValue={defaults.material}
            list="material-hints"
            hint={MATERIAL_HINTS.join(", ")}
          />
          <datalist id="material-hints">
            {MATERIAL_HINTS.map((hint) => (
              <option key={hint} value={hint} />
            ))}
          </datalist>
          <TextField
            label="Место установки"
            name="mountPlace"
            defaultValue={defaults.mountPlace}
            list="mount-hints"
            hint={MOUNT_HINTS.join(", ")}
          />
          <datalist id="mount-hints">
            {MOUNT_HINTS.map((hint) => (
              <option key={hint} value={hint} />
            ))}
          </datalist>
          <TextField label="Профиль" name="profile" defaultValue={defaults.profile} list="profile-hints" hint={PROFILE_HINTS.join(", ")} />
          <datalist id="profile-hints">
            {PROFILE_HINTS.map((hint) => (
              <option key={hint} value={hint} />
            ))}
          </datalist>
          <TextField label="Количество дверей" name="doorsCount" type="number" defaultValue={value(defaults.doorsCount)} />
        </FormSection>

        <FormSection title="Комплектация и бейджи" columns={3}>
          <CheckboxField label="Замок в комплекте" name="lockIncluded" defaultChecked={defaults.lockIncluded ?? false} />
          <CheckboxField label="Требуется вырез бампера" name="bumperCut" defaultChecked={defaults.bumperCut ?? false} />
          <CheckboxField label="Электрика в комплекте" name="electricIncluded" defaultChecked={defaults.electricIncluded ?? false} />
          <CheckboxField label="Доступна аренда" name="rentAvailable" defaultChecked={defaults.rentAvailable ?? false} />
          <CheckboxField label="Показывать на сайте" name="isActive" defaultChecked={defaults.isActive ?? true} />
          <CheckboxField label="Рекомендуемый (Featured)" name="isFeatured" defaultChecked={defaults.isFeatured ?? false} />
          <CheckboxField label="Хит продаж" name="isHit" defaultChecked={defaults.isHit ?? false} />
          <CheckboxField label="Новинка" name="isNew" defaultChecked={defaults.isNew ?? false} />
        </FormSection>

        <FormSection title="Описания" columns={1}>
          <TextField label="Краткое описание" name="shortDescription" defaultValue={defaults.shortDescription} />
          <AdminField label="Полное описание" htmlFor="description" hint="Поддерживается HTML">
            <Textarea id="description" name="description" rows={8} defaultValue={defaults.description} />
          </AdminField>
        </FormSection>

        <FormSection title="Изображения">
          <div className="sm:col-span-2">
            <ImageUpload
              name="images"
              filesName="imagesFiles"
              label="Ссылки на изображения"
              defaultValue={defaults.images ?? []}
            />
          </div>
        </FormSection>

        <FormSection title="SEO" columns={1}>
          <TextField label="SEO Title" name="seoTitle" defaultValue={defaults.seoTitle} />
          <AdminField label="SEO Description" htmlFor="seoDescription">
            <Textarea id="seoDescription" name="seoDescription" rows={2} defaultValue={defaults.seoDescription} />
          </AdminField>
          <TextField label="SEO Keywords" name="seoKeywords" defaultValue={defaults.seoKeywords} />
        </FormSection>

        <FormSection title="Закупка" description="Поставщик и внешний идентификатор для импорта прайсов">
          <AdminField label="Поставщик" htmlFor="supplierId">
            <Select id="supplierId" name="supplierId" defaultValue={defaults.supplierId ?? ""}>
              <option value="">— не указан —</option>
              {supplierOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </AdminField>
          <TextField label="ID у поставщика (externalId)" name="externalId" defaultValue={defaults.externalId} />
        </FormSection>

        {attributes.length > 0 && (
          <FormSection
            title="Характеристики категории"
            description="Значения попадают в фасетный фильтр каталога"
            columns={2}
          >
            {attributes.map((attribute) => {
              const inputId = `attr_${attribute.id}`;
              const label = attribute.unit ? `${attribute.name}, ${attribute.unit}` : attribute.name;
              if (attribute.type === "select") {
                return (
                  <AdminField
                    key={attribute.id}
                    label={label}
                    required={attribute.isRequired}
                    htmlFor={inputId}
                    hint={attribute.group ?? undefined}
                  >
                    <Select id={inputId} name={inputId} defaultValue={attribute.value}>
                      <option value="">— не указано —</option>
                      {(attribute.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  </AdminField>
                );
              }
              if (attribute.type === "bool") {
                return (
                  <AdminField key={attribute.id} label={label} htmlFor={inputId} hint={attribute.group ?? undefined}>
                    <Select id={inputId} name={inputId} defaultValue={attribute.value}>
                      <option value="">— не указано —</option>
                      <option value="true">Да</option>
                      <option value="false">Нет</option>
                    </Select>
                  </AdminField>
                );
              }
              return (
                <TextField
                  key={attribute.id}
                  label={label}
                  name={inputId}
                  id={inputId}
                  type={attribute.type === "number" ? "number" : "text"}
                  defaultValue={attribute.value}
                  required={attribute.isRequired}
                  hint={`${ATTRIBUTE_TYPES[attribute.type as keyof typeof ATTRIBUTE_TYPES] ?? attribute.type}${attribute.group ? ` · ${attribute.group}` : ""}`}
                />
              );
            })}
          </FormSection>
        )}
      </div>

      <FormActions>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : mode === "create" ? "Создать товар" : "Сохранить товар"}
        </button>
        <a
          href={cancelHref}
          className="inline-flex items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
        >
          Отмена
        </a>
        {mode === "edit" && (
          <span className="text-xs text-ink-400">
            Изображения, документы, характеристики и связи сохраняются этой же кнопкой.
          </span>
        )}
      </FormActions>
    </form>
  );
}
