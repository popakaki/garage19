import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatYears, plural } from "@/lib/utils";

/** Склонение слова по числу без самого числа. */
function pluralWord(count: number, forms: [string, string, string]): string {
  return plural(count, forms[0], forms[1], forms[2]);
}

export type FitmentRow = {
  id: string;
  brand: { id: string; name: string; slug: string };
  model: { id: string; name: string; slug: string } | null;
  generation: { id: string; name: string; slug: string; yearFrom: number; yearTo: number | null } | null;
  yearFrom: number | null;
  yearTo: number | null;
  note: string | null;
};

/**
 * Блок «Подходит для автомобилей».
 * Fitments группируются по марке, внутри — модели/поколения со ссылками на
 * SEO-посадочные /podbor/... (двусторонняя перелинковка «товар ↔ авто»).
 * Для универсальных товаров показывается соответствующая плашка.
 */
export function FitmentList({
  fitments,
  fitmentType,
  fitmentNote,
}: {
  fitments: FitmentRow[];
  fitmentType: string;
  fitmentNote?: string | null;
}) {
  if (fitmentType === "universal") {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
        <Badge variant="brand">Универсальный товар</Badge>
        <p className="mt-2 text-sm text-ink-700">
          Подходит большинству автомобилей с подходящим типом крепления.
          {fitmentNote ? ` ${fitmentNote}` : ""} Уточните параметры вашего авто — поможем с выбором.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href="/catalog?fitment=universal" className="text-brand-700 underline">
            Все универсальные товары
          </Link>
          <Link href="/podbor" className="text-brand-700 underline">
            Подбор по автомобилю
          </Link>
        </div>
      </div>
    );
  }

  if (!fitments.length) {
    return (
      <p className="text-sm text-ink-500">
        Совместимость уточняется. Позвоните или оставьте заявку — проверим по каталогу производителя.
      </p>
    );
  }

  const grouped = new Map<
    string,
    {
      brand: FitmentRow["brand"];
      brandOnly: boolean;
      rows: FitmentRow[];
    }
  >();

  for (const fitment of fitments) {
    const entry = grouped.get(fitment.brand.slug) ?? {
      brand: fitment.brand,
      brandOnly: false,
      rows: [],
    };
    if (!fitment.model) entry.brandOnly = true;
    entry.rows.push(fitment);
    grouped.set(fitment.brand.slug, entry);
  }

  const brands = [...grouped.values()].sort((a, b) => a.brand.name.localeCompare(b.brand.name, "ru"));
  const totalModels = new Set(
    fitments.filter((fitment) => fitment.model).map((fitment) => `${fitment.brand.slug}/${fitment.model?.slug}`),
  ).size;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-500">
        Совместимость подтверждена для <strong className="text-ink-700">{brands.length}</strong>{" "}
        {pluralWord(brands.length, ["марки", "марок", "марок"])} и{" "}
        <strong className="text-ink-700">{totalModels}</strong> {pluralWord(totalModels, ["модели", "моделей", "моделей"])}.
        Выберите своё авто, чтобы увидеть все подходящие товары.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {brands.map((group) => (
          <div key={group.brand.slug} className="rounded-xl border border-ink-100 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/podbor/${group.brand.slug}`}
                className="font-semibold text-ink-900 hover:text-brand-700"
              >
                {group.brand.name}
              </Link>
              <span className="text-xs text-ink-400">{group.rows.length}</span>
            </div>

            {group.brandOnly ? (
              <p className="mt-2 text-xs text-ink-500">Подходит для всех моделей марки</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {group.rows
                  .filter((row) => row.model)
                  .slice(0, 8)
                  .map((row) => (
                    <li key={row.id} className="text-sm">
                      <Link
                        href={
                          row.generation
                            ? `/podbor/${row.brand.slug}/${row.model?.slug}/${row.generation.slug}`
                            : `/podbor/${row.brand.slug}/${row.model?.slug}`
                        }
                        className="text-ink-700 hover:text-brand-700"
                      >
                        {row.model?.name}
                        {row.generation && (
                          <span className="text-ink-400">
                            {" "}
                            {row.generation.name}
                            {row.generation.yearFrom
                              ? ` (${formatYears(row.generation.yearFrom, row.generation.yearTo)})`
                              : ""}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                {group.rows.filter((row) => row.model).length > 8 && (
                  <li className="text-sm text-ink-400">
                    и ещё {group.rows.filter((row) => row.model).length - 8} — на странице подбора
                  </li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
