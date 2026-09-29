import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { percent } from "@/lib/admin/format";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard } from "@/components/admin/page-parts";
import { SupplierForm } from "@/components/admin/supplier-form";

export const metadata: Metadata = { title: "Поставщик" };

export const dynamic = "force-dynamic";

export default async function AdminSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPanelPage resource="suppliers" requireAdminRole>
      {async () => {
        const supplier = await prisma.supplier.findUnique({
          where: { id },
          include: {
            _count: { select: { products: true, importJobs: true } },
            importJobs: {
              orderBy: { createdAt: "desc" },
              take: 10,
              select: { id: true, fileName: true, status: true, mode: true, createdAt: true, createdCount: true, errorCount: true },
            },
          },
        });
        if (!supplier) notFound();

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={supplier.name}
              description={`Наценка: ${percent(supplier.marginPercent)} · товаров: ${supplier._count.products} · импортов: ${supplier._count.importJobs}`}
              actions={
                <Link
                  href="/admin/suppliers"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  К поставщикам
                </Link>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="g19-card xl:col-span-2">
                <SupplierForm
                  mode="edit"
                  defaults={{
                    id: supplier.id,
                    name: supplier.name,
                    slug: supplier.slug,
                    contactPerson: supplier.contactPerson ?? "",
                    phone: supplier.phone ?? "",
                    email: supplier.email ?? "",
                    priceUrl: supplier.priceUrl ?? "",
                    feedType: supplier.feedType ?? "",
                    marginPercent: supplier.marginPercent,
                    note: supplier.note ?? "",
                    isActive: supplier.isActive,
                  }}
                />
              </div>

              <AdminCard title="Последние импорты" padded={false}>
                {supplier.importJobs.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-ink-400">Импортов ещё не было</p>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {supplier.importJobs.map((job) => (
                      <li key={job.id} className="px-5 py-2.5">
                        <p className="truncate text-sm font-medium text-ink-800">{job.fileName}</p>
                        <p className="text-xs text-ink-400">
                          {job.status} · {job.mode} · создано {job.createdCount}
                          {job.errorCount > 0 ? ` · ошибок ${job.errorCount}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="border-t border-ink-100 px-5 py-3">
                  <Link href="/admin/import" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                    Журнал импорта →
                  </Link>
                </div>
              </AdminCard>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
