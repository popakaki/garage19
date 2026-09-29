import Link from "next/link";
import { FileText, ShieldCheck, Wrench } from "lucide-react";
import { Badge, PanelCard } from "@/components/ui";
import { formatDimensions, formatWeight } from "@/lib/utils";

export type SpecificationRow = { label: string; value: string };

/** Формирует строки таблицы характеристик из колонок товара и его атрибутов. */
export function buildSpecifications(input: {
  sku?: string | null;
  brandName?: string | null;
  manufacturerName?: string | null;
  warrantyMonths?: number | null;
  weight?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  material?: string | null;
  mountPlace?: string | null;
  profile?: string | null;
  capacityKg?: number | null;
  verticalLoadKg?: number | null;
  volumeL?: number | null;
  doorsCount?: number | null;
  lockIncluded?: boolean | null;
  bumperCut?: boolean | null;
  electricIncluded?: boolean | null;
  unit?: string;
  attributes?: {
    id: string;
    valueString: string | null;
    valueNumber: number | null;
    valueBool: boolean | null;
    attribute: { name: string; unit: string | null; group: string | null };
  }[];
}): SpecificationRow[] {
  const rows: SpecificationRow[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value === null || value === undefined || value === "" || value === "—") return;
    rows.push({ label, value });
  };

  push("Артикул", input.sku);
  push("Производитель", input.manufacturerName ?? input.brandName);
  push("Гарантия", input.warrantyMonths ? `${input.warrantyMonths} мес.` : null);
  push("Грузоподъёмность", input.capacityKg ? `${input.capacityKg} кг` : null);
  push("Вертикальная нагрузка", input.verticalLoadKg ? `${input.verticalLoadKg} кг` : null);
  push("Объём", input.volumeL ? `${input.volumeL} л` : null);
  push("Место установки", input.mountPlace);
  push("Профиль", input.profile);
  push("Материал", input.material);
  push("Количество дверей", input.doorsCount ? String(input.doorsCount) : null);
  push("Замок в комплекте", boolLabel(input.lockIncluded));
  push("Вырез бампера", boolLabel(input.bumperCut));
  push("Электрика в комплекте", boolLabel(input.electricIncluded));
  push("Вес", formatWeight(input.weight) !== "—" ? formatWeight(input.weight) : null);
  push(
    "Габариты (Д×Ш×В)",
    formatDimensions(input.lengthMm, input.widthMm, input.heightMm) !== "—"
      ? formatDimensions(input.lengthMm, input.widthMm, input.heightMm)
      : null,
  );

  for (const attribute of input.attributes ?? []) {
    const { attribute: meta } = attribute;
    const unit = meta.unit ? ` ${meta.unit}` : "";
    const value =
      attribute.valueString ??
      (attribute.valueNumber !== null && attribute.valueNumber !== undefined
        ? `${attribute.valueNumber}${unit}`
        : null) ??
      boolLabel(attribute.valueBool);
    push(meta.name, value ?? null);
  }

  return rows;
}

function boolLabel(value: boolean | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value ? "Да" : "Нет";
}

/** Таблица характеристик товара. */
export function SpecificationTable({
  rows,
  title = "Характеристики",
  description,
}: {
  rows: SpecificationRow[];
  title?: string;
  description?: string;
}) {
  if (!rows.length) return null;

  return (
    <PanelCard title={title} description={description} className="overflow-hidden">
      <div className="-mx-5 -my-4">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{title}</caption>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.label}-${index}`} className={index % 2 === 1 ? "bg-ink-50/60" : undefined}>
                <th scope="row" className="w-1/2 border-b border-ink-100 px-5 py-2.5 text-left font-medium text-ink-500">
                  {row.label}
                </th>
                <td className="border-b border-ink-100 px-5 py-2.5 font-medium text-ink-900">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelCard>
  );
}

export type DocumentRow = {
  id: string;
  type: string;
  title: string;
  url: string;
  fileSize: number | null;
};

const DOCUMENT_LABELS: Record<string, string> = {
  instruction: "Инструкция",
  passport: "Паспорт изделия",
  certificate: "Сертификат соответствия",
  manual: "Руководство",
  other: "Документ",
};

function formatFileSize(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/** Документы товара: паспорт, сертификат (для ТСУ — обязательны для ГИБДД), инструкции. */
export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  if (!documents.length) return null;

  const hasLegal = documents.some((doc) => doc.type === "passport" || doc.type === "certificate");

  return (
    <PanelCard
      title="Документы и сертификаты"
      description={hasLegal ? "Паспорт и сертификат нужны для регистрации ТСУ в ГИБДД" : undefined}
    >
      <ul className="flex flex-col gap-2">
        {documents.map((document) => (
          <li key={document.id}>
            <Link
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5 hover:border-brand-300 hover:bg-brand-50/40"
            >
              <span className="rounded-lg bg-brand-50 p-2 text-brand-700">
                {document.type === "certificate" ? (
                  <ShieldCheck className="size-4" aria-hidden />
                ) : document.type === "instruction" || document.type === "manual" ? (
                  <Wrench className="size-4" aria-hidden />
                ) : (
                  <FileText className="size-4" aria-hidden />
                )}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-ink-900">{document.title}</span>
                <span className="block text-xs text-ink-400">
                  {DOCUMENT_LABELS[document.type] ?? "Документ"}
                  {formatFileSize(document.fileSize) ? ` · ${formatFileSize(document.fileSize)}` : ""} · PDF
                </span>
              </span>
              <Badge variant="outline">Открыть</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}
