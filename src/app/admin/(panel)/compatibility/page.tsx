import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeftRight, Link2, Trash2 } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatPrice, formatYears } from "@/lib/utils";
import { getCarTree } from "@/lib/admin/cars";
import { getCarFitmentProducts, getProductFitments } from "@/lib/admin/fitments";
import { getStr } from "@/lib/admin/query";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard } from "@/components/admin/page-parts";
import { ActiveBadge, StatusBadge } from "@/components/admin/badges";
import { FilterBar, FilterItem, QuickFilters } from "@/components/admin/filters";
import { DeleteFitmentsForm, MassFitmentForm } from "@/components/admin/fitment-forms";
import { createFitmentsAction, deleteFitmentsAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Совместимость" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminCompatibilityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <AdminPanelPage resource="compatibility">
      {async () => {
        const view = getStr(params, "view") === "car" ? "car" : "assign";
        const categoryId = getStr(params, "category");
        const brandName = getStr(params, "brand");
        const search = getStr(params, "q")?.trim();
        const productId = getStr(params, "product");
        const carBrandId = getStr(params, "carBrand");
        const carModelId = getStr(params, "carModel");
        const carGenerationId = getStr(params, "carGeneration");

        const [carTree, products, categories, stats, fitmentProducts, productFitments, carBrands] = await Promise.all([
          getCarTree({ includeModifications: true, onlyActive: false }),
          prisma.product.findMany({
            where: {
              ...(categoryId ? { categoryId } : {}),
              ...(brandName ? { brandName: { contains: brandName, mode: "insensitive" } } : {}),
              ...(search
                ? {
                    OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      { sku: { contains: search, mode: "insensitive" } },
                    ],
                  }
                : {}),
            },
            orderBy: { name: "asc" },
            take: 60,
            select: { id: true, name: true, sku: true, fitmentType: true },
          }),
          prisma.category.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true, parentId: true },
          }),
          Promise.all([
            prisma.product.count(),
            prisma.product.count({ where: { fitmentType: "universal" } }),
            prisma.fitment.count(),
          ]),
          carBrandId ? getCarFitmentProducts({ brandId: carBrandId, modelId: carModelId, generationId: carGenerationId, take: 100 }) : Promise.resolve([]),
          productId ? getProductFitments(productId, 200) : Promise.resolve([]),
          prisma.brand.findMany({
            orderBy: [{ name: "asc" }],
            select: { id: true, name: true },
            take: 500,
          }),
        ]);

        const [productsTotal, universalTotal, fitmentsTotal] = stats;
        const roots = categories.filter((category) => !category.parentId);
        const categoryOptions = roots.map((root) => ({ value: root.id, label: root.name }));

        const selectedProduct = productId
          ? await prisma.product.findUnique({
              where: { id: productId },
              select: { id: true, name: true, sku: true, fitmentType: true },
            })
          : null;

        const selectedCarBrand = carBrandId ? carBrands.find((brand) => brand.id === carBrandId) : null;

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Совместимость"
              description="Массовая привязка товаров к автомобилям и просмотр в обе стороны."
              actions={
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                  <StatusBadge tone="outline">товаров: {productsTotal}</StatusBadge>
                  <StatusBadge tone="info">универсальных: {universalTotal}</StatusBadge>
                  <StatusBadge tone="success">привязок: {fitmentsTotal}</StatusBadge>
                </div>
              }
            />

            <QuickFilters
              items={[
                {
                  label: "Массовая привязка",
                  href: "/admin/compatibility?view=assign",
                  active: view === "assign",
                },
                {
                  label: "Какие товары подходят к авто",
                  href: "/admin/compatibility?view=car",
                  active: view === "car",
                },
              ]}
            />

            {view === "assign" ? (
              <div className="space-y-5">
                <FilterBar action="/admin/compatibility" resetHref="/admin/compatibility" submitLabel="Показать товары">
                  <input type="hidden" name="view" value="assign" />
                  <FilterItem label="Поиск товара" htmlFor="q" width="lg">
                    <input id="q" name="q" defaultValue={search ?? ""} placeholder="Название или артикул" className="g19-input" />
                  </FilterItem>
                  <FilterItem label="Категория" width="lg">
                    <select name="category" defaultValue={categoryId ?? ""} className="g19-input cursor-pointer">
                      <option value="">Все категории</option>
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FilterItem>
                  <FilterItem label="Бренд товара" htmlFor="brand">
                    <input id="brand" name="brand" defaultValue={brandName ?? ""} placeholder="Thule" className="g19-input" />
                  </FilterItem>
                </FilterBar>

                <div className="grid gap-4 xl:grid-cols-2">
                  <AdminCard
                    title="Массовая привязка"
                    description="Выбранные товары будут подходить к указанному автомобилю"
                    padded={false}
                  >
                    <MassFitmentForm brands={carTree.brands} products={products} action={createFitmentsAction} />
                  </AdminCard>

                  <AdminCard title="Удаление привязок" description="Фильтр по автомобилю и товарам" padded={false}>
                    <DeleteFitmentsForm brands={carTree.brands} products={products} action={deleteFitmentsAction} />
                  </AdminCard>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <FilterBar action="/admin/compatibility" resetHref="/admin/compatibility" submitLabel="Показать">
                  <input type="hidden" name="view" value="car" />
                  <FilterItem label="Марка" width="lg">
                    <select name="carBrand" defaultValue={carBrandId ?? ""} className="g19-input cursor-pointer">
                      <option value="">— выберите марку —</option>
                      {carBrands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </FilterItem>
                  <FilterItem label="Модель (ID)" htmlFor="carModel">
                    <input id="carModel" name="carModel" defaultValue={carModelId ?? ""} placeholder="cuid модели" className="g19-input" />
                  </FilterItem>
                  <FilterItem label="Поколение (ID)" htmlFor="carGeneration">
                    <input
                      id="carGeneration"
                      name="carGeneration"
                      defaultValue={carGenerationId ?? ""}
                      placeholder="cuid поколения"
                      className="g19-input"
                    />
                  </FilterItem>
                </FilterBar>

                <div className="grid gap-4 xl:grid-cols-2">
                  <AdminCard
                    title={selectedCarBrand ? `Товары для ${selectedCarBrand.name}` : "Товары для автомобиля"}
                    description="Прямые привязки и привязки верхнего уровня"
                    padded={false}
                    actions={
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-400">
                        <ArrowLeftRight className="size-3.5" aria-hidden />
                        {fitmentProducts.length}
                      </span>
                    }
                  >
                    {fitmentProducts.length === 0 ? (
                      <p className="px-5 py-8 text-center text-sm text-ink-400">
                        Выберите марку — увидите товары, которые к ней подходят.
                      </p>
                    ) : (
                      <ul className="divide-y divide-ink-100">
                        {fitmentProducts.map((fitment) => (
                          <li key={fitment.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                            <div className="min-w-0">
                              <Link
                                href={`/admin/products/${fitment.product.id}`}
                                className="block truncate text-sm font-medium text-ink-800 hover:text-brand-700"
                              >
                                {fitment.product.name}
                              </Link>
                              <p className="text-xs text-ink-400">
                                {[fitment.model?.name, fitment.generation?.name, formatYears(fitment.yearFrom, fitment.yearTo)]
                                  .filter(Boolean)
                                  .join(" · ") || "вся марка"}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-ink-500">{formatPrice(fitment.product.price)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </AdminCard>

                  <AdminCard
                    title="К каким авто подходит товар"
                    description="Выберите товар, чтобы посмотреть привязки"
                    padded={false}
                  >
                    <form action="/admin/compatibility" method="get" className="flex flex-wrap items-end gap-3 border-b border-ink-100 px-5 py-4">
                      <input type="hidden" name="view" value="car" />
                      {carBrandId && <input type="hidden" name="carBrand" value={carBrandId} />}
                      <div className="min-w-64 flex-1">
                        <label className="g19-label" htmlFor="product">
                          ID товара
                        </label>
                        <input
                          id="product"
                          name="product"
                          defaultValue={productId ?? ""}
                          placeholder="Например, из карточки товара"
                          className="g19-input"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                      >
                        Показать
                      </button>
                    </form>

                    {!selectedProduct ? (
                      <p className="px-5 py-8 text-center text-sm text-ink-400">
                        Товар не выбран. Список привязок открывается из карточки товара.
                      </p>
                    ) : (
                      <>
                        <div className="border-b border-ink-100 px-5 py-3">
                          <Link
                            href={`/admin/products/${selectedProduct.id}`}
                            className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                          >
                            {selectedProduct.name}
                          </Link>
                          <p className="text-xs text-ink-400">
                            {selectedProduct.sku ? `Арт. ${selectedProduct.sku}` : "без артикула"} · привязок:{" "}
                            {productFitments.length}
                          </p>
                        </div>
                        {productFitments.length === 0 ? (
                          <p className="px-5 py-6 text-center text-sm text-ink-400">
                            Привязок нет — товар не подбирается по автомобилю.
                          </p>
                        ) : (
                          <ul className="divide-y divide-ink-100">
                            {productFitments.map((fitment) => (
                              <li key={fitment.id} className="px-5 py-2.5 text-sm">
                                <p className="font-medium text-ink-800">
                                  {fitment.brand.name}
                                  {fitment.model ? ` ${fitment.model.name}` : ""}
                                  {fitment.generation ? ` · ${fitment.generation.name}` : ""}
                                </p>
                                <p className="text-xs text-ink-400">
                                  {formatYears(fitment.yearFrom, fitment.yearTo) ||
                                    formatYears(fitment.generation?.yearFrom, fitment.generation?.yearTo) ||
                                    "годы не указаны"}
                                  {fitment.modification ? ` · ${fitment.modification.name}` : ""}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </AdminCard>
                </div>
              </div>
            )}

            <AdminCard title="Как работает подбор" padded={false}>
              <div className="grid gap-4 px-5 py-4 text-sm text-ink-600 sm:grid-cols-3">
                <div>
                  <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink-900">
                    <Link2 className="size-4 text-brand-600" aria-hidden />
                    Уровни
                  </p>
                  Марка обязательна, модель, поколение и модификация — опциональны. Чем точнее уровень, тем уже подбор.
                </div>
                <div>
                  <p className="mb-1 font-semibold text-ink-900">Универсальные товары</p>
                  Помечаются типом «Универсальный» в карточке товара и не требуют привязок.
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink-900">
                    <Trash2 className="size-4 text-red-500" aria-hidden />
                    Чистка
                  </p>
                  Привязки удаляются фильтром: выберите марку (и при необходимости товары) и подтвердите удаление.
                </div>
              </div>
            </AdminCard>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
