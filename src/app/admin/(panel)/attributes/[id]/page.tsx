import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { optionsToString } from "@/lib/admin/format";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard } from "@/components/admin/page-parts";
import { AttributeForm } from "@/components/admin/attribute-form";

export const metadata: Metadata = { title: "Характеристика" };

export const dynamic = "force-dynamic";

export default async function AdminAttributePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPanelPage resource="attributes">
      {async () => {
        const attribute = await prisma.attribute.findUnique({
          where: { id },
          include: {
            category: { select: { id: true, name: true } },
            _count: { select: { values: true } },
          },
        });
        if (!attribute) notFound();

        const categories = await prisma.category.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, parentId: true },
        });

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
              title={attribute.name}
              description={`Значений у товаров: ${attribute._count.values} · категория: ${attribute.category?.name ?? "общая"}`}
              actions={
                <Link
                  href="/admin/attributes"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  К списку
                </Link>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="g19-card xl:col-span-2">
                <AttributeForm
                  mode="edit"
                  categoryOptions={categoryOptions}
                  defaults={{
                    id: attribute.id,
                    name: attribute.name,
                    slug: attribute.slug,
                    categoryId: attribute.categoryId ?? "",
                    type: attribute.type,
                    unit: attribute.unit ?? "",
                    options: optionsToString(attribute.options),
                    isFilterable: attribute.isFilterable,
                    isRequired: attribute.isRequired,
                    group: attribute.group ?? "",
                    sortOrder: attribute.sortOrder,
                    isActive: attribute.isActive,
                  }}
                />
              </div>

              <AdminCard title="Значения у товаров" padded={false}>
                <AttributeValues attributeId={attribute.id} />
              </AdminCard>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}

async function AttributeValues({ attributeId }: { attributeId: string }) {
  const values = await prisma.productAttribute.findMany({
    where: { attributeId },
    take: 50,
    orderBy: { valueString: "asc" },
    select: {
      id: true,
      valueString: true,
      valueNumber: true,
      valueBool: true,
      product: { select: { id: true, name: true } },
    },
  });

  if (values.length === 0) {
    return <p className="px-5 py-6 text-center text-sm text-ink-400">Характеристика ещё не заполнена у товаров</p>;
  }

  return (
    <ul className="divide-y divide-ink-100">
      {values.map((value) => (
        <li key={value.id} className="px-5 py-2.5">
          <Link href={`/admin/products/${value.product.id}`} className="text-sm text-ink-700 hover:text-brand-700">
            {value.product.name}
          </Link>
          <p className="text-xs text-ink-400">
            {value.valueBool !== null && value.valueBool !== undefined
              ? value.valueBool
                ? "Да"
                : "Нет"
              : (value.valueString ?? value.valueNumber ?? "—")}
          </p>
        </li>
      ))}
    </ul>
  );
}
