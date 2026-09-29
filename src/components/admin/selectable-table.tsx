"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TablePagination } from "@/components/admin/data-table";
import type { PaginationInfo, SearchParamsRecord, SortState } from "@/lib/admin/query";

/**
 * Таблица с чекбоксами выбора и панелью массовых действий.
 *
 * Важно: это клиентский компонент, поэтому он принимает ТОЛЬКО сериализуемые
 * данные — описание колонок и уже отрисованные ячейки (`cells`). Передавать
 * функции-рендереры (`cell: (row) => …`) из серверного компонента нельзя:
 * React выбрасывает «Functions cannot be passed directly to Client Components».
 * Серверный компонент строит ячейки сам, а таблица раскладывает их по колонкам.
 *
 * Форма отправляется обычным POST — операцию выполняет Server Action,
 * переданный в `action`, поэтому JavaScript не обязателен
 * (кроме кнопки «выбрать все»).
 */

export type SelectableColumn = {
  key: string;
  title: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
};

/** Строка таблицы: id для чекбокса и готовые ячейки в порядке колонок. */
export type SelectableRowData = {
  id: string;
  cells: React.ReactNode[];
};

export function SelectableBulkTable({
  rows,
  columns,
  basePath,
  params,
  sort,
  pagination,
  emptyMessage,
  action,
  bulkControls,
  ariaLabel = "Массовые действия",
}: {
  rows: SelectableRowData[];
  columns: SelectableColumn[];
  basePath: string;
  params: SearchParamsRecord;
  sort?: SortState;
  pagination: PaginationInfo;
  emptyMessage?: string;
  action: (formData: FormData) => Promise<void>;
  bulkControls: React.ReactNode;
  ariaLabel?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const selectedSet = new Set(selected);

  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleAll = () => {
    setSelected((current) => (current.length === rows.length ? [] : rows.map((row) => row.id)));
  };

  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <form action={action} aria-label={ariaLabel}>
      <div className="g19-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 sm:px-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
            />
            Выбрано: <span className="font-semibold">{selected.length}</span>
            <span className="text-xs text-ink-400">из {rows.length} на странице</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">{bulkControls}</div>
        </div>

        <div className="px-3 py-3 sm:px-5 sm:py-4">
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/70">
                  <th scope="col" className="w-8 px-3 py-2.5">
                    <span className="sr-only">Выбор</span>
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500",
                        column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left",
                        column.headerClassName,
                      )}
                    >
                      {column.sortable ? (
                        <a
                          href={buildSortHref(basePath, params, column.key, sort)}
                          className={cn("hover:text-brand-700", sort?.field === column.key && "text-brand-700")}
                        >
                          {column.title}
                          {sort?.field === column.key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                        </a>
                      ) : (
                        column.title
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-3 py-12 text-center text-sm text-ink-500">
                      {emptyMessage ?? "Ничего не найдено"}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(row.id)}
                          onChange={() => toggle(row.id)}
                          aria-label="Выбрать строку"
                          className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
                        />
                      </td>
                      {columns.map((column, index) => (
                        <td
                          key={column.key}
                          className={cn(
                            "px-3 py-2.5 align-middle text-ink-700",
                            column.align === "right"
                              ? "text-right"
                              : column.align === "center"
                                ? "text-center"
                                : "text-left",
                            column.className,
                          )}
                        >
                          {row.cells[index]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination basePath={basePath} params={params} pagination={pagination} />
        </div>
      </div>

      {/* Значения выбранных строк уезжают вместе с формой */}
      {selected.map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
    </form>
  );
}

function buildSortHref(basePath: string, params: SearchParamsRecord, field: string, sort?: SortState): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((item) => item !== "" && search.append(key, item));
    else search.set(key, value);
  }
  search.set("sort", field);
  search.set("dir", sort?.field === field && sort.dir === "asc" ? "desc" : "asc");
  search.set("page", "1");
  return `${basePath}?${search.toString()}`;
}
