# Garage19 — архитектура и правила разработки

Интернет-магазин багажников, автобоксов, велокреплений, лыжных креплений и фаркопов
с подбором по марке → модели → поколению → модификации автомобиля.

- **Стек:** Next.js 15 (App Router, RSC + Server Actions) · TypeScript strict · Tailwind CSS v4 · PostgreSQL + Prisma 6 · Node 20+.
- **Язык интерфейса:** русский. Валюта: рубль. Формат дат: `дд.мм.гггг`.

## Структура

```
prisma/schema.prisma        схема БД (единый источник правды)
prisma/seed.ts              сиды: категории, авто, товары, баннеры, страницы
src/app/                    маршруты App Router
  layout.tsx                корневой layout (только каркас документа)
  (site)/                   публичная витрина: общий layout с шапкой/подвалом
    layout.tsx              шапка, подвал, кнопка обратного звонка, JSON-LD организации
    page.tsx                главная: слайдер + конфигуратор + витрины
    catalog/                каталог и листинги
    product/[slug]/         карточка товара
    podbor/                 SEO-посадочные «авто → товары»
    cart/ checkout/         корзина и оформление
    account/                личный кабинет покупателя
    [slug]/                 контентные страницы из админки (доставка, оплата, оферта…)
  admin/                    админка (собственный layout в admin/(panel), витрину не наследует)
  api/                      route handlers (JSON, импорт, доставка)
  sitemap.ts robots.ts      SEO-файлы
src/components/             UI-компоненты
src/lib/                    бизнес-логика
  prisma.ts                 клиент Prisma (singleton)
  constants.ts              статусы, типы, навигация (единый источник строковых значений)
  utils.ts                  форматирование, slugify, парсинг
  auth.ts                   scrypt-пароли, сессии, getCurrentUser/requireAdmin
  cart.ts                   корзина (cookie для гостя, БД для авторизованного)
  queries.ts                чтение каталога (фасады, товары, авто, SEO-посадочные)
  settings.ts seo.ts        настройки сайта и метаданные
  actions/                  Server Actions, сгруппированы по домену
  delivery/ import/         интеграции: доставка, импорт прайсов
public/uploads/             загруженные изображения (не в git)
docs/                       документация, конкурентный анализ
```

## Жёсткие договорённости

1. **Деньги — целые числа в копейках** (`price = 499000` → 4 990,00 ₽).
   Форматирование: `formatPrice()` из `@/lib/utils`. Ввод в админке: `parsePriceToKopecks()`.
2. **Вес — граммы, габариты — миллиметры.**
3. **Статусы и типы — строки**, значения берутся из `@/lib/constants` (не хардкодить в разметке).
4. **Все id — cuid-строки**, `createdAt/updatedAt` — стандарт Prisma.
5. **Prisma-запросы только из `src/lib/**`** (страницы и компоненты не ходят в БД напрямую,
   кроме админки, где допустимо использовать `prisma` из `@/lib/prisma` с явным `select`).
   Чтение каталога — только через функции `@/lib/queries`.
6. **Server Actions** — в `src/lib/actions/*.ts` с директивой `"use server"`,
   каждая функция принимает `FormData` и возвращает `Promise<void | {error?: string}>`.
   После записи — `revalidatePath()`.
7. **Клиентские компоненты** — только там, где нужны состояние/события; файл начинается с `"use client"`.
   Интерактив (слайдер, каскадные селекты, модалки) — отдельные компоненты.
8. **UI-примитивы — из `@/components/ui`** (`Button`, `ButtonLink`, `Input`, `Select`, `Field`,
   `Badge`, `Price`, `Rating`, `Breadcrumbs`, `Pagination`, `EmptyState`, `Alert`, `Container`,
   `Section`, `Card`, `PanelCard`, `PageHero`, `Prose`, `Spinner`, `StockBadge`, `CountBadge`).
   Не дублировать их в своих файлах; при нехватке — добавлять в `@/components/ui`.
9. **Дизайн-токены:** цвета `brand-*` (оранжевый акцент), `ink-*` (графит), `success/warning/danger`.
   Классы: `g19-container`, `g19-card`, `g19-input`, `g19-label`, `g19-prose`.
   Шрифт — системный стек, без внешних загрузок.
10. **SEO:** метаданные — через `buildMetadata()` из `@/lib/seo`, JSON-LD — хелперы оттуда же.
    У каждой страницы должен быть осмысленный `title`/`description`.
11. **Никаких новых npm-зависимостей** без согласования со ведущим разработчиком.
12. **TypeScript strict:** без `any`, без `@ts-ignore`. Публичные функции — с явными типами.
13. **Файл с директивой `"use server"` может экспортировать только async-функции.**
    Прямой реэкспорт (`export { action } from "…"`) сборка отклоняет с ошибкой
    «Only async functions are allowed to be exported in a "use server" file».
    Поэтому barrel `src/lib/actions/admin.ts` содержит 88 явных async-обёрток вида
    `export async function xAction(...args: Parameters<typeof mod.xAction>) { return mod.xAction(...args); }`.
    Новые админ-экшены добавляйте по этому же шаблону.

