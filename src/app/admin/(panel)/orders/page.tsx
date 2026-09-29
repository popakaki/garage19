import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";
import { buildHref, buildPagination, getPage, getPerPage, getSort, getStr, skipTake, type SearchParamsRecord } from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard } from "@/components/admin/page-parts";
import { DataTable, TablePagination, type Column } from "@/components/admin/data-table";
import { FilterBar, FilterItem, QuickFilters } from "@/components/admin/filters";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/badges";

export const metadata: Metadata = { title: "Заказы" };

export const dynamic = "force-dynamic";

type OrdersSearchParams = Record<string, string | string[] | undefined>;

type OrderRow = {
  id: string;
  number: string;
  customerName: string;
  customerPhone: string;
  cityName: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  _count: { items: number };
};

const SORT_FIELDS = ["createdAt", "total", "number", "status"] as const;

function toRecord(params: OrdersSearchParams): SearchParamsRecord {
  const record: SearchParamsRecord = {};
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) record[key] = value;
    else if (value !== undefined) record[key] = value;
  }
  return record;
}

function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<OrdersSearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="orders">
      {async () => {
        const search = getStr(params, "q")?.trim();
        const status = getStr(params, "status");
        const payment = getStr(params, "payment");
        const delivery = getStr(params, "delivery");
        const from = parseDate(getStr(params, "from"));
        const to = parseDate(getStr(params, "to"), true);
        const page = getPage(params);
        const perPage = getPerPage(params);
        const sort = getSort(params, SORT_FIELDS, "createdAt", "desc");

        const where: Prisma.OrderWhereInput = {
          ...(status && status in ORDER_STATUSES ? { status } : {}),
          ...(payment && payment in PAYMENT_STATUSES ? { paymentStatus: payment } : {}),
          ...(delivery ? { deliveryType: delivery } : {}),
          ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
          ...(search
            ? {
                OR: [
                  { number: { contains: search, mode: "insensitive" } },
                  { customerPhone: { contains: search } },
                  { customerName: { contains: search, mode: "insensitive" } },
                  { customerEmail: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        };

        const [total, orders, statusCounts] = await Promise.all([
          prisma.order.count({ where }),
          prisma.order.findMany({
            where,
            orderBy: { [sort.field]: sort.dir },
            ...skipTake(page, perPage),
            select: {
              id: true,
              number: true,
              customerName: true,
              customerPhone: true,
              cityName: true,
              total: true,
              status: true,
              paymentStatus: true,
              createdAt: true,
              _count: { select: { items: true } },
            },
          }),
          prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
        ]);

        const pagination = buildPagination(page, perPage, total);
        const record = toRecord(params);
        const statusMap = new Map(statusCounts.map((row) => [row.status, row._count._all]));

        const columns: Column<OrderRow>[] = [
          {
            key: "number",
            title: "Номер",
            sortable: true,
            cell: (row) => (
              <div>
                <Link href={`/admin/orders/${row.id}`} className="font-semibold text-brand-700 hover:text-brand-800">
                  {row.number}
                </Link>
                <p className="text-xs text-ink-400">{row._count.items} поз.</p>
              </div>
            ),
          },
          {
            key: "createdAt",
            title: "Дата",
            sortable: true,
            cell: (row) => <span className="whitespace-nowrap text-xs text-ink-600">{formatDate(row.createdAt, true)}</span>,
          },
          {
            key: "customer",
            title: "Клиент",
            cell: (row) => (
              <div>
                <p className="font-medium text-ink-800">{row.customerName}</p>
                <p className="text-xs text-ink-500">{row.customerPhone}</p>
              </div>
            ),
          },
          { key: "city", title: "Город", cell: (row) => <span className="text-ink-600">{row.cityName}</span> },
          {
            key: "status",
            title: "Статус",
            sortable: true,
            cell: (row) => <OrderStatusBadge status={row.status} />,
          },
          {
            key: "payment",
            title: "Оплата",
            cell: (row) => <PaymentStatusBadge status={row.paymentStatus} />,
          },
          {
            key: "total",
            title: "Сумма",
            sortable: true,
            align: "right",
            cell: (row) => <span className="whitespace-nowrap font-semibold text-ink-900">{formatPrice(row.total)}</span>,
          },
          {
            key: "actions",
            title: "",
            align: "right",
            cell: (row) => (
              <Link
                href={`/admin/orders/${row.id}`}
                className="whitespace-nowrap rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
              >
                Открыть
              </Link>
            ),
          },
        ];

        const quickFilters = [
          { label: "Все", href: buildHref("/admin/orders", record, { status: null, page: 1 }), active: !status },
          ...Object.entries(ORDER_STATUSES).map(([key, label]) => ({
            label,
            href: buildHref("/admin/orders", record, { status: key, page: 1 }),
            active: status === key,
            count: statusMap.get(key) ?? 0,
          })),
        ];

        return (
          <div>
            <AdminPageHeader
              title="Заказы"
              description="Поиск по номеру, телефону и имени, фильтры по статусу, оплате и датам."
            />

            <QuickFilters items={quickFilters} />

            <FilterBar action="/admin/orders" resetHref="/admin/orders">
              <FilterItem label="Поиск" htmlFor="q" width="lg">
                <input
                  id="q"
                  name="q"
                  defaultValue={search ?? ""}
                  placeholder="G19-000123, телефон, имя"
                  className="g19-input"
                />
              </FilterItem>
              <FilterItem label="Оплата">
                <select name="payment" defaultValue={payment ?? ""} className="g19-input cursor-pointer">
                  <option value="">Любая</option>
                  {Object.entries(PAYMENT_STATUSES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </FilterItem>
              <FilterItem label="С даты">
                <input type="date" name="from" defaultValue={getStr(params, "from") ?? ""} className="g19-input" />
              </FilterItem>
              <FilterItem label="По дату">
                <input type="date" name="to" defaultValue={getStr(params, "to") ?? ""} className="g19-input" />
              </FilterItem>
              {status && <input type="hidden" name="status" value={status} />}
              <input type="hidden" name="sort" value={sort.field} />
              <input type="hidden" name="dir" value={sort.dir} />
              <span className="hidden items-center gap-1.5 text-xs text-ink-400 sm:inline-flex">
                <Search className="size-3.5" aria-hidden />
                найдено: {total}
              </span>
            </FilterBar>

            <AdminCard padded={false}>
              <div className="px-3 py-3 sm:px-5 sm:py-4">
                <DataTable
                  columns={columns}
                  rows={orders}
                  getRowId={(row) => row.id}
                  basePath="/admin/orders"
                  params={record}
                  sort={sort}
                  emptyMessage="Заказы не найдены — измените условия поиска"
                />
                <TablePagination basePath="/admin/orders" params={record} pagination={pagination} />
              </div>
            </AdminCard>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
