import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatPrice, PLACEHOLDER_IMAGE } from "@/lib/utils";
import {
  buildHref,
  buildPagination,
  getAllParams,
  getPage,
  getPerPage,
  getSort,
  getStr,
  skipTake,
  type SearchParamsRecord,
} from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader } from "@/components/admin/page-parts";
import { QuickFilters, FilterBar, FilterItem } from "@/components/admin/filters";
import { ActiveBadge, StockCell, StatusBadge } from "@/components/admin/badges";
import {
  SelectableBulkTable,
  type SelectableColumn,
  type SelectableRowData,
} from "@/components/admin/selectable-table";
import { bulkProductAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Товары" };

export const dynamic = "force-dynamic";

type ProductsSearchParams = Record<string, string | string[] | undefined>;

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
  reserved: number;
  isActive: boolean;
  isFeatured: boolean;
  isHit: boolean;
  fitmentType: string;
  images: { url: string; isPrimary: boolean }[];
  category: { id: string; name: string };
  manufacturer: { id: string; name: string } | null;
  brandName: string | null;
  _count: { fitments: number };
};

const SORT_FIELDS = ["name", "price", "stock", "createdAt", "updatedAt", "sortOrder"] as const;

function toRecord(params: ProductsSearchParams): SearchParamsRecord {
  const record: SearchParamsRecord = {};
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) record[key] = value;
    else if (value !== undefined) record[key] = value;
  }
  return record;
}

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<ProductsSearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="products">
      {async () => {
        const search = getStr(params, "q")?.trim();
        const categoryId = getStr(params, "category");
        const stockFilter = getStr(params, "stock");
        const activeFilter = getStr(params, "active");
        const fitmentFilter = getStr(params, "fitment");
        const brandFilter = getStr(params, "brand");
        const categories = getAllParams(params, "cat");
        const page = getPage(params);
        const perPage = getPerPage(params);
        const sort = getSort(params, SORT_FIELDS, "updatedAt", "desc");

        const categoryIds = categories.length > 0 ? categories : categoryId ? [categoryId] : [];

        const where: Prisma.ProductWhereInput = {
          ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
          ...(brandFilter ? { brandName: { contains: brandFilter, mode: "insensitive" } } : {}),
          ...(activeFilter === "yes" ? { isActive: true } : activeFilter === "no" ? { isActive: false } : {}),
          ...(stockFilter === "out"
            ? { stock: { lte: 0 } }
            : stockFilter === "low"
              ? { stock: { gt: 0, lte: 3 } }
              : stockFilter === "in"
                ? { stock: { gt: 3 } }
                : {}),
          ...(fitmentFilter === "none"
            ? { fitmentType: { not: "universal" }, fitments: { none: {} } }
            : fitmentFilter === "universal"
              ? { fitmentType: "universal" }
              : fitmentFilter === "specific"
                ? { fitmentType: "specific" }
                : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { sku: { contains: search, mode: "insensitive" } },
                  { slug: { contains: search, mode: "insensitive" } },
                  { brandName: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        };

        const [total, products, categoriesTree, outOfStock, noFitment, inactive] = await Promise.all([
          prisma.product.count({ where }),
          prisma.product.findMany({
            where,
            orderBy: { [sort.field]: sort.dir },
            ...skipTake(page, perPage),
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              oldPrice: true,
              stock: true,
              reserved: true,
              isActive: true,
              isFeatured: true,
              isHit: true,
              fitmentType: true,
              images: { select: { url: true, isPrimary: true }, orderBy: { sortOrder: "asc" }, take: 1 },
              category: { select: { id: true, name: true } },
              manufacturer: { select: { id: true, name: true } },
              brandName: true,
              _count: { select: { fitments: true } },
            },
          }),
          prisma.category.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true, parentId: true },
          }),
          prisma.product.count({ where: { isActive: true, stock: { lte: 0 } } }),
          prisma.product.count({ where: { isActive: true, fitmentType: { not: "universal" }, fitments: { none: {} } } }),
          prisma.product.count({ where: { isActive: false } }),
        ]);

        const pagination = buildPagination(page, perPage, total);
        const record = toRecord(params);

        const roots = categoriesTree.filter((category) => !category.parentId);
        const children = categoriesTree.filter((category) => category.parentId);
        const categoryOptions = roots.flatMap((root) => [
          { id: root.id, label: root.name },
          ...children
            .filter((child) => child.parentId === root.id)
            .map((child) => ({ id: child.id, label: `— ${child.name}` })),
        ]);

        const columnDefs: SelectableColumn[] = [
          { key: "name", title: "Товар", sortable: true },
          { key: "brand", title: "Бренд" },
          { key: "price", title: "Цена", sortable: true, align: "right" },
          { key: "stock", title: "Остаток", sortable: true, align: "center" },
          { key: "fitment", title: "Совместимость" },
          { key: "status", title: "Статус" },
          { key: "actions", title: "", align: "right" },
        ];

        // Ячейки отрисовывает серверный компонент: клиентская таблица принимает
        // только сериализуемые данные (функции-рендереры передавать нельзя).
        const tableRows: SelectableRowData[] = (products as ProductRow[]).map((row) => ({
          id: row.id,
          cells: [
            <div className="flex min-w-64 items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.images[0]?.url ?? PLACEHOLDER_IMAGE}
                alt=""
                className="size-10 shrink-0 rounded-lg border border-ink-200 object-cover"
              />
              <div className="min-w-0">
                <Link
                  href={`/admin/products/${row.id}`}
                  className="font-medium text-ink-800 hover:text-brand-700"
                >
                  {row.name}
                </Link>
                <p className="text-xs text-ink-400">
                  {row.sku ? `Арт. ${row.sku}` : "без артикула"} · {row.category.name}
                </p>
              </div>
            </div>,
            <span className="text-ink-600">{row.brandName ?? row.manufacturer?.name ?? "—"}</span>,
            <div className="whitespace-nowrap text-right">
              <p className="font-semibold text-ink-900">{formatPrice(row.price)}</p>
              {row.oldPrice && row.oldPrice > row.price ? (
                <p className="text-xs text-ink-400 line-through">{formatPrice(row.oldPrice)}</p>
              ) : null}
            </div>,
            <StockCell stock={row.stock} reserved={row.reserved} />,
            row.fitmentType === "universal" ? (
              <StatusBadge tone="info">Универсальный</StatusBadge>
            ) : row._count.fitments > 0 ? (
              <StatusBadge tone="success">{row._count.fitments} авто</StatusBadge>
            ) : (
              <StatusBadge tone="warning">Нет привязок</StatusBadge>
            ),
            <div className="flex flex-wrap items-center gap-1">
              <ActiveBadge active={row.isActive} activeText="Вкл" inactiveText="Выкл" />
              {row.isHit && <StatusBadge tone="brand">Хит</StatusBadge>}
              {row.isFeatured && <StatusBadge tone="info">Рекоменд.</StatusBadge>}
            </div>,
            <Link
              href={`/admin/products/${row.id}`}
              className="whitespace-nowrap rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
            >
              Открыть
            </Link>,
          ],
        }));

        const quickFilters = [
          {
            label: "Все",
            href: buildHref("/admin/products", record, { active: null, stock: null, fitment: null, page: 1 }),
            active: !activeFilter && !stockFilter && !fitmentFilter,
          },
          {
            label: "Активные",
            href: buildHref("/admin/products", record, { active: "yes", page: 1 }),
            active: activeFilter === "yes",
          },
          {
            label: "Скрытые",
            href: buildHref("/admin/products", record, { active: "no", page: 1 }),
            active: activeFilter === "no",
            count: inactive,
          },
          {
            label: "Нет в наличии",
            href: buildHref("/admin/products", record, { stock: "out", page: 1 }),
            active: stockFilter === "out",
            count: outOfStock,
          },
          {
            label: "Заканчиваются",
            href: buildHref("/admin/products", record, { stock: "low", page: 1 }),
            active: stockFilter === "low",
          },
          {
            label: "Без совместимости",
            href: buildHref("/admin/products", record, { fitment: "none", page: 1 }),
            active: fitmentFilter === "none",
            count: noFitment,
          },
          {
            label: "Универсальные",
            href: buildHref("/admin/products", record, { fitment: "universal", page: 1 }),
            active: fitmentFilter === "universal",
          },
        ];

        return (
          <div>
            <AdminPageHeader
              title="Товары"
              description="Каталог с поиском, фильтрами и массовыми действиями."
              actions={
                <Link
                  href="/admin/products/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <Plus className="size-4" aria-hidden />
                  Добавить товар
                </Link>
              }
            />

            <QuickFilters items={quickFilters} />

            <FilterBar action="/admin/products" resetHref="/admin/products">
              <FilterItem label="Поиск" htmlFor="q" width="lg">
                <input id="q" name="q" defaultValue={search ?? ""} placeholder="Название, артикул, slug" className="g19-input" />
              </FilterItem>
              <FilterItem label="Категория" width="lg">
                <select name="category" defaultValue={categoryId ?? ""} className="g19-input cursor-pointer">
                  <option value="">Все категории</option>
                  {categoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FilterItem>
              <FilterItem label="Бренд" htmlFor="brand">
                <input id="brand" name="brand" defaultValue={brandFilter ?? ""} placeholder="Thule" className="g19-input" />
              </FilterItem>
              <FilterItem label="Наличие">
                <select name="stock" defaultValue={stockFilter ?? ""} className="g19-input cursor-pointer">
                  <option value="">Любое</option>
                  <option value="out">Нет в наличии</option>
                  <option value="low">Мало (1–3)</option>
                  <option value="in">В наличии</option>
                </select>
              </FilterItem>
              <FilterItem label="Активность">
                <select name="active" defaultValue={activeFilter ?? ""} className="g19-input cursor-pointer">
                  <option value="">Все</option>
                  <option value="yes">Активные</option>
                  <option value="no">Скрытые</option>
                </select>
              </FilterItem>
              <FilterItem label="Совместимость">
                <select name="fitment" defaultValue={fitmentFilter ?? ""} className="g19-input cursor-pointer">
                  <option value="">Любая</option>
                  <option value="none">Без привязок</option>
                  <option value="specific">Для конкретных авто</option>
                  <option value="universal">Универсальные</option>
                </select>
              </FilterItem>
              <input type="hidden" name="sort" value={sort.field} />
              <input type="hidden" name="dir" value={sort.dir} />
              <span className="hidden items-center gap-1.5 text-xs text-ink-400 sm:inline-flex">
                <Search className="size-3.5" aria-hidden />
                найдено: {total}
              </span>
            </FilterBar>

            <SelectableBulkTable
              rows={tableRows}
              columns={columnDefs}
              basePath="/admin/products"
              params={record}
              sort={sort}
              pagination={pagination}
              emptyMessage="Товары не найдены — измените условия поиска"
              action={bulkProductAction}
              bulkControls={
                <>
                  <button
                    type="submit"
                    name="operation"
                    value="activate"
                    className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    Включить
                  </button>
                  <button
                    type="submit"
                    name="operation"
                    value="deactivate"
                    className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    Выключить
                  </button>
                  <button
                    type="submit"
                    name="operation"
                    value="hit"
                    className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    В хит
                  </button>
                  <button
                    type="submit"
                    name="operation"
                    value="unhit"
                    className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    Убрать хит
                  </button>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2 py-1">
                    <input
                      name="value"
                      inputMode="decimal"
                      placeholder="± %"
                      aria-label="Процент изменения цены"
                      className="w-14 border-0 bg-transparent text-xs outline-none"
                    />
                    <button
                      type="submit"
                      name="operation"
                      value="price_percent"
                      className="rounded-md bg-ink-900 px-2 py-1 text-xs font-semibold text-white hover:bg-ink-800"
                    >
                      Цена
                    </button>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2 py-1">
                    <input
                      name="value"
                      inputMode="numeric"
                      placeholder="склад"
                      aria-label="Новый остаток"
                      className="w-16 border-0 bg-transparent text-xs outline-none"
                    />
                    <button
                      type="submit"
                      name="operation"
                      value="stock_set"
                      className="rounded-md bg-ink-900 px-2 py-1 text-xs font-semibold text-white hover:bg-ink-800"
                    >
                      Остаток
                    </button>
                  </span>
                </>
              }
            />
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
