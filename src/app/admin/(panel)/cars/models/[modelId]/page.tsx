import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatYears } from "@/lib/utils";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ActiveBadge } from "@/components/admin/badges";
import { GenerationForm, ModelForm } from "@/components/admin/car-forms";
import { deleteGenerationAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Модель" };

export const dynamic = "force-dynamic";

export default async function AdminModelPage({ params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;

  return (
    <AdminPanelPage resource="cars">
      {async () => {
        const model = await prisma.carModel.findUnique({
          where: { id: modelId },
          include: {
            brand: { select: { id: true, name: true } },
            generations: {
              orderBy: [{ yearFrom: "desc" }, { name: "asc" }],
              select: {
                id: true,
                name: true,
                slug: true,
                yearFrom: true,
                yearTo: true,
                bodyType: true,
                note: true,
                isActive: true,
                _count: { select: { modifications: true, fitments: true } },
              },
            },
            _count: { select: { fitments: true } },
          },
        });
        if (!model) notFound();

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={`${model.brand.name} ${model.name}`}
              description={`Поколений: ${model.generations.length} · привязок совместимости: ${model._count.fitments} · ${formatYears(model.yearFrom, model.yearTo) || "годы не указаны"}`}
              actions={
                <Link
                  href={`/admin/cars/${model.brand.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  К моделям {model.brand.name}
                </Link>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <AdminCard title={`Поколения (${model.generations.length})`} padded={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                          <th className="px-5 py-2.5 text-left font-semibold">Поколение</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Годы выпуска</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Кузов</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Модификаций</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Привязок</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Статус</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {model.generations.map((generation) => (
                          <tr key={generation.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                            <td className="px-5 py-2.5">
                              <Link
                                href={`/admin/cars/generations/${generation.id}`}
                                className="font-medium text-ink-800 hover:text-brand-700"
                              >
                                {generation.name}
                              </Link>
                              {generation.note && <p className="text-xs text-ink-400">{generation.note}</p>}
                            </td>
                            <td className="px-3 py-2.5 text-ink-600">{formatYears(generation.yearFrom, generation.yearTo)}</td>
                            <td className="px-3 py-2.5 text-ink-600">{generation.bodyType ?? "—"}</td>
                            <td className="px-3 py-2.5 text-center">
                              <Link
                                href={`/admin/cars/generations/${generation.id}`}
                                className="font-semibold text-brand-700 hover:text-brand-800"
                              >
                                {generation._count.modifications}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-center text-ink-600">{generation._count.fitments}</td>
                            <td className="px-3 py-2.5">
                              <ActiveBadge active={generation.isActive} />
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/admin/cars/generations/${generation.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                >
                                  <Pencil className="size-3.5" aria-hidden />
                                  Модификации
                                </Link>
                                <ConfirmButton
                                  action={deleteGenerationAction}
                                  id={generation.id}
                                  title="Удалить поколение?"
                                  description="Удалятся модификации и привязки совместимости по этому поколению."
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                        {model.generations.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-500">
                              Поколений нет — добавьте первое справа. Укажите годы выпуска: по ним работает подбор.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </AdminCard>
              </div>

              <div className="space-y-4">
                <AdminCard title="Данные модели">
                  <ModelForm
                    mode="edit"
                    defaults={{
                      id: model.id,
                      name: model.name,
                      slug: model.slug,
                      bodyType: model.bodyType ?? "",
                      yearFrom: model.yearFrom,
                      yearTo: model.yearTo,
                      sortOrder: model.sortOrder,
                      isActive: model.isActive,
                    }}
                  />
                </AdminCard>

                <AdminCard title="Новое поколение" description="Ручной ввод с годами выпуска">
                  <GenerationForm mode="create" defaults={{ modelId: model.id, sortOrder: 100, isActive: true }} />
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
