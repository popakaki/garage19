"use client";

import { useActionState } from "react";
import { Alert, Select } from "@/components/ui";
import {
  createBrandAction,
  createGenerationAction,
  createModelAction,
  createModificationAction,
  updateBrandAction,
  updateGenerationAction,
  updateModelAction,
  updateModificationAction,
} from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { CheckboxField, FormActions, FormSection, TextField } from "@/components/admin/form-fields";

/**
 * Формы справочника автомобилей: марка, модель, поколение, модификация.
 * Поколения вводятся вручную с годами выпуска — это конкурентное
 * преимущество проекта, поэтому годы обязательны.
 */

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if ("error" in state && state.error) return <Alert variant="danger">{state.error}</Alert>;
  if ("ok" in state && state.ok) return <Alert variant="success">Сохранено</Alert>;
  return null;
}

export type BrandDefaults = {
  id?: string;
  name?: string;
  slug?: string;
  logo?: string;
  country?: string;
  popular?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

export function BrandForm({ mode, defaults }: { mode: "create" | "edit"; defaults: BrandDefaults }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    mode === "create" ? createBrandAction : updateBrandAction,
    null,
  );

  return (
    <form action={formAction} encType="multipart/form-data">
      {mode === "edit" && defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <div className="px-5 py-5">
        <Feedback state={state} />
      </div>
      <FormSection title="Марка автомобиля">
        <TextField label="Название" name="name" defaultValue={defaults.name} required />
        <TextField label="Slug" name="slug" defaultValue={defaults.slug} hint="Пусто — из названия" />
        <TextField label="Страна" name="country" defaultValue={defaults.country} />
        <TextField label="Логотип (URL)" name="logo" defaultValue={defaults.logo} />
        <div>
          <label className="g19-label" htmlFor={`logoFile-${mode}`}>
            Загрузить логотип
          </label>
          <input
            id={`logoFile-${mode}`}
            type="file"
            name="logoFile"
            accept="image/*"
            className="block w-full cursor-pointer text-xs text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
          />
        </div>
        <TextField label="Порядок сортировки" name="sortOrder" type="number" defaultValue={String(defaults.sortOrder ?? 100)} />
        <CheckboxField label="Популярная марка" name="popular" defaultChecked={defaults.popular ?? false} />
        <CheckboxField label="Активна" name="isActive" defaultChecked={defaults.isActive ?? true} />
      </FormSection>
      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {mode === "create" ? "Добавить марку" : "Сохранить марку"}
        </button>
      </FormActions>
    </form>
  );
}

export type ModelDefaults = {
  id?: string;
  brandId?: string;
  name?: string;
  slug?: string;
  bodyType?: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

export function ModelForm({ mode, defaults }: { mode: "create" | "edit"; defaults: ModelDefaults }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    mode === "create" ? createModelAction : updateModelAction,
    null,
  );

  return (
    <form action={formAction}>
      {mode === "edit" && defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {mode === "create" && defaults.brandId && <input type="hidden" name="brandId" value={defaults.brandId} />}
      <div className="px-5 py-5">
        <Feedback state={state} />
      </div>
      <FormSection title="Модель">
        <TextField label="Название" name="name" defaultValue={defaults.name} required />
        <TextField label="Slug" name="slug" defaultValue={defaults.slug} />
        <TextField label="Тип кузова" name="bodyType" defaultValue={defaults.bodyType} placeholder="SUV, универсал" />
        <TextField label="Год с" name="yearFrom" type="number" defaultValue={defaults.yearFrom ?? ""} />
        <TextField label="Год по" name="yearTo" type="number" defaultValue={defaults.yearTo ?? ""} />
        <TextField label="Порядок" name="sortOrder" type="number" defaultValue={String(defaults.sortOrder ?? 100)} />
        <CheckboxField label="Активна" name="isActive" defaultChecked={defaults.isActive ?? true} />
      </FormSection>
      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {mode === "create" ? "Добавить модель" : "Сохранить модель"}
        </button>
      </FormActions>
    </form>
  );
}

export type GenerationDefaults = {
  id?: string;
  modelId?: string;
  name?: string;
  slug?: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  bodyType?: string;
  imageUrl?: string;
  note?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export function GenerationForm({ mode, defaults }: { mode: "create" | "edit"; defaults: GenerationDefaults }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    mode === "create" ? createGenerationAction : updateGenerationAction,
    null,
  );

  return (
    <form action={formAction}>
      {mode === "edit" && defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {mode === "create" && defaults.modelId && <input type="hidden" name="modelId" value={defaults.modelId} />}
      <div className="px-5 py-5">
        <Feedback state={state} />
      </div>
      <FormSection title="Поколение" description="Годы выпуска обязательны — по ним строится подбор">
        <TextField label="Название" name="name" defaultValue={defaults.name} required placeholder="XV70, рестайлинг" />
        <TextField label="Slug" name="slug" defaultValue={defaults.slug} />
        <TextField label="Год с" name="yearFrom" type="number" defaultValue={defaults.yearFrom ?? ""} required />
        <TextField label="Год по" name="yearTo" type="number" defaultValue={defaults.yearTo ?? ""} hint="Пусто — выпускается до сих пор" />
        <TextField label="Тип кузова" name="bodyType" defaultValue={defaults.bodyType} />
        <TextField label="Изображение (URL)" name="imageUrl" defaultValue={defaults.imageUrl} />
        <TextField label="Примечание" name="note" defaultValue={defaults.note} wrapperClassName="sm:col-span-2" />
        <TextField label="Порядок" name="sortOrder" type="number" defaultValue={String(defaults.sortOrder ?? 100)} />
        <CheckboxField label="Активно" name="isActive" defaultChecked={defaults.isActive ?? true} />
      </FormSection>
      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {mode === "create" ? "Добавить поколение" : "Сохранить поколение"}
        </button>
      </FormActions>
    </form>
  );
}

export type ModificationDefaults = {
  id?: string;
  generationId?: string;
  name?: string;
  engine?: string;
  volume?: number | null;
  power?: number | null;
  fuel?: string;
  drive?: string;
  transmission?: string;
  bodyType?: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

export function ModificationForm({ mode, defaults }: { mode: "create" | "edit"; defaults: ModificationDefaults }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    mode === "create" ? createModificationAction : updateModificationAction,
    null,
  );

  return (
    <form action={formAction}>
      {mode === "edit" && defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {mode === "create" && defaults.generationId && (
        <input type="hidden" name="generationId" value={defaults.generationId} />
      )}
      <div className="px-5 py-5">
        <Feedback state={state} />
      </div>
      <FormSection title="Модификация">
        <TextField label="Название" name="name" defaultValue={defaults.name} required placeholder="2.5 AT (209 л.с.)" />
        <TextField label="Двигатель" name="engine" defaultValue={defaults.engine} />
        <TextField label="Объём, л" name="volume" type="number" step="0.1" defaultValue={defaults.volume ?? ""} />
        <TextField label="Мощность, л.с." name="power" type="number" defaultValue={defaults.power ?? ""} />
        <div>
          <label className="g19-label" htmlFor={`fuel-${mode}-${defaults.id ?? "new"}`}>
            Топливо
          </label>
          <Select id={`fuel-${mode}-${defaults.id ?? "new"}`} name="fuel" defaultValue={defaults.fuel ?? ""}>
            <option value="">— не указано —</option>
            <option value="бензин">Бензин</option>
            <option value="дизель">Дизель</option>
            <option value="гибрид">Гибрид</option>
            <option value="электро">Электро</option>
            <option value="газ">Газ</option>
          </Select>
        </div>
        <div>
          <label className="g19-label" htmlFor={`drive-${mode}-${defaults.id ?? "new"}`}>
            Привод
          </label>
          <Select id={`drive-${mode}-${defaults.id ?? "new"}`} name="drive" defaultValue={defaults.drive ?? ""}>
            <option value="">— не указано —</option>
            <option value="передний">Передний</option>
            <option value="задний">Задний</option>
            <option value="полный">Полный</option>
          </Select>
        </div>
        <div>
          <label className="g19-label" htmlFor={`transmission-${mode}-${defaults.id ?? "new"}`}>
            КПП
          </label>
          <Select
            id={`transmission-${mode}-${defaults.id ?? "new"}`}
            name="transmission"
            defaultValue={defaults.transmission ?? ""}
          >
            <option value="">— не указано —</option>
            <option value="МКПП">МКПП</option>
            <option value="АКПП">АКПП</option>
            <option value="вариатор">Вариатор</option>
            <option value="робот">Робот</option>
          </Select>
        </div>
        <TextField label="Тип кузова" name="bodyType" defaultValue={defaults.bodyType} />
        <TextField label="Год с" name="yearFrom" type="number" defaultValue={defaults.yearFrom ?? ""} />
        <TextField label="Год по" name="yearTo" type="number" defaultValue={defaults.yearTo ?? ""} />
        <TextField label="Порядок" name="sortOrder" type="number" defaultValue={String(defaults.sortOrder ?? 100)} />
        <CheckboxField label="Активна" name="isActive" defaultChecked={defaults.isActive ?? true} />
      </FormSection>
      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {mode === "create" ? "Добавить модификацию" : "Сохранить модификацию"}
        </button>
      </FormActions>
    </form>
  );
}
