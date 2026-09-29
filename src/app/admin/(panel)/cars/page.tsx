import Link from "next/link";
import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  buildHref,
  buildPagination,
  getPage,
  getPerPage,
  getSort,
  getStr,
  skipTake,
  type SearchParamsRecord,
} from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ActiveBadge, StatusBadge } from "@/components/admin/badges";
import { FilterBar, FilterItem } from "@/components/admin/filters";
import { TablePagination } from "@/components/admin/data-table";
import { BrandForm } from "@/components/admin/car-forms";
import { deleteBrandAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Автомобили" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const SORT_FIELDS = ["name", "sortOrder", "popular"] as const;

function toRecord(params: SearchParams): SearchParamsRecord {
  const record: SearchParamsRecord = {};
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) record[key] = value;
    else if (value !== undefined) record[key] = value;
  }
  return record;
}

export default async function AdminCarsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="cars">
      {async () => {
        const search = getStr(params, "q")?.trim();
        const active = getStr(params, "active");
        const page = getPage(params);
        const perPage = getPerPage(params, 30);
        const sort = getSort(params, SORT_FIELDS, "sortOrder", "asc");

        const where: Prisma.BrandWhereInput = {
          ...(active === "yes" ? { isActive: true } : active === "no" ? { isActive: false } : {}),
          ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        };

        const [total, brands] = await Promise.all([
          prisma.brand.count({ where }),
          prisma.brand.findMany({
            where,
            orderBy: { [sort.field]: sort.dir },
            ...skipTake(page, perPage),
            select: {
              id: true,
              name: true,
              slug: true,
              country: true,
              popular: true,
              sortOrder: true,
              isActive: true,
              _count: { select: { models: true, products: true, fitments: true } },
            },
          }),
        ]);

        const pagination = buildPagination(page, perPage, total);
        const record = toRecord(params);

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Автомобили"
              description="Марки, модели, поколения и модификации — основа подбора. Поколения вводятся вручную с годами выпуска."
            />

            <FilterBar action="/admin/cars" resetHref="/admin/cars">
              <FilterItem label="Поиск марки" htmlFor="q" width="lg">
                <input id="q" name="q" defaultValue={search ?? ""} placeholder="Toyota, Volkswagen…" className="g19-input" />
              </FilterItem>
              <FilterItem label="Активность">
                <select name="active" defaultValue={active ?? ""} className="g19-input cursor-pointer">
                  <option value="">Все</option>
                  <option value="yes">Активные</option>
                  <option value="no">Отключённые</option>
                </select>
              </FilterItem>
              <input type="hidden" name="sort" value={sort.field} />
              <input type="hidden" name="dir" value={sort.dir} />
            </FilterBar>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <AdminCard title={`Марки (${total})`} padded={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[44rem] text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                          <th className="px-5 py-2.5 text-left font-semibold">
                            <Link href={buildHref("/admin/cars", record, { sort: "name", dir: sort.field === "name" && sort.dir === "asc" ? "desc" : "asc" })}>
                              Марка
                            </Link>
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold">Страна</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Моделей</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Товаров</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Привязок</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Статус</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brands.map((brand) => (
                          <tr key={brand.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                            <td className="px-5 py-2.5">
                              <Link href={`/admin/cars/${brand.id}`} className="font-medium text-ink-800 hover:text-brand-700">
                                {brand.name}
                              </Link>
                              <p className="text-xs text-ink-400">{brand.slug}</p>
                            </td>
                            <td className="px-3 py-2.5 text-ink-600">{brand.country ?? "—"}</td>
                            <td className="px-3 py-2.5 text-center">
                              <Link href={`/admin/cars/${brand.id}`} className="font-semibold text-brand-700 hover:text-brand-800">
                                {brand._count.models}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-center text-ink-600">{brand._count.products}</td>
                            <td className="px-3 py-2.5 text-center text-ink-600">{brand._count.fitments}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <ActiveBadge active={brand.isActive} />
                                {brand.popular && <StatusBadge tone="brand">популярная</StatusBadge>}
                              </div>
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/admin/cars/${brand.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                >
                                  <Pencil className="size-3.5" aria-hidden />
                                  Модели
                                </Link>
                                <ConfirmButton
                                  action={deleteBrandAction}
                                  id={brand.id}
                                  title="Удалить марку?"
                                  description="Удалятся все модели, поколения и привязки совместимости."
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                        {brands.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-500">
                              Марки не найдены.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 pb-4">
                    <TablePagination basePath="/admin/cars" params={record} pagination={pagination} />
                  </div>
                </AdminCard>
              </div>

              <div>
                <AdminCard title="Новая марка">
                  <BrandForm mode="create" defaults={{ sortOrder: 100, isActive: true }} />
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
