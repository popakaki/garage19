import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader } from "@/components/admin/page-parts";
import { ProductForm, type ProductFormOption } from "@/components/admin/product-form";
import { getProductAttributeDefs } from "@/lib/admin/products";

export const metadata: Metadata = { title: "Новый товар" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[value.length - 1] : value;
}

export default async function AdminProductCreatePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="products">
      {async () => {
        const [categories, brandsList, suppliers] = await Promise.all([
          prisma.category.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true, parentId: true },
          }),
          prisma.brand.findMany({
            orderBy: [{ name: "asc" }],
            select: { id: true, name: true },
            take: 500,
          }),
          prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
        ]);

        const roots = categories.filter((category) => !category.parentId);
        const children = categories.filter((category) => category.parentId);
        const categoryOptions: ProductFormOption[] = roots.flatMap((root) => [
          { value: root.id, label: root.name },
          ...children
            .filter((child) => child.parentId === root.id)
            .map((child) => ({ value: child.id, label: `— ${child.name}` })),
        ]);

        // Категория выбирается на этом же экране: от неё зависит набор характеристик.
        const categoryId = single(params, "categoryId");
        const attributeDefs = await getProductAttributeDefs(categoryId);

        return (
          <div>
            <AdminPageHeader
              title="Новый товар"
              description="Заполните карточку товара. Изображения, документы и совместимость можно добавить сразу или после создания."
            />

            <ProductForm
              mode="create"
              categoryOptions={categoryOptions}
              brandOptions={brandsList.map((brand) => ({ value: brand.id, label: brand.name }))}
              supplierOptions={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
              attributeDefs={attributeDefs}
              attributeValues={{}}
              cancelHref="/admin/products"
              defaults={{
                unit: "шт",
                stock: "0",
                reserved: "0",
                sortOrder: "100",
                isActive: true,
                fitmentType: "specific",
                categoryId,
              }}
            />
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
