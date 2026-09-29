import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatYears } from "@/lib/utils";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard } from "@/components/admin/page-parts";
import { ModificationForm } from "@/components/admin/car-forms";

export const metadata: Metadata = { title: "Модификация" };

export const dynamic = "force-dynamic";

export default async function AdminModificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPanelPage resource="cars">
      {async () => {
        const modification = await prisma.modification.findUnique({
          where: { id },
          include: {
            generation: {
              select: {
                id: true,
                name: true,
                yearFrom: true,
                yearTo: true,
                model: { select: { id: true, name: true, brand: { select: { name: true } } } },
              },
            },
            _count: { select: { fitments: true } },
          },
        });
        if (!modification) notFound();

        const generation = modification.generation;

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={modification.name}
              description={`${generation.model.brand.name} ${generation.model.name} · ${generation.name} (${formatYears(generation.yearFrom, generation.yearTo)}) · привязок: ${modification._count.fitments}`}
              actions={
                <Link
                  href={`/admin/cars/generations/${generation.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  К модификациям поколения
                </Link>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="g19-card xl:col-span-2">
                <ModificationForm
                  mode="edit"
                  defaults={{
                    id: modification.id,
                    name: modification.name,
                    engine: modification.engine ?? "",
                    volume: modification.volume,
                    power: modification.power,
                    fuel: modification.fuel ?? "",
                    drive: modification.drive ?? "",
                    transmission: modification.transmission ?? "",
                    bodyType: modification.bodyType ?? "",
                    yearFrom: modification.yearFrom,
                    yearTo: modification.yearTo,
                    sortOrder: modification.sortOrder,
                    isActive: modification.isActive,
                  }}
                />
              </div>

              <AdminCard title="Товары для этой модификации">
                <p className="text-sm text-ink-600">
                  Совместимость настраивается в разделе{" "}
                  <Link href="/admin/compatibility" className="font-semibold text-brand-700 hover:text-brand-800">
                    Совместимость
                  </Link>{" "}
                  или в карточке товара.
                </p>
                <p className="mt-2 text-xs text-ink-400">
                  Модификация — самый точный уровень подбора: если привязки к ней нет, работает привязка к поколению,
                  модели или марке.
                </p>
              </AdminCard>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
