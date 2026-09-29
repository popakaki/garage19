import Link from "next/link";
import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import prisma from "@/lib/prisma";
import { BANNER_POSITIONS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { toDateTimeLocal } from "@/lib/admin/format";
import { buildHref, getStr } from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ActiveBadge, StatusBadge } from "@/components/admin/badges";
import { QuickFilters } from "@/components/admin/filters";
import { BannerForm } from "@/components/admin/banner-form";
import { deleteBannerAction, toggleBannerAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Баннеры" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminBannersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="banners">
      {async () => {
        const position = getStr(params, "position");

        const where = position && position in BANNER_POSITIONS ? { position } : {};

        const [banners, counters] = await Promise.all([
          prisma.banner.findMany({
            where,
            orderBy: [{ position: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
            select: {
              id: true,
              title: true,
              subtitle: true,
              badge: true,
              image: true,
              linkUrl: true,
              position: true,
              sortOrder: true,
              isActive: true,
              startsAt: true,
              endsAt: true,
              createdAt: true,
            },
          }),
          prisma.banner.groupBy({ by: ["position"], _count: { _all: true } }),
        ]);

        const now = new Date();
        const record: Record<string, string> = position ? { position } : {};

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Баннеры"
              description="Главный слайдер, промо-блоки и баннеры категорий. Порядок и расписание показа."
            />

            <QuickFilters
              items={[
                { label: "Все", href: buildHref("/admin/banners", record, { position: null }), active: !position },
                ...Object.entries(BANNER_POSITIONS).map(([key, label]) => ({
                  label,
                  href: buildHref("/admin/banners", record, { position: key }),
                  active: position === key,
                  count: counters.find((row) => row.position === key)?._count._all ?? 0,
                })),
              ]}
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                {banners.length === 0 ? (
                  <AdminCard>
                    <p className="py-8 text-center text-sm text-ink-400">Баннеров нет — создайте первый справа.</p>
                  </AdminCard>
                ) : (
                  banners.map((banner) => {
                    const scheduleActive =
                      (!banner.startsAt || banner.startsAt <= now) && (!banner.endsAt || banner.endsAt >= now);
                    return (
                      <AdminCard key={banner.id} padded={false}>
                        <div className="flex flex-wrap gap-4 p-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={banner.image}
                            alt=""
                            className="h-24 w-40 shrink-0 rounded-xl border border-ink-200 object-cover"
                          />
                          <div className="min-w-56 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-ink-900">{banner.title}</h3>
                              <StatusBadge tone="outline">
                                {BANNER_POSITIONS[banner.position as keyof typeof BANNER_POSITIONS] ?? banner.position}
                              </StatusBadge>
                              <ActiveBadge active={banner.isActive} activeText="Показывается" inactiveText="Скрыт" />
                              {!scheduleActive && <StatusBadge tone="warning">вне расписания</StatusBadge>}
                              {banner.badge && <StatusBadge tone="brand">{banner.badge}</StatusBadge>}
                            </div>
                            {banner.subtitle && <p className="mt-1 text-sm text-ink-600">{banner.subtitle}</p>}
                            <p className="mt-1 text-xs text-ink-400">
                              Порядок: {banner.sortOrder} · создан {formatDate(banner.createdAt)}
                              {banner.startsAt ? ` · с ${formatDate(banner.startsAt, true)}` : ""}
                              {banner.endsAt ? ` · по ${formatDate(banner.endsAt, true)}` : ""}
                            </p>
                            {banner.linkUrl && (
                              <p className="mt-1 truncate text-xs text-ink-400">Ссылка: {banner.linkUrl}</p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Link
                                href={`/admin/banners/${banner.id}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                              >
                                <Pencil className="size-3.5" aria-hidden />
                                Изменить
                              </Link>
                              <form action={toggleBannerAction}>
                                <input type="hidden" name="id" value={banner.id} />
                                <button
                                  type="submit"
                                  className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                >
                                  {banner.isActive ? "Скрыть" : "Показать"}
                                </button>
                              </form>
                              <ConfirmButton
                                action={deleteBannerAction}
                                id={banner.id}
                                variant="button"
                                title="Удалить баннер?"
                                description="Баннер исчезнет с главной страницы."
                              />
                            </div>
                          </div>
                        </div>
                      </AdminCard>
                    );
                  })
                )}
              </div>

              <div>
                <AdminCard title="Новый баннер">
                  <BannerForm mode="create" defaults={{ position: position ?? "hero", isActive: true, sortOrder: 100 }} />
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
