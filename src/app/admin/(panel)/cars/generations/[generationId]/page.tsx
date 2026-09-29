import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatYears } from "@/lib/utils";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ActiveBadge } from "@/components/admin/badges";
import { GenerationForm, ModificationForm } from "@/components/admin/car-forms";
import { deleteModificationAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Поколение" };

export const dynamic = "force-dynamic";

export default async function AdminGenerationPage({ params }: { params: Promise<{ generationId: string }> }) {
  const { generationId } = await params;

  return (
    <AdminPanelPage resource="cars">
      {async () => {
        const generation = await prisma.generation.findUnique({
          where: { id: generationId },
          include: {
            model: { select: { id: true, name: true, brand: { select: { id: true, name: true } } } },
            modifications: {
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              select: {
                id: true,
                name: true,
                engine: true,
                volume: true,
                power: true,
                fuel: true,
                drive: true,
                transmission: true,
                yearFrom: true,
                yearTo: true,
                isActive: true,
                _count: { select: { fitments: true } },
              },
            },
            _count: { select: { fitments: true } },
          },
        });
        if (!generation) notFound();

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={`${generation.model.brand.name} ${generation.model.name} · ${generation.name}`}
              description={`${formatYears(generation.yearFrom, generation.yearTo)} · модификаций: ${generation.modifications.length} · привязок: ${generation._count.fitments}`}
              actions={
                <Link
                  href={`/admin/cars/models/${generation.model.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  К поколениям модели
                </Link>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <AdminCard title={`Модификации (${generation.modifications.length})`} padded={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[44rem] text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                          <th className="px-5 py-2.5 text-left font-semibold">Модификация</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Двигатель</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Привод / КПП</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Годы</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Привязок</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Статус</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generation.modifications.map((modification) => (
                          <tr key={modification.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                            <td className="px-5 py-2.5 font-medium text-ink-800">{modification.name}</td>
                            <td className="px-3 py-2.5 text-ink-600">
                              {[
                                modification.engine,
                                modification.volume ? `${modification.volume} л` : null,
                                modification.power ? `${modification.power} л.с.` : null,
                                modification.fuel,
                              ]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-ink-600">
                              {[modification.drive, modification.transmission].filter(Boolean).join(" / ") || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center text-ink-600">
                              {formatYears(modification.yearFrom, modification.yearTo) || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center text-ink-600">{modification._count.fitments}</td>
                            <td className="px-3 py-2.5">
                              <ActiveBadge active={modification.isActive} />
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/admin/cars/modifications/${modification.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                >
                                  <Pencil className="size-3.5" aria-hidden />
                                  Изменить
                                </Link>
                                <ConfirmButton
                                  action={deleteModificationAction}
                                  id={modification.id}
                                  title="Удалить модификацию?"
                                  description="Привязки совместимости по модификации также удалятся."
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                        {generation.modifications.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-500">
                              Модификаций нет. Их можно не указывать — товар будет подходить ко всему поколению.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </AdminCard>
              </div>

              <div className="space-y-4">
                <AdminCard title="Данные поколения">
                  <GenerationForm
                    mode="edit"
                    defaults={{
                      id: generation.id,
                      name: generation.name,
                      slug: generation.slug,
                      yearFrom: generation.yearFrom,
                      yearTo: generation.yearTo,
                      bodyType: generation.bodyType ?? "",
                      imageUrl: generation.imageUrl ?? "",
                      note: generation.note ?? "",
                      sortOrder: generation.sortOrder,
                      isActive: generation.isActive,
                    }}
                  />
                </AdminCard>

                <AdminCard title="Новая модификация">
                  <ModificationForm mode="create" defaults={{ generationId: generation.id, sortOrder: 100, isActive: true }} />
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
