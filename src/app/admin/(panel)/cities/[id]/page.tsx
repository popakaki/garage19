import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { kopecksToInput } from "@/lib/utils";
import { TARIFF_PROVIDERS, PICKUP_PROVIDERS } from "@/lib/admin/labels";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { ActiveBadge, StatusBadge } from "@/components/admin/badges";
import { CityForm } from "@/components/admin/city-form";
import { PickupPointForm, TariffForm } from "@/components/admin/delivery-forms";
import {
  deletePickupPointAction,
  deleteTariffAction,
  togglePickupPointAction,
} from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Город" };

export const dynamic = "force-dynamic";

export default async function AdminCityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPanelPage resource="cities">
      {async () => {
        const city = await prisma.city.findUnique({
          where: { id },
          include: {
            tariffs: { orderBy: [{ sortOrder: "asc" }, { provider: "asc" }] },
            pickupPoints: { orderBy: [{ provider: "asc" }, { code: "asc" }], take: 200 },
            _count: { select: { orders: true } },
          },
        });
        if (!city) notFound();

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title={city.name}
              description={`Заказов в городе: ${city._count.orders} · тарифов: ${city.tariffs.length} · пунктов выдачи: ${city.pickupPoints.length}`}
              actions={
                <Link
                  href="/admin/cities"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  К городам
                </Link>
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="g19-card xl:col-span-2">
                <CityForm
                  mode="edit"
                  defaults={{
                    id: city.id,
                    name: city.name,
                    slug: city.slug,
                    region: city.region ?? "",
                    phone: city.phone ?? "",
                    address: city.address ?? "",
                    workTime: city.workTime ?? "",
                    deliveryDays: city.deliveryDays,
                    freeDeliveryFrom: city.freeDeliveryFrom ? kopecksToInput(city.freeDeliveryFrom) : "",
                    pickupAvailable: city.pickupAvailable,
                    deliveryAvailable: city.deliveryAvailable,
                    isDefault: city.isDefault,
                    isActive: city.isActive,
                    sortOrder: city.sortOrder,
                    seoTitle: city.seoTitle ?? "",
                    seoDescription: city.seoDescription ?? "",
                  }}
                />
              </div>

              <div className="space-y-4">
                <AdminCard title="Как работает" padded={false}>
                  <div className="space-y-2 px-5 py-4 text-xs text-ink-500">
                    <p>
                      Тарифы используются при расчёте стоимости доставки на оформлении заказа. Провайдеры:{" "}
                      {Object.keys(TARIFF_PROVIDERS).join(", ")}.
                    </p>
                    <p>
                      Пункты выдачи показываются покупателю при выборе доставки в ПВЗ. Провайдеры:{" "}
                      {Object.keys(PICKUP_PROVIDERS).join(", ")}.
                    </p>
                  </div>
                </AdminCard>
              </div>
            </div>

            <AdminCard title={`Тарифы доставки (${city.tariffs.length})`} padded={false}>
              {city.tariffs.length > 0 && (
                <div className="overflow-x-auto border-b border-ink-100">
                  <table className="w-full min-w-[44rem] text-sm">
                    <thead>
                      <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                        <th className="px-5 py-2.5 text-left font-semibold">Тариф</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Служба</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Стоимость</th>
                        <th className="px-3 py-2.5 text-center font-semibold">Срок</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Мин. заказ</th>
                        <th className="px-3 py-2.5 text-center font-semibold">Статус</th>
                        <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {city.tariffs.map((tariff) => (
                        <tr key={tariff.id} className="border-b border-ink-100 last:border-0">
                          <td className="px-5 py-2.5 font-medium text-ink-800">{tariff.name}</td>
                          <td className="px-3 py-2.5 text-ink-600">
                            {TARIFF_PROVIDERS[tariff.provider] ?? tariff.provider}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-ink-900">{formatPrice(tariff.price)}</td>
                          <td className="px-3 py-2.5 text-center text-ink-600">
                            {tariff.minDays}–{tariff.maxDays} дн.
                          </td>
                          <td className="px-3 py-2.5 text-right text-ink-600">
                            {tariff.minOrderTotal ? formatPrice(tariff.minOrderTotal) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <ActiveBadge active={tariff.isActive} />
                          </td>
                          <td className="px-5 py-2.5">
                            <div className="flex justify-end">
                              <ConfirmButton
                                action={deleteTariffAction}
                                id={tariff.id}
                                hiddenFields={{ cityId: city.id }}
                                title="Удалить тариф?"
                                description="Тариф перестанет предлагаться покупателям."
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <TariffForm cityId={city.id} />
            </AdminCard>

            <AdminCard title={`Пункты выдачи (${city.pickupPoints.length})`} padded={false}>
              {city.pickupPoints.length > 0 && (
                <div className="overflow-x-auto border-b border-ink-100">
                  <table className="w-full min-w-[48rem] text-sm">
                    <thead>
                      <tr className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
                        <th className="px-5 py-2.5 text-left font-semibold">Код</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Служба</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Адрес</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Режим работы</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Координаты</th>
                        <th className="px-3 py-2.5 text-center font-semibold">Статус</th>
                        <th className="px-5 py-2.5 text-right font-semibold">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {city.pickupPoints.map((point) => (
                        <tr key={point.id} className="border-b border-ink-100 last:border-0">
                          <td className="px-5 py-2.5">
                            <p className="font-medium text-ink-800">{point.code}</p>
                            {point.name && <p className="text-xs text-ink-400">{point.name}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-ink-600">{PICKUP_PROVIDERS[point.provider] ?? point.provider}</td>
                          <td className="px-3 py-2.5 text-ink-600">{point.address}</td>
                          <td className="px-3 py-2.5 text-xs text-ink-500">{point.workTime ?? "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-ink-500">
                            {point.lat !== null && point.lng !== null ? `${point.lat}, ${point.lng}` : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              <StatusBadge tone={point.isActive ? "success" : "default"}>
                                {point.isActive ? "активен" : "выключен"}
                              </StatusBadge>
                            </div>
                          </td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <form action={togglePickupPointAction}>
                                <input type="hidden" name="id" value={point.id} />
                                <input type="hidden" name="cityId" value={city.id} />
                                <button
                                  type="submit"
                                  className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                >
                                  {point.isActive ? "Выключить" : "Включить"}
                                </button>
                              </form>
                              <ConfirmButton
                                action={deletePickupPointAction}
                                id={point.id}
                                hiddenFields={{ cityId: city.id }}
                                title="Удалить пункт выдачи?"
                                description="Покупатели больше не увидят этот ПВЗ."
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <PickupPointForm cityId={city.id} />
            </AdminCard>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