## Ключевые API

```ts
// Корзина
getCart(): Promise<CartSummary>            // { lines, count, subtotal, weight, inStock }
getCartCount(): Promise<number>
addToCart(productId, qty) / setCartQty / removeFromCart / clearCart / mergeGuestCart(userId)

// Авторизация
getCurrentUser(): Promise<SessionUser | null>   // кэшируется на запрос
requireUser(): Promise<SessionUser>
requireAdmin(): Promise<SessionUser>            // admin | manager
createSession(userId) / destroySession()
hashPassword(password) / verifyPassword(password, hash)

// Каталог (src/lib/queries.ts)
getProducts(query: CatalogQuery): Promise<CatalogResult>
buildProductWhere(query) / getFacets(query)
PRODUCT_CARD_SELECT / ProductCard
getCategoryTree() / getCategoryBySlug(slug) / getCategoryBranchIds(slug)
getBrands() / getBrandBySlug(slug) / getModelsByBrand(brandSlug) / getGenerations(...) / getModifications(...)
getCarContext({brandSlug, modelSlug, generationSlug, modificationId})
getProductBySlug(slug) / getSimilarProducts / getAccessories / getAnalogs
getFeaturedProducts / getHitProducts / getNewProducts / getSaleProducts
getProductsForCar({brandSlug, modelSlug, ...}, {categorySlug, take, page})
getBanners(position) / getPageBySlug(slug) / getCities() / getDefaultCity() / getDeliveryTariffs(cityId)
getSavedCars(userId) / getSavedCarsWithCounts(userId)
searchProducts(term) / searchBrandsAndModels(term)
getCarLandingTree() / getCarLandingProducts({brandSlug, modelSlug?, generationSlug?})

// Настройки и SEO
getSettings() / getSetting(key) / setSetting(key, value)
buildMetadata({title, description, path, images, noIndex, type})
productJsonLd / breadcrumbsJsonLd / itemListJsonLd / organizationJsonLd
```

## Уровни совместимости (fitment)

`Fitment` связывает товар с авто на любом уровне: `brandId` обязателен,
`modelId`/`generationId`/`modificationId` — опциональны. Товар подходит к авто, если:

1. `product.fitmentType === "universal"`, **или**
2. существует `Fitment` с той же маркой и пустыми (или совпадающими) полями уровня ниже.

Логика уже реализована в `buildProductWhere` — переиспользуйте её, не дублируйте.

## Что делает проект уникальным (по итогам анализа конкурентов)

Ни у одного из 8+ конкурентов нет: «гаража» сохранённых авто, VIN-подбора (хотя бы заявкой),
блока «Аналоги», проработанного сценария «нет моей модификации», фасетов «замок/материал/двери»,
а также Почты России и Boxberry в доставке. Эти функции — приоритет.

## Проверка

```bash
npm run typecheck        # tsc --noEmit
npm run build            # production-сборка
npm run db:push          # синхронизация схемы
npm run db:seed          # демо-данные
npm run dev              # http://localhost:3000
pwsh -File scripts/smoke.ps1   # сборка + дымовой тест 20+ страниц
# в Windows PowerShell 5.1 (без pwsh) и при запрете скриптов:
# powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke.ps1 -NoBuild -Port 3100
```

## Зоны ответственности (файлы не пересекаются)

| Модуль | Каталог |
| --- | --- |
| Фундамент, главная, конфигуратор, layout | `src/app/layout.tsx`, `src/app/(site)/layout.tsx`, `src/app/(site)/page.tsx`, `src/app/(site)/[slug]`, `src/components/{layout,home,forms}`, `src/lib/{prisma,constants,utils,auth,cart,queries,seo,settings,city}.ts` |
| Каталог и карточка | `src/app/(site)/{catalog,product,brands,podbor,search,compare,wishlist}`, `src/components/catalog`, `src/lib/actions/{catalog,review}.ts` |
| Оформление и ЛК | `src/app/(site)/{cart,checkout,account,order,install}`, `src/components/{cart,checkout,account,install}`, `src/lib/{delivery,promo,garage,checkout-schema,form-action,order-history,install-slots}.ts`, `src/lib/actions/{order,account,install,callback}.ts` |
| Админка | `src/app/admin`, `src/components/admin`, `src/lib/actions/admin*`, `src/lib/admin` |
| Сиды и импорт | `prisma/seed.ts`, `prisma/data`, `src/lib/import`, `src/app/api/import` |

