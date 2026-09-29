import Link from "next/link";
import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ActiveBadge, StatusBadge } from "@/components/admin/badges";
import { CityForm } from "@/components/admin/city-form";
import { deleteCityAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Города и доставка" };

export const dynamic = "force-dynamic";

export default async function AdminCitiesPage() {
  return (
    <AdminPanelPage resource="cities">
      {async () => {
        const cities = await prisma.city.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            region: true,
            phone: true,
            deliveryDays: true,
            freeDeliveryFrom: true,
            pickupAvailable: true,
            deliveryAvailable: true,
            isDefault: true,
            isActive: true,
            _count: { select: { tariffs: true, pickupPoints: true, orders: true } },
          },
        });

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Города и доставка"
              description="Контакты городов, сроки доставки, тарифы и пункты выдачи."
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <AdminCard title={`Города (${cities.length})`} padded={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[48rem] text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                          <th className="px-5 py-2.5 text-left font-semibold">Город</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Доставка</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Тарифы</th>
                          <th className="px-3 py-2.5 text-center font-semibold">ПВЗ</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Заказы</th>
                          <th className="px-3 py-2.5 text-left font-semibold">Статус</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cities.map((city) => (
                          <tr key={city.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                            <td className="px-5 py-2.5">
                              <Link href={`/admin/cities/${city.id}`} className="font-medium text-ink-800 hover:text-brand-700">
                                {city.name}
                              </Link>
                              <p className="text-xs text-ink-400">
                                {city.region ?? "регион не указан"}
                                {city.phone ? ` · ${city.phone}` : ""}
                              </p>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-ink-600">
                              <p>{city.deliveryDays} дн.</p>
                              <p>бесплатно от {city.freeDeliveryFrom ? formatPrice(city.freeDeliveryFrom) : "—"}</p>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <Link
                                href={`/admin/cities/${city.id}`}
                                className="font-semibold text-brand-700 hover:text-brand-800"
                              >
                                {city._count.tariffs}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-center text-ink-600">{city._count.pickupPoints}</td>
                            <td className="px-3 py-2.5 text-center text-ink-600">{city._count.orders}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <ActiveBadge active={city.isActive} />
                                {city.isDefault && <StatusBadge tone="brand">по умолчанию</StatusBadge>}
                                {city.pickupAvailable && <StatusBadge tone="outline">самовывоз</StatusBadge>}
                                {!city.deliveryAvailable && <StatusBadge tone="warning">без доставки</StatusBadge>}
                              </div>
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/admin/cities/${city.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                >
                                  <Pencil className="size-3.5" aria-hidden />
                                  Тарифы
                                </Link>
                                <ConfirmButton
                                  action={deleteCityAction}
                                  id={city.id}
                                  title="Удалить город?"
                                  description="Тарифы и пункты выдачи удалятся. Города с заказами удалить нельзя."
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                        {cities.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-500">
                              Городов нет — добавьте первый справа.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </AdminCard>
              </div>

              <div>
                <AdminCard title="Новый город">
                  <CityForm
                    mode="create"
                    defaults={{
                      deliveryDays: 3,
                      pickupAvailable: true,
                      deliveryAvailable: true,
                      isActive: true,
                      sortOrder: 100,
                    }}
                  />
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
