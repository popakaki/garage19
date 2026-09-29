import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatPrice, PLACEHOLDER_IMAGE } from "@/lib/utils";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard } from "@/components/admin/page-parts";
import { CategoryForm } from "@/components/admin/category-form";
import { ActiveBadge } from "@/components/admin/badges";

export const metadata: Metadata = { title: "Категория" };

export const dynamic = "force-dynamic";

export default async function AdminCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPanelPage resource="categories">
      {async () => {
        const category = await prisma.category.findUnique({
          where: { id },
          include: {
            parent: { select: { id: true, name: true } },
            children: { select: { id: true, name: true, slug: true, _count: { select: { products: true } } } },
            _count: { select: { products: true } },
          },
        });

        if (!category) notFound();

        const [roots, categories, products] = await Promise.all([
          prisma.category.findMany({
            where: { parentId: null },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true, parentId: true },
          }),
          prisma.category.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true, parentId: true },
          }),
          prisma.product.findMany({
            where: { categoryId: category.id },
            orderBy: { name: "asc" },
            take: 20,
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              isActive: true,
              images: { select: { url: true, isPrimary: true }, take: 1 },
            },
          }),
        ]);

        const parentOptions = roots
          .filter((root) => root.id !== category.id)
          .map((root) => ({ value: root.id, label: root.name }));

        const categoryOptions = roots.flatMap((root) => [
          { value: root.id, label: root.name },
          ...categories
            .filter((child) => child.parentId === root.id)
            .map((child) => ({ value: child.id, label: `— ${child.name}` })),
        ]);

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={category.name}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <ActiveBadge active={category.isActive} />
                  <span className="text-xs text-ink-400">slug: {category.slug}</span>
                  {category.parent && <span className="text-xs text-ink-400">родитель: {category.parent.name}</span>}
                  <span className="text-xs text-ink-400">товаров: {category._count.products}</span>
                </span>
              }
              actions={
                <Link
                  href="/admin/categories"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  К дереву категорий
                </Link>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <CategoryForm
                  mode="edit"
                  categoryOptions={categoryOptions}
                  parentOptions={parentOptions}
                  cancelHref="/admin/categories"
                  defaults={{
                    id: category.id,
                    name: category.name,
                    slug: category.slug,
                    parentId: category.parentId ?? "",
                    description: category.description ?? "",
                    image: category.image ?? "",
                    icon: category.icon ?? "",
                    sortOrder: category.sortOrder,
                    isActive: category.isActive,
                    showInMenu: category.showInMenu,
                    seoTitle: category.seoTitle ?? "",
                    seoDescription: category.seoDescription ?? "",
                    seoKeywords: category.seoKeywords ?? "",
                  }}
                />
              </div>

              <div className="space-y-4">
                {category.children.length > 0 && (
                  <AdminCard title="Подкатегории" padded={false}>
                    <ul className="divide-y divide-ink-100">
                      {category.children.map((child) => (
                        <li key={child.id} className="flex items-center justify-between gap-2 px-5 py-2.5">
                          <Link href={`/admin/categories/${child.id}`} className="text-sm text-ink-700 hover:text-brand-700">
                            {child.name}
                          </Link>
                          <span className="text-xs text-ink-400">{child._count.products} тов.</span>
                        </li>
                      ))}
                    </ul>
                  </AdminCard>
                )}

                <AdminCard title="Товары категории" padded={false}>
                  {products.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-ink-400">Товаров нет</p>
                  ) : (
                    <ul className="divide-y divide-ink-100">
                      {products.map((product) => (
                        <li key={product.id} className="flex items-center gap-3 px-5 py-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.images[0]?.url ?? PLACEHOLDER_IMAGE}
                            alt=""
                            className="size-9 shrink-0 rounded-lg border border-ink-200 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="block truncate text-sm text-ink-700 hover:text-brand-700"
                            >
                              {product.name}
                            </Link>
                            <p className="text-xs text-ink-400">
                              {formatPrice(product.price)} · остаток {product.stock}
                            </p>
                          </div>
                          {!product.isActive && <span className="text-xs text-ink-400">скрыт</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {category._count.products > products.length && (
                    <div className="border-t border-ink-100 px-5 py-2.5">
                      <Link
                        href={`/admin/products?category=${category.id}`}
                        className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                      >
                        Показать все товары категории →
                      </Link>
                    </div>
                  )}
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
