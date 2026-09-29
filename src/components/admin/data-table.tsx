import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Pagination } from "@/components/ui";
import { cn } from "@/lib/utils";
import { buildHref, type PaginationInfo, type SearchParamsRecord, type SortState } from "@/lib/admin/query";

/**
 * Таблица админки: сортировка по клику на заголовок, пагинация с сохранением
 * фильтров, горизонтальный скролл на мобильных.
 */

export type Column<T> = {
  key: string;
  title: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  cell: (row: T) => React.ReactNode;
};

const ALIGN: Record<string, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  basePath,
  params,
  sort,
  emptyMessage = "Ничего не найдено",
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  basePath: string;
  params: SearchParamsRecord;
  sort?: SortState;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center text-sm text-ink-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/70">
            {columns.map((column) => {
              const align = ALIGN[column.align ?? "left"];
              const isSorted = sort?.field === column.key;
              const nextDir = isSorted && sort?.dir === "asc" ? "desc" : "asc";
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500",
                    align,
                    column.headerClassName,
                  )}
                >
                  {column.sortable ? (
                    <Link
                      href={buildHref(basePath, params, { sort: column.key, dir: nextDir, page: 1 })}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-brand-700",
                        isSorted && "text-brand-700",
                        column.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {column.title}
                      {isSorted ? (
                        sort?.dir === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3.5 text-ink-300" aria-hidden />
                      )}
                    </Link>
                  ) : (
                    column.title
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowId(row)} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
              {columns.map((column) => (
                <td key={column.key} className={cn("px-3 py-2.5 align-middle text-ink-700", ALIGN[column.align ?? "left"], column.className)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TablePagination({
  basePath,
  params,
  pagination,
}: {
  basePath: string;
  params: SearchParamsRecord;
  pagination: PaginationInfo;
}) {
  if (pagination.total === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-ink-500">
        Показано {pagination.from}–{pagination.to} из {pagination.total}
      </p>
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        buildHref={(page) => buildHref(basePath, params, { page })}
      />
    </div>
  );
}
