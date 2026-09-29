import Link from "next/link";
import type { Metadata } from "next";
import { Phone, Mail, MessageSquare } from "lucide-react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { CALLBACK_STATUSES, CALLBACK_TYPES } from "@/lib/constants";
import { formatDate, phoneHref } from "@/lib/utils";
import { buildHref, buildPagination, getPage, getPerPage, getStr, skipTake, type SearchParamsRecord } from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard, ConfirmButton } from "@/components/admin/page-parts";
import { CallbackStatusBadge, StatusBadge } from "@/components/admin/badges";
import { FilterBar, FilterItem, QuickFilters } from "@/components/admin/filters";
import { TablePagination } from "@/components/admin/data-table";
import { CallbackManageForm } from "@/components/admin/callback-forms";
import { bulkCallbackSpamAction, deleteCallbackAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Заявки" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminCallbacksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="callbacks">
      {async () => {
        const status = getStr(params, "status");
        const type = getStr(params, "type");
        const search = getStr(params, "q")?.trim();
        const from = getStr(params, "from");
        const page = getPage(params);
        const perPage = getPerPage(params, 20);

        const fromDate = from ? new Date(from) : undefined;

        const where: Prisma.CallbackRequestWhereInput = {
          ...(status && status in CALLBACK_STATUSES ? { status } : {}),
          ...(type && type in CALLBACK_TYPES ? { type } : {}),
          ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { createdAt: { gte: fromDate } } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { phone: { contains: search } },
                  { email: { contains: search, mode: "insensitive" } },
                  { message: { contains: search, mode: "insensitive" } },
                  { carInfo: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        };

        const [total, callbacks, counters, typeCounters] = await Promise.all([
          prisma.callbackRequest.count({ where }),
          prisma.callbackRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            ...skipTake(page, perPage),
            select: {
              id: true,
              type: true,
              name: true,
              phone: true,
              email: true,
              message: true,
              carInfo: true,
              status: true,
              managerComment: true,
              source: true,
              createdAt: true,
              processedAt: true,
              product: { select: { id: true, name: true, slug: true } },
            },
          }),
          prisma.callbackRequest.groupBy({ by: ["status"], _count: { _all: true } }),
          prisma.callbackRequest.groupBy({ by: ["type"], _count: { _all: true } }),
        ]);

        const pagination = buildPagination(page, perPage, total);
        const record: SearchParamsRecord = {
          ...(status ? { status } : {}),
          ...(type ? { type } : {}),
          ...(search ? { q: search } : {}),
          ...(from ? { from } : {}),
        };
        const statusMap = new Map(counters.map((row) => [row.status, row._count._all]));

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Заявки"
              description="Обратный звонок, вопросы, VIN-подбор, запись на установку и оптовые запросы."
              actions={
                <form action={bulkCallbackSpamAction} className="flex items-center gap-2">
                  <input type="hidden" name="ids" value="" />
                  <button
                    type="submit"
                    className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    Пометить выбранные спамом
                  </button>
                </form>
              }
            />

            <QuickFilters
              items={[
                { label: "Все", href: buildHref("/admin/callbacks", record, { status: null, page: 1 }), active: !status },
                ...Object.entries(CALLBACK_STATUSES).map(([key, label]) => ({
                  label,
                  href: buildHref("/admin/callbacks", record, { status: key, page: 1 }),
                  active: status === key,
                  count: statusMap.get(key) ?? 0,
                })),
              ]}
            />

            <QuickFilters
              items={[
                { label: "Все типы", href: buildHref("/admin/callbacks", record, { type: null, page: 1 }), active: !type },
                ...Object.entries(CALLBACK_TYPES).map(([key, label]) => ({
                  label,
                  href: buildHref("/admin/callbacks", record, { type: key, page: 1 }),
                  active: type === key,
                  count: typeCounters.find((row) => row.type === key)?._count._all ?? 0,
                })),
              ]}
            />

            <FilterBar action="/admin/callbacks" resetHref="/admin/callbacks">
              <FilterItem label="Поиск" htmlFor="q" width="lg">
                <input id="q" name="q" defaultValue={search ?? ""} placeholder="Имя, телефон, сообщение" className="g19-input" />
              </FilterItem>
              <FilterItem label="С даты">
                <input type="date" name="from" defaultValue={from ?? ""} className="g19-input" />
              </FilterItem>
              {status && <input type="hidden" name="status" value={status} />}
              {type && <input type="hidden" name="type" value={type} />}
            </FilterBar>

            <AdminCard
              title={`Найдено: ${total}`}
              padded={false}
              actions={
                <form action={bulkCallbackSpamAction} className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                  >
                    Пометить выбранные спамом
                  </button>
                </form>
              }
            >
              <ul className="divide-y divide-ink-100">
                  {callbacks.map((callback) => (
                    <li key={callback.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <label className="flex min-w-0 flex-1 items-start gap-3">
                          <input
                            type="checkbox"
                            name="ids"
                            value={callback.id}
                            className="mt-1 size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
                          />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-ink-900">{callback.name}</span>
                              <StatusBadge tone="outline">
                                {CALLBACK_TYPES[callback.type as keyof typeof CALLBACK_TYPES] ?? callback.type}
                              </StatusBadge>
                              <CallbackStatusBadge status={callback.status} />
                              {callback.source && <StatusBadge tone="default">{callback.source}</StatusBadge>}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                              <a href={phoneHref(callback.phone)} className="inline-flex items-center gap-1 text-brand-700">
                                <Phone className="size-3" aria-hidden />
                                {callback.phone}
                              </a>
                              {callback.email && (
                                <a href={`mailto:${callback.email}`} className="inline-flex items-center gap-1">
                                  <Mail className="size-3" aria-hidden />
                                  {callback.email}
                                </a>
                              )}
                              <span>{formatDate(callback.createdAt, true)}</span>
                            </span>
                            {callback.carInfo && (
                              <span className="mt-1 block text-xs text-ink-600">Авто: {callback.carInfo}</span>
                            )}
                            {callback.message && (
                              <span className="mt-1 block text-sm text-ink-700">
                                <MessageSquare className="mr-1 inline size-3.5 text-ink-300" aria-hidden />
                                {callback.message}
                              </span>
                            )}
                            {callback.product && (
                              <span className="mt-1 block text-xs">
                                Товар:{" "}
                                <Link href={`/admin/products/${callback.product.id}`} className="text-brand-700 hover:text-brand-800">
                                  {callback.product.name}
                                </Link>
                              </span>
                            )}
                          </span>
                        </label>

                        <div className="flex shrink-0 items-center gap-2">
                          <ConfirmButton
                            action={deleteCallbackAction}
                            id={callback.id}
                            title="Удалить заявку?"
                            description="Заявка будет удалена безвозвратно."
                          />
                        </div>
                      </div>

                      <div className="mt-3 pl-7">
                        <CallbackManageForm
                          callbackId={callback.id}
                          status={callback.status}
                          type={callback.type}
                          managerComment={callback.managerComment ?? ""}
                          isVin={callback.type === "vin"}
                        />
                      </div>
                    </li>
                  ))}
                  {callbacks.length === 0 && (
                    <li className="px-5 py-12 text-center text-sm text-ink-500">Заявок не найдено.</li>
                  )}
                </ul>
                <div className="px-5 pb-4">
                  <TablePagination basePath="/admin/callbacks" params={record} pagination={pagination} />
                </div>
            </AdminCard>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
