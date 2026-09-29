import Link from "next/link";
import type { Metadata } from "next";
import { RefreshCw } from "lucide-react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { IMPORT_MODES, IMPORT_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { importModuleAvailable } from "@/lib/admin/import-bridge";
import { buildPagination, getPage, getPerPage, getStr, skipTake, type SearchParamsRecord } from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ImportStatusBadge, StatusBadge } from "@/components/admin/badges";
import { FilterBar, FilterItem } from "@/components/admin/filters";
import { TablePagination } from "@/components/admin/data-table";
import { ImportStartForm } from "@/components/admin/import-form";
import { clearFinishedImportsAction, rerunImportAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Импорт прайсов" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminImportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="import" requireAdminRole>
      {async () => {
        const status = getStr(params, "status");
        const supplierId = getStr(params, "supplier");
        const page = getPage(params);
        const perPage = getPerPage(params, 20);

        const where: Prisma.ImportJobWhereInput = {
          ...(status && status in IMPORT_STATUSES ? { status } : {}),
          ...(supplierId ? { supplierId } : {}),
        };

        const [total, jobs, suppliers, importAvailable, counters] = await Promise.all([
          prisma.importJob.count({ where }),
          prisma.importJob.findMany({
            where,
            orderBy: { createdAt: "desc" },
            ...skipTake(page, perPage),
            select: {
              id: true,
              fileName: true,
              sourceType: true,
              mode: true,
              status: true,
              totalRows: true,
              createdCount: true,
              updatedCount: true,
              skippedCount: true,
              errorCount: true,
              log: true,
              createdAt: true,
              finishedAt: true,
              supplier: { select: { id: true, name: true } },
              user: { select: { name: true } },
            },
          }),
          prisma.supplier.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true, feedType: true, priceUrl: true },
          }),
          importModuleAvailable(),
          prisma.importJob.groupBy({ by: ["status"], _count: { _all: true } }),
        ]);

        const pagination = buildPagination(page, perPage, total);
        const record: SearchParamsRecord = {
          ...(status ? { status } : {}),
          ...(supplierId ? { supplier: supplierId } : {}),
        };
        const statusMap = new Map(counters.map((row) => [row.status, row._count._all]));

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Импорт прайсов"
              description="Загрузка XML/YML/CSV, режимы импорта и журнал задач. Раздел доступен администратору."
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <AdminCard title="Запуск импорта" padded={false}>
                  <ImportStartForm suppliers={suppliers} importAvailable={importAvailable} />
                </AdminCard>
              </div>

              <div className="space-y-4">
                <AdminCard title="Статусы задач">
                  <ul className="space-y-2 text-sm">
                    {Object.entries(IMPORT_STATUSES).map(([key, label]) => (
                      <li key={key} className="flex items-center justify-between">
                        <span className="text-ink-600">{label}</span>
                        <span className="font-semibold text-ink-900">{statusMap.get(key) ?? 0}</span>
                      </li>
                    ))}
                  </ul>
                </AdminCard>

                <AdminCard title="Режимы импорта">
                  <ul className="space-y-2 text-sm text-ink-600">
                    {Object.entries(IMPORT_MODES).map(([key, label]) => (
                      <li key={key}>
                        <span className="font-mono text-xs text-ink-400">{key}</span> — {label}
                      </li>
                    ))}
                  </ul>
                </AdminCard>

                <AdminCard title="Зависимость">
                  <p className="text-sm text-ink-600">
                    Импорт выполняет модуль <code className="font-mono text-xs">@/lib/import</code> (функции{" "}
                    <code className="font-mono text-xs">runImport</code>/
                    <code className="font-mono text-xs">runImportAction</code>). Статус подключения:{" "}
                    {importAvailable ? (
                      <StatusBadge tone="success">подключён</StatusBadge>
                    ) : (
                      <StatusBadge tone="warning">ожидается</StatusBadge>
                    )}
                  </p>
                </AdminCard>
              </div>
            </div>

            <FilterBar action="/admin/import" resetHref="/admin/import">
              <FilterItem label="Статус">
                <select name="status" defaultValue={status ?? ""} className="g19-input cursor-pointer">
                  <option value="">Все</option>
                  {Object.entries(IMPORT_STATUSES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </FilterItem>
              <FilterItem label="Поставщик" width="lg">
                <select name="supplier" defaultValue={supplierId ?? ""} className="g19-input cursor-pointer">
                  <option value="">Все поставщики</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </FilterItem>
            </FilterBar>

            <AdminCard
              title={`Журнал задач (${total})`}
              padded={false}
              actions={
                <form action={clearFinishedImportsAction} className="flex items-center gap-2">
                  <input type="hidden" name="ids" value="" />
                  <button
                    type="submit"
                    className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                  >
                    Очистить завершённые
                  </button>
                </form>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[56rem] text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                      <th className="px-5 py-2.5 text-left font-semibold">Файл</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Поставщик</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Режим</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Статус</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Строк</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Создано / обновлено</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Пропущено / ошибок</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Дата</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b border-ink-100 align-top last:border-0 hover:bg-ink-50/60">
                        <td className="px-5 py-2.5">
                          <p className="font-medium text-ink-800">{job.fileName}</p>
                          <p className="text-xs text-ink-400">
                            {job.sourceType.toUpperCase()}
                            {job.user?.name ? ` · ${job.user.name}` : ""}
                          </p>
                          {job.log && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-xs text-brand-700">Лог</summary>
                              <pre className="mt-1 max-h-48 max-w-md overflow-auto whitespace-pre-wrap rounded-lg bg-ink-900 p-2 text-[11px] text-ink-100">
                                {job.log}
                              </pre>
                            </details>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-ink-600">
                          {job.supplier ? (
                            <Link href={`/admin/suppliers/${job.supplier.id}`} className="hover:text-brand-700">
                              {job.supplier.name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-ink-600">
                          {IMPORT_MODES[job.mode as keyof typeof IMPORT_MODES] ?? job.mode}
                        </td>
                        <td className="px-3 py-2.5">
                          <ImportStatusBadge status={job.status} />
                        </td>
                        <td className="px-3 py-2.5 text-center text-ink-600">{job.totalRows}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="font-semibold text-emerald-700">{job.createdCount}</span>
                          {" / "}
                          <span className="font-semibold text-blue-700">{job.updatedCount}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-ink-600">{job.skippedCount}</span>
                          {" / "}
                          <span className={job.errorCount > 0 ? "font-semibold text-red-600" : "text-ink-600"}>
                            {job.errorCount}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-500">
                          {formatDate(job.createdAt, true)}
                          {job.finishedAt && <p className="text-ink-400">завершён {formatDate(job.finishedAt, true)}</p>}
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <form action={rerunImportAction}>
                              <input type="hidden" name="id" value={job.id} />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                              >
                                <RefreshCw className="size-3.5" aria-hidden />
                                Повторить
                              </button>
                            </form>
                            <ConfirmButton
                              action={clearFinishedImportsAction}
                              id={job.id}
                              idName="ids"
                              title="Удалить задачу?"
                              description="Запись исчезнет из журнала импорта."
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-5 py-12 text-center text-sm text-ink-500">
                          Задач импорта нет — загрузите первый прайс выше.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 pb-4">
                <TablePagination basePath="/admin/import" params={record} pagination={pagination} />
              </div>
            </AdminCard>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
