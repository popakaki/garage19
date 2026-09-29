import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatYears } from "@/lib/utils";
import { buildPagination, getPage, getPerPage, getStr, skipTake } from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ActiveBadge, StatusBadge } from "@/components/admin/badges";
import { TablePagination } from "@/components/admin/data-table";
import { BrandForm, ModelForm } from "@/components/admin/car-forms";
import { deleteModelAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Марка" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminBrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { brandId } = await params;
  const query = await searchParams;

  return (
    <AdminPanelPage resource="cars">
      {async () => {
        const brand = await prisma.brand.findUnique({
          where: { id: brandId },
          include: { _count: { select: { models: true, products: true, fitments: true } } },
        });
        if (!brand) notFound();

        const search = getStr(query, "q")?.trim();
        const page = getPage(query);
        const perPage = getPerPage(query, 30);

        const where = {
          brandId: brand.id,
          ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
        };

        const [total, models] = await Promise.all([
          prisma.carModel.count({ where }),
          prisma.carModel.findMany({
            where,
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            ...skipTake(page, perPage),
            select: {
              id: true,
              name: true,
              slug: true,
              bodyType: true,
              yearFrom: true,
              yearTo: true,
              sortOrder: true,
              isActive: true,
              _count: { select: { generations: true, fitments: true } },
            },
          }),
        ]);

        const pagination = buildPagination(page, perPage, total);
        const record: Record<string, string> = search ? { q: search } : {};

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={`${brand.name}: модели`}
              description={`Моделей: ${brand._count.models} · привязок совместимости: ${brand._count.fitments} · товаров-производителей: ${brand._count.products}`}
              actions={
                <Link
                  href="/admin/cars"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Все марки
                </Link>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <AdminCard
                  title={`Модели (${total})`}
                  padded={false}
                  actions={
                    <form action={`/admin/cars/${brand.id}`} method="get" className="flex items-center gap-2">
                      <input
                        name="q"
                        defaultValue={search ?? ""}
                        placeholder="Поиск модели"
                        className="g19-input w-48 py-1.5 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                      >
                        Найти
                      </button>
                    </form>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                          <th className="px-5 py-2.5 text-left font-semibold">Модель</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Кузов</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Годы</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Поколений</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Статус</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {models.map((model) => (
                          <tr key={model.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                            <td className="px-5 py-2.5">
                              <Link
                                href={`/admin/cars/models/${model.id}`}
                                className="font-medium text-ink-800 hover:text-brand-700"
                              >
                                {model.name}
                              </Link>
                              <p className="text-xs text-ink-400">{model.slug}</p>
                            </td>
                            <td className="px-3 py-2.5 text-ink-600">{model.bodyType ?? "—"}</td>
                            <td className="px-3 py-2.5 text-ink-600">{formatYears(model.yearFrom, model.yearTo) || "—"}</td>
                            <td className="px-3 py-2.5 text-center">
                              <Link
                                href={`/admin/cars/models/${model.id}`}
                                className="font-semibold text-brand-700 hover:text-brand-800"
                              >
                                {model._count.generations}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5">
                              <ActiveBadge active={model.isActive} />
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/admin/cars/models/${model.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                >
                                  <Pencil className="size-3.5" aria-hidden />
                                  Поколения
                                </Link>
                                <ConfirmButton
                                  action={deleteModelAction}
                                  id={model.id}
                                  title="Удалить модель?"
                                  description="Удалятся поколения, модификации и привязки совместимости."
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                        {models.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-12 text-center text-sm text-ink-500">
                              Моделей нет — добавьте первую справа.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 pb-4">
                    <TablePagination basePath={`/admin/cars/${brand.id}`} params={record} pagination={pagination} />
                  </div>
                </AdminCard>

                <AdminCard title="Производитель товаров" description="Эта марка может быть производителем товара">
                  {brand.country || brand.logo ? (
                    <div className="flex items-center gap-3 text-sm text-ink-600">
                      {brand.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.logo} alt="" className="size-10 rounded-lg border border-ink-200 object-contain" />
                      )}
                      <span>{brand.country ?? "страна не указана"}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-400">Логотип и страна не заполнены.</p>
                  )}
                  <p className="mt-2 text-xs text-ink-400">
                    Товаров, где марка указана производителем: {brand._count.products}
                  </p>
                </AdminCard>
              </div>

              <div className="space-y-4">
                <AdminCard title="Данные марки">
                  <BrandForm
                    mode="edit"
                    defaults={{
                      id: brand.id,
                      name: brand.name,
                      slug: brand.slug,
                      logo: brand.logo ?? "",
                      country: brand.country ?? "",
                      popular: brand.popular,
                      sortOrder: brand.sortOrder,
                      isActive: brand.isActive,
                    }}
                  />
                </AdminCard>

                <AdminCard title="Новая модель">
                  <ModelForm mode="create" defaults={{ brandId: brand.id, sortOrder: 100, isActive: true }} />
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
