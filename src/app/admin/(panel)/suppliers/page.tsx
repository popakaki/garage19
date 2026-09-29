import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, Pencil } from "lucide-react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { percent } from "@/lib/admin/format";
import { FEED_TYPES } from "@/lib/admin/labels";
import { buildPagination, getPage, getPerPage, getStr, skipTake, type SearchParamsRecord } from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ActiveBadge, StatusBadge } from "@/components/admin/badges";
import { FilterBar, FilterItem } from "@/components/admin/filters";
import { TablePagination } from "@/components/admin/data-table";
import { SupplierForm } from "@/components/admin/supplier-form";
import { deleteSupplierAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Поставщики" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminSuppliersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="suppliers" requireAdminRole>
      {async () => {
        const search = getStr(params, "q")?.trim();
        const page = getPage(params);
        const perPage = getPerPage(params, 30);

        const where: Prisma.SupplierWhereInput = search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { contactPerson: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {};

        const [total, suppliers] = await Promise.all([
          prisma.supplier.count({ where }),
          prisma.supplier.findMany({
            where,
            orderBy: { name: "asc" },
            ...skipTake(page, perPage),
            select: {
              id: true,
              name: true,
              slug: true,
              contactPerson: true,
              phone: true,
              email: true,
              priceUrl: true,
              feedType: true,
              marginPercent: true,
              isActive: true,
              _count: { select: { products: true, importJobs: true } },
            },
          }),
        ]);

        const pagination = buildPagination(page, perPage, total);
        const record: SearchParamsRecord = search ? { q: search } : {};

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Поставщики"
              description="Прайс-листы, наценки и контакты. Раздел доступен только администратору."
            />

            <FilterBar action="/admin/suppliers" resetHref="/admin/suppliers">
              <FilterItem label="Поиск" htmlFor="q" width="lg">
                <input id="q" name="q" defaultValue={search ?? ""} placeholder="Название, контакт, email" className="g19-input" />
              </FilterItem>
            </FilterBar>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <AdminCard title={`Поставщики (${total})`} padded={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[48rem] text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                          <th className="px-5 py-2.5 text-left font-semibold">Поставщик</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Контакты</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Прайс</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Наценка</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Товаров</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Статус</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliers.map((supplier) => (
                          <tr key={supplier.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                            <td className="px-5 py-2.5">
                              <p className="font-medium text-ink-800">{supplier.name}</p>
                              <p className="text-xs text-ink-400">{supplier.slug}</p>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-ink-600">
                              {supplier.contactPerson && <p>{supplier.contactPerson}</p>}
                              {supplier.phone && <p>{supplier.phone}</p>}
                              {supplier.email && <p>{supplier.email}</p>}
                              {!supplier.contactPerson && !supplier.phone && !supplier.email && "—"}
                            </td>
                            <td className="px-3 py-2.5 text-xs">
                              {supplier.priceUrl ? (
                                <a
                                  href={supplier.priceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-800"
                                >
                                  <ExternalLink className="size-3.5" aria-hidden />
                                  {FEED_TYPES[supplier.feedType ?? ""] ?? "ссылка"}
                                </a>
                              ) : (
                                <span className="text-ink-400">не задан</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center text-ink-700">{percent(supplier.marginPercent)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <Link
                                href={`/admin/products?brand=${encodeURIComponent(supplier.name)}`}
                                className="font-semibold text-brand-700 hover:text-brand-800"
                              >
                                {supplier._count.products}
                              </Link>
                              <p className="text-xs text-ink-400">импортов: {supplier._count.importJobs}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              <ActiveBadge active={supplier.isActive} />
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/admin/suppliers/${supplier.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                >
                                  <Pencil className="size-3.5" aria-hidden />
                                  Изменить
                                </Link>
                                <ConfirmButton
                                  action={deleteSupplierAction}
                                  id={supplier.id}
                                  title="Удалить поставщика?"
                                  description="Товары и задачи импорта останутся, но потеряют привязку к поставщику."
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                        {suppliers.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-500">
                              Поставщиков нет — добавьте первого справа.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 pb-4">
                    <TablePagination basePath="/admin/suppliers" params={record} pagination={pagination} />
                  </div>
                </AdminCard>
              </div>

              <div className="space-y-4">
                <AdminCard title="Новый поставщик">
                  <SupplierForm mode="create" defaults={{ isActive: true, marginPercent: 0 }} />
                </AdminCard>
                <AdminCard title="Подсказка">
                  <p className="text-sm text-ink-600">
                    После добавления поставщика можно{" "}
                    <Link href="/admin/import" className="font-semibold text-brand-700 hover:text-brand-800">
                      загрузить прайс
                    </Link>{" "}
                    в разделах XML/YML/CSV. Наценка поставщика применяется при импорте.
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
                    <StatusBadge tone="outline">feedType</StatusBadge>
                    {Object.entries(FEED_TYPES)
                      .map(([key, label]) => `${key} — ${label}`)
                      .join(", ")}
                  </p>
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
