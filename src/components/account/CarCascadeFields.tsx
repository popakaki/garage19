"use client";

import { useCallback, useEffect, useState } from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { saveCarAction } from "@/lib/actions/account";
import { Alert, Button, Checkbox, Field, Input, Select } from "@/components/ui";

/**
 * Каскадный выбор автомобиля: марка → модель → поколение → модификация.
 * Модели/поколения/модификации подгружаются с `/api/garage/cascade`.
 *
 * Режимы:
 *  • `mode="create"` — форма добавления авто в «Гараж» (состояние ошибок через useActionState);
 *  • `mode="edit"` — обычная форма внутри карточки (Server Action без состояния).
 */

export type CascadeOption = { id: string; name: string; slug?: string; years?: string; engine?: string | null };

export type CarCascadeInitial = {
  brandId?: string;
  modelId?: string;
  generationId?: string;
  modificationId?: string;
  isPrimary?: boolean;
  label?: string;
};

async function fetchOptions(level: string, params: Record<string, string>): Promise<CascadeOption[]> {
  const search = new URLSearchParams({ level, ...params });
  const response = await fetch(`/api/garage/cascade?${search.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("cascade failed");
  const data = (await response.json()) as { items?: CascadeOption[] };
  return data.items ?? [];
}

export function CarCascadeFields({
  brands,
  initial,
  idPrefix,
}: {
  brands: CascadeOption[];
  initial?: CarCascadeInitial;
  idPrefix: string;
}) {
  const [brandId, setBrandId] = useState(initial?.brandId ?? "");
  const [modelId, setModelId] = useState(initial?.modelId ?? "");
  const [generationId, setGenerationId] = useState(initial?.generationId ?? "");
  const [modificationId, setModificationId] = useState(initial?.modificationId ?? "");

  const [models, setModels] = useState<CascadeOption[]>([]);
  const [generations, setGenerations] = useState<CascadeOption[]>([]);
  const [modifications, setModifications] = useState<CascadeOption[]>([]);
  const [loading, setLoading] = useState<"models" | "generations" | "modifications" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (level: "models" | "generations" | "modifications", params: Record<string, string>) => {
      setLoading(level);
      setError(null);
      try {
        const items = await fetchOptions(level, params);
        if (level === "models") setModels(items);
        if (level === "generations") setGenerations(items);
        if (level === "modifications") setModifications(items);
      } catch {
        setError("Не удалось загрузить справочник — попробуйте ещё раз");
      } finally {
        setLoading(null);
      }
    },
    [],
  );

  // Догружаем зависимые списки при редактировании уже сохранённого авто.
  useEffect(() => {
    if (initial?.brandId) void load("models", { brandId: initial.brandId });
    if (initial?.modelId) void load("generations", { modelId: initial.modelId });
    if (initial?.generationId) void load("modifications", { generationId: initial.generationId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onBrandChange = (value: string) => {
    setBrandId(value);
    setModelId("");
    setGenerationId("");
    setModificationId("");
    setGenerations([]);
    setModifications([]);
    if (value) void load("models", { brandId: value });
    else setModels([]);
  };

  const onModelChange = (value: string) => {
    setModelId(value);
    setGenerationId("");
    setModificationId("");
    setModifications([]);
    if (value) void load("generations", { modelId: value });
    else setGenerations([]);
  };

  const onGenerationChange = (value: string) => {
    setGenerationId(value);
    setModificationId("");
    if (value) void load("modifications", { generationId: value });
    else setModifications([]);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {error && (
        <div className="sm:col-span-2">
          <Alert variant="warning">{error}</Alert>
        </div>
      )}

      <Field label="Марка" required htmlFor={`${idPrefix}-brand`}>
        <Select
          id={`${idPrefix}-brand`}
          name="brandId"
          value={brandId}
          onChange={(event) => onBrandChange(event.target.value)}
          required
        >
          <option value="">— выберите марку —</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Модель"
        htmlFor={`${idPrefix}-model`}
        hint={loading === "models" ? "Загружаем модели…" : undefined}
      >
        <Select
          id={`${idPrefix}-model`}
          name="modelId"
          value={modelId}
          onChange={(event) => onModelChange(event.target.value)}
          disabled={!brandId || models.length === 0}
        >
          <option value="">{brandId ? "— уточню позже —" : "сначала выберите марку"}</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
              {model.years ? ` (${model.years})` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Поколение"
        htmlFor={`${idPrefix}-generation`}
        hint={loading === "generations" ? "Загружаем поколения…" : undefined}
      >
        <Select
          id={`${idPrefix}-generation`}
          name="generationId"
          value={generationId}
          onChange={(event) => onGenerationChange(event.target.value)}
          disabled={!modelId || generations.length === 0}
        >
          <option value="">{modelId ? "— не знаю поколение —" : "сначала выберите модель"}</option>
          {generations.map((generation) => (
            <option key={generation.id} value={generation.id}>
              {generation.name}
              {generation.years ? ` · ${generation.years}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Модификация"
        htmlFor={`${idPrefix}-modification`}
        hint={loading === "modifications" ? "Загружаем модификации…" : "Двигатель и мощность"}
      >
        <Select
          id={`${idPrefix}-modification`}
          name="modificationId"
          value={modificationId}
          onChange={(event) => setModificationId(event.target.value)}
          disabled={!generationId || modifications.length === 0}
        >
          <option value="">{generationId ? "— любая модификация —" : "сначала выберите поколение"}</option>
          {modifications.map((modification) => (
            <option key={modification.id} value={modification.id}>
              {modification.name}
              {modification.engine ? ` · ${modification.engine}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Подпись" htmlFor={`${idPrefix}-label`} hint="Например: «Моя Camry»" className="sm:col-span-2">
        <Input id={`${idPrefix}-label`} name="label" defaultValue={initial?.label ?? ""} placeholder="Моя машина" />
      </Field>

      <div className="sm:col-span-2">
        <Checkbox name="isPrimary" defaultChecked={initial?.isPrimary} label="Сделать основной машиной в гараже" />
      </div>
    </div>
  );
}

/** Форма добавления автомобиля: показывает ошибки сервера без перезагрузки. */
export function AddCarForm({ brands }: { brands: CascadeOption[] }) {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(saveCarAction, {}, pathname);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      {!open && (
        <Button type="button" onClick={() => setOpen(true)}>
          Добавить автомобиль
        </Button>
      )}

      {open && (
        <form action={formAction} className="space-y-3">
          {state?.error && <Alert variant="danger">{state.error}</Alert>}
          {state?.success && <Alert variant="success">{state.success}</Alert>}

          <input type="hidden" name="id" value="" />
          <CarCascadeFields brands={brands} idPrefix="add-car" />

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Сохраняем…" : "Сохранить в гараж"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
