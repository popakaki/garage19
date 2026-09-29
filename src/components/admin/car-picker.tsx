"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/ui";

/**
 * Каскадный выбор автомобиля: марка → модель → поколение → модификация.
 * Данные приходят готовым деревом (страницы админки отдают компактный список),
 * переключение уровней происходит на клиенте — без дополнительных запросов.
 */

export type CarTreeModification = { id: string; name: string; yearFrom?: number | null; yearTo?: number | null };
export type CarTreeGeneration = {
  id: string;
  name: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  modifications: CarTreeModification[];
};
export type CarTreeModel = { id: string; name: string; generations: CarTreeGeneration[] };
export type CarTreeBrand = { id: string; name: string; models: CarTreeModel[] };

function yearLabel(yearFrom?: number | null, yearTo?: number | null): string {
  if (yearFrom && yearTo) return `${yearFrom}–${yearTo}`;
  if (yearFrom) return `с ${yearFrom}`;
  if (yearTo) return `до ${yearTo}`;
  return "";
}

export function CarPicker({
  brands,
  defaultBrandId = "",
  defaultModelId = "",
  defaultGenerationId = "",
  defaultModificationId = "",
  required,
  namePrefix = "",
}: {
  brands: CarTreeBrand[];
  defaultBrandId?: string;
  defaultModelId?: string;
  defaultGenerationId?: string;
  defaultModificationId?: string;
  required?: boolean;
  namePrefix?: string;
}) {
  const [brandId, setBrandId] = useState(defaultBrandId);
  const [modelId, setModelId] = useState(defaultModelId);
  const [generationId, setGenerationId] = useState(defaultGenerationId);

  const models = useMemo(() => brands.find((brand) => brand.id === brandId)?.models ?? [], [brands, brandId]);
  const generations = useMemo(
    () => models.find((model) => model.id === modelId)?.generations ?? [],
    [models, modelId],
  );
  const modifications = useMemo(
    () => generations.find((generation) => generation.id === generationId)?.modifications ?? [],
    [generations, generationId],
  );

  const name = (suffix: string) => `${namePrefix}${suffix}`;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div>
        <label className="g19-label" htmlFor={name("brandId")}>
          Марка {required && <span className="text-danger-500">*</span>}
        </label>
        <Select
          id={name("brandId")}
          name={name("brandId")}
          value={brandId}
          required={required}
          onChange={(event) => {
            setBrandId(event.target.value);
            setModelId("");
            setGenerationId("");
          }}
        >
          <option value="">— выберите марку —</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="g19-label" htmlFor={name("modelId")}>
          Модель
        </label>
        <Select
          id={name("modelId")}
          name={name("modelId")}
          value={modelId}
          disabled={models.length === 0}
          onChange={(event) => {
            setModelId(event.target.value);
            setGenerationId("");
          }}
        >
          <option value="">— все модели —</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="g19-label" htmlFor={name("generationId")}>
          Поколение
        </label>
        <Select
          id={name("generationId")}
          name={name("generationId")}
          value={generationId}
          disabled={generations.length === 0}
          onChange={(event) => setGenerationId(event.target.value)}
        >
          <option value="">— все поколения —</option>
          {generations.map((generation) => (
            <option key={generation.id} value={generation.id}>
              {generation.name}
              {yearLabel(generation.yearFrom, generation.yearTo) ? ` (${yearLabel(generation.yearFrom, generation.yearTo)})` : ""}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="g19-label" htmlFor={name("modificationId")}>
          Модификация
        </label>
        <Select id={name("modificationId")} name={name("modificationId")} disabled={modifications.length === 0} defaultValue={defaultModificationId}>
          <option value="">— все модификации —</option>
          {modifications.map((modification) => (
            <option key={modification.id} value={modification.id}>
              {modification.name}
              {yearLabel(modification.yearFrom, modification.yearTo) ? ` (${yearLabel(modification.yearFrom, modification.yearTo)})` : ""}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
