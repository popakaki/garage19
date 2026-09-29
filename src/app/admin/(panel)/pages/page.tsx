import Link from "next/link";
import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatDate, truncate } from "@/lib/utils";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { StatusBadge } from "@/components/admin/badges";
import { PageForm } from "@/components/admin/page-form";
import { deletePageAction, togglePagePublishedAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Страницы" };

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  return (
    <AdminPanelPage resource="pages">
      {async () => {
        const pages = await prisma.page.findMany({
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            isPublished: true,
            showInHeader: true,
            showInFooter: true,
            sortOrder: true,
            updatedAt: true,
          },
        });

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Страницы"
              description="Статические страницы: доставка, оплата, гарантия, о компании. HTML с предпросмотром."
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <AdminCard title={`Страницы (${pages.length})`} padded={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                          <th className="px-5 py-2.5 text-left font-semibold">Страница</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Slug</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Показ</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Обновлена</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pages.map((page) => (
                          <tr key={page.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                            <td className="px-5 py-2.5">
                              <Link
                                href={`/admin/pages/${page.id}`}
                                className="font-medium text-ink-800 hover:text-brand-700"
                              >
                                {page.title}
                              </Link>
                              {page.excerpt && <p className="text-xs text-ink-400">{truncate(page.excerpt, 70)}</p>}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-ink-500">/{page.slug}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                <StatusBadge tone={page.isPublished ? "success" : "default"}>
                                  {page.isPublished ? "опубликована" : "черновик"}
                                </StatusBadge>
                                {page.showInHeader && <StatusBadge tone="info">шапка</StatusBadge>}
                                {page.showInFooter && <StatusBadge tone="outline">подвал</StatusBadge>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-ink-500">{formatDate(page.updatedAt, true)}</td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <form action={togglePagePublishedAction}>
                                  <input type="hidden" name="id" value={page.id} />
                                  <button
                                    type="submit"
                                    className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                  >
                                    {page.isPublished ? "Снять" : "Опубликовать"}
                                  </button>
                                </form>
                                <Link
                                  href={`/admin/pages/${page.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                >
                                  <Pencil className="size-3.5" aria-hidden />
                                  Изменить
                                </Link>
                                <ConfirmButton
                                  action={deletePageAction}
                                  id={page.id}
                                  title="Удалить страницу?"
                                  description="Ссылка на страницу перестанет работать."
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pages.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-5 py-12 text-center text-sm text-ink-500">
                              Страниц нет — создайте первую справа.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </AdminCard>
              </div>

              <div>
                <AdminCard title="Новая страница">
                  <PageForm mode="create" defaults={{ isPublished: true, showInFooter: true, sortOrder: 100 }} />
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
