import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { toDateTimeLocal } from "@/lib/admin/format";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader } from "@/components/admin/page-parts";
import { BannerForm } from "@/components/admin/banner-form";

export const metadata: Metadata = { title: "Баннер" };

export const dynamic = "force-dynamic";

export default async function AdminBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPanelPage resource="banners">
      {async () => {
        const banner = await prisma.banner.findUnique({ where: { id } });
        if (!banner) notFound();

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={banner.title}
              description={`Позиция: ${banner.position} · порядок: ${banner.sortOrder}`}
              actions={
                <Link
                  href="/admin/banners"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  К баннерам
                </Link>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="g19-card xl:col-span-2">
                <BannerForm
                  mode="edit"
                  defaults={{
                    id: banner.id,
                    title: banner.title,
                    subtitle: banner.subtitle ?? "",
                    description: banner.description ?? "",
                    image: banner.image,
                    mobileImage: banner.mobileImage ?? "",
                    badge: banner.badge ?? "",
                    linkUrl: banner.linkUrl ?? "",
                    linkText: banner.linkText ?? "",
                    position: banner.position,
                    textAlign: banner.textAlign,
                    sortOrder: banner.sortOrder,
                    isActive: banner.isActive,
                    startsAt: toDateTimeLocal(banner.startsAt),
                    endsAt: toDateTimeLocal(banner.endsAt),
                  }}
                />
              </div>

              <div className="g19-card h-fit overflow-hidden">
                <div className="border-b border-ink-100 px-5 py-3">
                  <h2 className="text-sm font-bold text-ink-900">Предпросмотр изображения</h2>
                </div>
                <div className="p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={banner.image} alt="" className="w-full rounded-xl border border-ink-200 object-cover" />
                  {banner.mobileImage && (
                    <>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Мобильная версия</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.mobileImage}
                        alt=""
                        className="mt-2 w-40 rounded-xl border border-ink-200 object-cover"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
