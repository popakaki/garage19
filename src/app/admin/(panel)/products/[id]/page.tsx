import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import prisma from "@/lib/prisma";
import { kopecksToInput } from "@/lib/utils";
import { getEntityHistory } from "@/lib/admin/audit";
import { getProductAttributeDefs, getProductAttributeValues, getRelatedProductOptions } from "@/lib/admin/products";
import { countProductFitments, getProductFitments } from "@/lib/admin/fitments";
import { getCarTree } from "@/lib/admin/cars";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ProductForm, type ProductFormOption } from "@/components/admin/product-form";
import {
  ProductDocumentsForm,
  ProductImagesForm,
  ProductPriceForm,
  ProductRelationsForm,
} from "@/components/admin/product-related-forms";
import { ProductFitmentCard } from "@/components/admin/product-fitment";
import { ActiveBadge, MiniRating, StatusBadge } from "@/components/admin/badges";
import { deleteProductAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Товар" };

export const dynamic = "force-dynamic";

function money(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : kopecksToInput(value);
}

export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPanelPage resource="products">
      {async ({ user }) => {
        const product = await prisma.product.findUnique({
          where: { id },
          include: {
            category: { select: { id: true, name: true } },
            manufacturer: { select: { id: true, name: true } },
            supplier: { select: { id: true, name: true } },
            images: { orderBy: { sortOrder: "asc" } },
            documents: { orderBy: { sortOrder: "asc" } },
            relationsFrom: {
              orderBy: { sortOrder: "asc" },
              select: { id: true, type: true, relatedProduct: { select: { id: true, name: true } } },
            },
            relationsTo: {
              select: { id: true, type: true, product: { select: { id: true, name: true } } },
            },
          },
        });

        if (!product) notFound();

        const [categories, brandsList, suppliers, attributeDefs, attributeValues, fitments, relatedProducts, carTree, auditTrail, fitmentCount] =
          await Promise.all([
            prisma.category.findMany({
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              select: { id: true, name: true, parentId: true },
            }),
            prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true }, take: 500 }),
            prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
            getProductAttributeDefs(product.categoryId),
            getProductAttributeValues(product.id),
            getProductFitments(product.id, 100),
            getRelatedProductOptions(product.id, 200),
            getCarTree({ includeModifications: true }),
            getEntityHistory("product", product.id, 6),
            countProductFitments(product.id),
          ]);

        const roots = categories.filter((category) => !category.parentId);
        const children = categories.filter((category) => category.parentId);
        const categoryOptions: ProductFormOption[] = roots.flatMap((root) => [
          { value: root.id, label: root.name },
          ...children
            .filter((child) => child.parentId === root.id)
            .map((child) => ({ value: child.id, label: `— ${child.name}` })),
        ]);

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={product.name}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <ActiveBadge active={product.isActive} activeText="Показан" inactiveText="Скрыт" />
                  <StatusBadge tone="outline">{product.category.name}</StatusBadge>
                  {product.fitmentType === "universal" ? (
                    <StatusBadge tone="info">Универсальный</StatusBadge>
                  ) : (
                    <StatusBadge tone={fitmentCount > 0 ? "success" : "warning"}>
                      {fitmentCount > 0 ? `${fitmentCount} привязок` : "Нет привязок"}
                    </StatusBadge>
                  )}
                  <MiniRating value={product.ratingAvg} count={product.ratingCount} />
                  <span className="text-xs text-ink-400">slug: {product.slug}</span>
                </span>
              }
              actions={
                <>
                  <Link
                    href={`/product/${product.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    На сайте
                  </Link>
                  {user.role === "admin" && (
                    <ConfirmButton
                      action={deleteProductAction}
                      id={product.id}
                      variant="button"
                      label="Удалить"
                      title="Удалить товар?"
                      description="Если товар есть в заказах, он будет скрыт с витрины вместо удаления."
                    />
                  )}
                </>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <ProductForm
                  mode="edit"
                  categoryOptions={categoryOptions}
                  brandOptions={brandsList.map((brand) => ({ value: brand.id, label: brand.name }))}
                  supplierOptions={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
                  attributeDefs={attributeDefs}
                  attributeValues={attributeValues}
                  cancelHref="/admin/products"
                  defaults={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    sku: product.sku ?? "",
                    categoryId: product.categoryId,
                    manufacturerId: product.manufacturerId ?? "",
                    brandName: product.brandName ?? "",
                    shortDescription: product.shortDescription ?? "",
                    description: product.description ?? "",
                    warrantyMonths: product.warrantyMonths,
                    price: money(product.price),
                    oldPrice: money(product.oldPrice),
                    purchasePrice: money(product.purchasePrice),
                    stock: product.stock,
                    reserved: product.reserved,
                    unit: product.unit,
                    weight: product.weight,
                    lengthMm: product.lengthMm,
                    widthMm: product.widthMm,
                    heightMm: product.heightMm,
                    fitmentType: product.fitmentType,
                    fitmentNote: product.fitmentNote ?? "",
                    capacityKg: product.capacityKg,
                    verticalLoadKg: product.verticalLoadKg,
                    volumeL: product.volumeL,
                    material: product.material ?? "",
                    mountPlace: product.mountPlace ?? "",
                    profile: product.profile ?? "",
                    doorsCount: product.doorsCount,
                    lockIncluded: product.lockIncluded ?? false,
                    bumperCut: product.bumperCut ?? false,
                    electricIncluded: product.electricIncluded ?? false,
                    rentAvailable: product.rentAvailable,
                    isActive: product.isActive,
                    isFeatured: product.isFeatured,
                    isHit: product.isHit,
                    isNew: product.isNew,
                    sortOrder: product.sortOrder,
                    seoTitle: product.seoTitle ?? "",
                    seoDescription: product.seoDescription ?? "",
                    seoKeywords: product.seoKeywords ?? "",
                    supplierId: product.supplierId ?? "",
                    externalId: product.externalId ?? "",
                    images: product.images.map((image) => image.url),
                  }}
                />
              </div>

              <div className="space-y-4">
                <AdminCard title="Быстрые данные" description="Заказы, просмотры и служебные идентификаторы">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Продаж</dt>
                      <dd className="font-semibold text-ink-900">{product.salesCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Просмотров</dt>
                      <dd className="font-semibold text-ink-900">{product.viewsCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Поставщик</dt>
                      <dd className="text-ink-800">{product.supplier?.name ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">ID поставщика</dt>
                      <dd className="text-ink-800">{product.externalId ?? "—"}</dd>
                    </div>
                  </dl>
                </AdminCard>

                <AdminCard title="Изменить цену">
                  <ProductPriceForm productId={product.id} />
                </AdminCard>

                <AdminCard title="Изображения" padded={false}>
                  <ProductImagesForm
                    productId={product.id}
                    images={product.images.map((image) => ({ url: image.url, alt: image.alt }))}
                  />
                </AdminCard>

                <AdminCard title="Журнал изменений" padded={false}>
                  {auditTrail.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-ink-400">Записей нет</p>
                  ) : (
                    <ul className="divide-y divide-ink-100">
                      {auditTrail.map((entry) => (
                        <li key={entry.id} className="px-5 py-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <StatusBadge tone="outline">{entry.action}</StatusBadge>
                            <span className="text-ink-400">{entry.createdAt.toLocaleString("ru-RU")}</span>
                          </div>
                          <p className="mt-1 text-ink-500">{entry.user?.name ?? "система"}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </AdminCard>
              </div>
            </div>

            <AdminCard
              title="Совместимость с автомобилями"
              description="Быстрая привязка и список действующих привязок. Массовые операции — в разделе «Совместимость»."
              padded={false}
              actions={
                <Link href="/admin/compatibility" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                  Массовая привязка →
                </Link>
              }
            >
              <ProductFitmentCard
                productId={product.id}
                brands={carTree.brands}
                fitments={fitments.map((fitment) => ({
                  id: fitment.id,
                  yearFrom: fitment.yearFrom,
                  yearTo: fitment.yearTo,
                  brand: { name: fitment.brand.name },
                  model: fitment.model ? { name: fitment.model.name } : null,
                  generation: fitment.generation
                    ? { name: fitment.generation.name, yearFrom: fitment.generation.yearFrom, yearTo: fitment.generation.yearTo }
                    : null,
                  modification: fitment.modification ? { name: fitment.modification.name } : null,
                }))}
              />
            </AdminCard>

            <div className="grid gap-4 xl:grid-cols-2">
              <AdminCard title="Документы" padded={false}>
                <ProductDocumentsForm
                  productId={product.id}
                  documents={product.documents.map((document) => ({
                    id: document.id,
                    type: document.type,
                    title: document.title,
                    url: document.url,
                  }))}
                />
              </AdminCard>

              <AdminCard title="Связи товара" description="Аксессуары, аналоги, похожие" padded={false}>
                <ProductRelationsForm
                  productId={product.id}
                  products={relatedProducts}
                  relations={product.relationsFrom.map((relation) => ({
                    id: relation.id,
                    type: relation.type,
                    relatedProduct: { id: relation.relatedProduct.id, name: relation.relatedProduct.name },
                  }))}
                />
                {product.relationsTo.length > 0 && (
                  <div className="border-t border-ink-100 px-5 py-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Ссылаются на этот товар
                    </p>
                    <ul className="space-y-1 text-sm text-ink-600">
                      {product.relationsTo.map((relation) => (
                        <li key={relation.id}>
                          <Link href={`/admin/products/${relation.product.id}`} className="hover:text-brand-700">
                            {relation.product.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AdminCard>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
