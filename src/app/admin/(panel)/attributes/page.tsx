import Link from "next/link";
import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ATTRIBUTE_TYPES } from "@/lib/constants";
import { optionsToString } from "@/lib/admin/format";
import { buildHref, buildPagination, getPage, getPerPage, getStr, skipTake, type SearchParamsRecord } from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { StatusBadge } from "@/components/admin/badges";
import { FilterBar, FilterItem } from "@/components/admin/filters";
import { TablePagination } from "@/components/admin/data-table";
import { AttributeForm } from "@/components/admin/attribute-form";
import { deleteAttributeAction, forceDeleteAttributeAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Характеристики" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function toRecord(params: SearchParams): SearchParamsRecord {
  const record: SearchParamsRecord = {};
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) record[key] = value;
    else if (value !== undefined) record[key] = value;
  }
  return record;
}

export default async function AdminAttributesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="attributes">
      {async () => {
        const search = getStr(params, "q")?.trim();
        const categoryId = getStr(params, "category");
        const type = getStr(params, "type");
        const page = getPage(params);
        const perPage = getPerPage(params, 30);

        const where: Prisma.AttributeWhereInput = {
          ...(categoryId === "none" ? { categoryId: null } : categoryId ? { categoryId } : {}),
          ...(type && type in ATTRIBUTE_TYPES ? { type } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { slug: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        };

        const [total, attributes, categories] = await Promise.all([
          prisma.attribute.count({ where }),
          prisma.attribute.findMany({
            where,
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            ...skipTake(page, perPage),
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              unit: true,
              options: true,
              isFilterable: true,
              isRequired: true,
              isActive: true,
              group: true,
              sortOrder: true,
              category: { select: { id: true, name: true } },
              _count: { select: { values: true } },
            },
          }),
          prisma.category.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true, parentId: true },
          }),
        ]);

        const pagination = buildPagination(page, perPage, total);
        const record = toRecord(params);

        const roots = categories.filter((category) => !category.parentId);
        const categoryOptions = roots.flatMap((root) => [
          { value: root.id, label: root.name },
          ...categories
            .filter((child) => child.parentId === root.id)
            .map((child) => ({ value: child.id, label: `— ${child.name}` })),
        ]);

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Характеристики"
              description="Фасетные характеристики каталога: тип значения, варианты, привязка к категории."
            />

            <FilterBar action="/admin/attributes" resetHref="/admin/attributes">
              <FilterItem label="Поиск" htmlFor="q" width="lg">
                <input id="q" name="q" defaultValue={search ?? ""} placeholder="Название или slug" className="g19-input" />
              </FilterItem>
              <FilterItem label="Категория" width="lg">
                <select name="category" defaultValue={categoryId ?? ""} className="g19-input cursor-pointer">
                  <option value="">Все</option>
                  <option value="none">Общие (без категории)</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FilterItem>
              <FilterItem label="Тип">
                <select name="type" defaultValue={type ?? ""} className="g19-input cursor-pointer">
                  <option value="">Любой</option>
                  {Object.entries(ATTRIBUTE_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </FilterItem>
            </FilterBar>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <AdminCard title={`Найдено: ${total}`} padded={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[46rem] text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                          <th className="px-5 py-2.5 text-left font-semibold">Характеристика</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Тип</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Варианты</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Категория</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Свойства</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attributes.map((attribute) => (
                          <tr key={attribute.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                            <td className="px-5 py-2.5">
                              <Link
                                href={`/admin/attributes/${attribute.id}`}
                                className="font-medium text-ink-800 hover:text-brand-700"
                              >
                                {attribute.name}
                              </Link>
                              <p className="text-xs text-ink-400">
                                {attribute.slug}
                                {attribute.unit ? ` · ${attribute.unit}` : ""}
                                {attribute.group ? ` · ${attribute.group}` : ""}
                              </p>
                            </td>
                            <td className="px-3 py-2.5 text-ink-600">
                              {ATTRIBUTE_TYPES[attribute.type as keyof typeof ATTRIBUTE_TYPES] ?? attribute.type}
                            </td>
                            <td className="max-w-64 px-3 py-2.5 text-xs text-ink-500">
                              {optionsToString(attribute.options) || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-ink-600">{attribute.category?.name ?? "общая"}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {attribute.isFilterable && <StatusBadge tone="info">фильтр</StatusBadge>}
                                {attribute.isRequired && <StatusBadge tone="warning">обязат.</StatusBadge>}
                                {!attribute.isActive && <StatusBadge tone="default">выкл</StatusBadge>}
                                <StatusBadge tone="outline">{attribute._count.values} значений</StatusBadge>
                              </div>
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/admin/attributes/${attribute.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                >
                                  <Pencil className="size-3.5" aria-hidden />
                                  Изменить
                                </Link>
                                <ConfirmButton
                                  action={deleteAttributeAction}
                                  id={attribute.id}
                                  title="Удалить характеристику?"
                                  description={
                                    attribute._count.values > 0
                                      ? "У характеристики есть значения у товаров — удаление будет отклонено."
                                      : "Характеристика будет удалена."
                                  }
                                />
                                {attribute._count.values > 0 && (
                                  <ConfirmButton
                                    action={forceDeleteAttributeAction}
                                    id={attribute.id}
                                    title="Удалить со значениями?"
                                    description={`Будут удалены ${attribute._count.values} значений у товаров.`}
                                    variant="button"
                                    label="Удалить с значениями"
                                    confirmLabel="Удалить всё"
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {attributes.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-12 text-center text-sm text-ink-500">
                              Характеристик не найдено.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 pb-4">
                    <TablePagination basePath="/admin/attributes" params={record} pagination={pagination} />
                  </div>
                </AdminCard>
              </div>

              <div>
                <AdminCard title="Новая характеристика">
                  <AttributeForm mode="create" defaults={{ type: "select", isFilterable: true, isActive: true, sortOrder: 100 }} categoryOptions={categoryOptions} />
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
