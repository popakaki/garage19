import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import prisma from "@/lib/prisma";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard } from "@/components/admin/page-parts";
import { PageForm } from "@/components/admin/page-form";
import { Prose } from "@/components/ui";

export const metadata: Metadata = { title: "Страница" };

export const dynamic = "force-dynamic";

export default async function AdminPageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPanelPage resource="pages">
      {async () => {
        const page = await prisma.page.findUnique({ where: { id } });
        if (!page) notFound();

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={page.title}
              description={`Ссылка на сайте: /${page.slug}`}
              actions={
                <>
                  <Link
                    href={`/${page.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Открыть на сайте
                  </Link>
                  <Link
                    href="/admin/pages"
                    className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    К страницам
                  </Link>
                </>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="g19-card xl:col-span-2">
                <PageForm
                  mode="edit"
                  defaults={{
                    id: page.id,
                    slug: page.slug,
                    title: page.title,
                    content: page.content,
                    excerpt: page.excerpt ?? "",
                    isPublished: page.isPublished,
                    showInHeader: page.showInHeader,
                    showInFooter: page.showInFooter,
                    sortOrder: page.sortOrder,
                    seoTitle: page.seoTitle ?? "",
                    seoDescription: page.seoDescription ?? "",
                  }}
                />
              </div>

              <AdminCard title="Текущий вид">
                <Prose html={page.content} className="text-sm" />
              </AdminCard>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
