import Link from "next/link";
import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import prisma from "@/lib/prisma";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ActiveBadge, StatusBadge } from "@/components/admin/badges";
import { CategoryForm } from "@/components/admin/category-form";
import { deleteCategoryAction, updateCategoryOrderAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Категории" };

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  return (
    <AdminPanelPage resource="categories">
      {async () => {
        const categories = await prisma.category.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            sortOrder: true,
            isActive: true,
            showInMenu: true,
            icon: true,
            seoTitle: true,
            _count: { select: { products: true, children: true } },
          },
        });

        const roots = categories.filter((category) => !category.parentId);
        const childrenOf = (parentId: string) => categories.filter((category) => category.parentId === parentId);
        const parentOptions = roots.map((root) => ({
          value: root.id,
          label: root.name,
        }));
        const categoryOptions = roots.flatMap((root) => [
          { value: root.id, label: root.name },
          ...childrenOf(root.id).map((child) => ({ value: child.id, label: `— ${child.name}` })),
        ]);

        const rows = roots.flatMap((root) => [root, ...childrenOf(root.id)]);

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Категории"
              description="Дерево из двух уровней, порядок сортировки, SEO и изображения."
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <AdminCard title={`Дерево категорий (${rows.length})`} padded={false}>
                  <form action={updateCategoryOrderAction}>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[44rem] text-sm">
                        <thead>
                          <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                            <th className="px-5 py-2.5 text-left font-semibold">Категория</th>
                            <th className="px-3 py-2.5 text-left font-semibold">Slug</th>
                            <th className="px-3 py-2.5 text-center font-semibold">Товаров</th>
                            <th className="px-3 py-2.5 text-center font-semibold">Порядок</th>
                            <th className="px-3 py-2.5 text-left font-semibold">Статус</th>
                            <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((category) => (
                            <tr key={category.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                              <td className="px-5 py-2.5">
                                <span className={category.parentId ? "pl-5 text-ink-600" : "font-semibold text-ink-900"}>
                                  {category.parentId ? "└ " : ""}
                                  {category.name}
                                </span>
                                {category.seoTitle && <p className="pl-5 text-xs text-ink-400">{category.seoTitle}</p>}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-ink-500">{category.slug}</td>
                              <td className="px-3 py-2.5 text-center">
                                {category._count.products > 0 ? (
                                  <Link
                                    href={`/admin/products?category=${category.id}`}
                                    className="font-semibold text-brand-700 hover:text-brand-800"
                                  >
                                    {category._count.products}
                                  </Link>
                                ) : (
                                  <span className="text-ink-400">0</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <input
                                  type="number"
                                  name={`order_${category.id}`}
                                  defaultValue={category.sortOrder}
                                  aria-label={`Порядок ${category.name}`}
                                  className="w-16 rounded-lg border border-ink-200 px-2 py-1 text-center text-sm"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap items-center gap-1">
                                  <ActiveBadge active={category.isActive} />
                                  {category._count.children > 0 && (
                                    <StatusBadge tone="outline">{category._count.children} подкат.</StatusBadge>
                                  )}
                                  {!category.showInMenu && <StatusBadge tone="outline">вне меню</StatusBadge>}
                                </div>
                              </td>
                              <td className="px-5 py-2.5">
                                <div className="flex items-center justify-end gap-1">
                                  <Link
                                    href={`/admin/categories/${category.id}`}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                  >
                                    <Pencil className="size-3.5" aria-hidden />
                                    Изменить
                                  </Link>
                                  <ConfirmButton
                                    action={deleteCategoryAction}
                                    id={category.id}
                                    title="Удалить категорию?"
                                    description={
                                      category._count.products > 0 || category._count.children > 0
                                        ? "В категории есть товары или подкатегории — удаление будет отклонено."
                                        : "Категория будет удалена безвозвратно."
                                    }
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-5 py-12 text-center text-sm text-ink-500">
                                Категорий пока нет — создайте первую справа.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {rows.length > 0 && (
                      <div className="flex items-center justify-between gap-3 border-t border-ink-100 bg-ink-50/60 px-5 py-3">
                        <p className="text-xs text-ink-500">Порядок сортировки сохраняется одной кнопкой.</p>
                        <button
                          type="submit"
                          className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800"
                        >
                          Сохранить порядок
                        </button>
                      </div>
                    )}
                  </form>
                </AdminCard>
              </div>

              <div>
                <AdminCard title="Новая категория">
                  <CategoryForm mode="create" defaults={{ sortOrder: 100, isActive: true, showInMenu: true }} parentOptions={parentOptions} cancelHref="/admin/categories" />
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
