# Импорт прайсов поставщиков (Garage19)

Модуль загружает прайсы поставщиков в каталог: XML/YML-фиды (Яндекс.Маркет и произвольный XML)
и CSV-выгрузки. Импорт идемпотентен, пишет журнал в `ImportJob`, применяет наценку поставщика
и сохраняет закупочную цену.

- Код: `src/lib/import/**` (движок, парсеры, нормализация, Server Action)
- HTTP: `src/app/api/import/route.ts`
- Демо-фикстуры: `prisma/data/samples/supplier-price.{yml,xml,csv}`

---

## 1. Публичный API

Админ-страницу импорта делает другой разработчик. Модуль экспортирует **ровно два** пути,
которыми нужно пользоваться:

```ts
// Server Action — для <form action={runImportAction}> в админке
import { runImportAction } from "@/lib/import/actions";

// Прямой вызов движка — для скриптов, крона, API
import { runImport } from "@/lib/import";
```

### 1.1. `runImport(input)`

```ts
// src/lib/import/index.ts (реэкспорт из ./engine)
export type ImportInput = {
  text: string;                  // содержимое файла целиком (UTF-8)
  fileName: string;              // имя файла — попадает в ImportJob
  sourceType: "xml" | "yml" | "csv";
  supplierId?: string;           // id Supplier: наценка + purchasePrice + supplierId товара
  mode: "update" | "insert_only" | "dry_run";
  userId?: string;               // кто запустил (ImportJob.userId + AuditLog)
  defaultCategorySlug?: string;  // куда класть товары без категории и новые категории
  jobId?: string;                // существующий ImportJob: движок обновит его, а не создаст новый
};

export type ImportResult = {
  jobId: string;                 // id ImportJob; для dry_run — "dry-run"
  status: "done" | "failed";
  totalRows: number;             // сколько офферов в файле
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];              // первые 50 ошибок
  log: string;                   // человекочитаемый журнал (он же сохраняется в ImportJob.log)
};

export async function runImport(input: ImportInput): Promise<ImportResult>;
```

### 1.2. `runImportAction(formData)`

```ts
// src/lib/import/actions.ts, директива "use server"
export type ImportActionResult = { error?: string; result?: ImportResult };

export async function runImportAction(formData: FormData): Promise<ImportActionResult>;
```

Поля `FormData`:

| Поле | Обяз. | Значения | Описание |
| --- | --- | --- | --- |
| `file` | да | `File` | Файл прайса (.xml, .yml, .csv). Читается через `file.text()` |
| `sourceType` | нет | `xml` \| `yml` \| `csv` | Если не указано — определяется по расширению файла |
| `mode` | нет | `update` \| `insert_only` \| `dry_run` | По умолчанию `update` |
| `supplierId` | нет | cuid | Поставщик: наценка, `purchasePrice`, привязка товара |
| `defaultCategorySlug` | нет | slug | Категория для товаров без распознанной категории |
| `jobId` | нет | cuid | Если админка уже создала `ImportJob` — движок обновит его, а не создаст второй |
| `fileName` | нет | строка | Имя прайса для журнала (если отличается от имени файла) |

Права проверяются вызовом `requireAdmin()` из `@/lib/auth` — функция возвращает
`{ error: "Недостаточно прав..." }`, если пользователь не администратор/менеджер.

> **Повторный запуск задачи.** Файл прайса на сервере не сохраняется, поэтому
> `runImportAction` при вызове без `file` (только с `jobId`) вернёт понятную ошибку
> «Повторный запуск требует файла…». Если нужен точный повтор — либо сохраняйте
> исходный файл в `public/uploads/**`, либо запускайте импорт по `Supplier.priceUrl`
> через `runImport` с загруженным содержимым.

Пример формы в админке:

```tsx
"use client";
import { useActionState } from "react";
import { runImportAction } from "@/lib/import/actions";

export function ImportForm({ suppliers }: { suppliers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => runImportAction(formData),
    null,
  );

  return (
    <form action={action}>
      <input type="file" name="file" accept=".xml,.yml,.csv" required />
      <select name="sourceType" defaultValue="yml">
        <option value="yml">YML (Яндекс.Маркет)</option>
        <option value="xml">XML</option>
        <option value="csv">CSV</option>
      </select>
      <select name="mode" defaultValue="dry_run">
        <option value="dry_run">Проверка без записи</option>
        <option value="update">Обновлять и добавлять</option>
        <option value="insert_only">Только добавлять новые</option>
      </select>
      <select name="supplierId" defaultValue="">
        <option value="">— без поставщика —</option>
        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <input name="defaultCategorySlug" placeholder="krepezh-i-aksessuary" />
      <button type="submit" disabled={pending}>Импортировать</button>
      {state?.error && <p role="alert">{state.error}</p>}
      {state?.result && (
        <p>
          Создано {state.result.createdCount}, обновлено {state.result.updatedCount},
          пропущено {state.result.skippedCount}, ошибок {state.result.errorCount}
        </p>
      )}
    </form>
  );
}
```

---

## 2. HTTP API

`POST /api/import` — доступ только администратору и менеджеру (`requireAdmin`).

**Вариант A — файл (`multipart/form-data`):** поля как в `runImportAction` (`file`, `sourceType`, `mode`, `supplierId`, `defaultCategorySlug`).

**Вариант B — JSON:**

```jsonc
{
  "text": "<yml_catalog>…</yml_catalog>",
  "fileName": "supplier-price.yml",
  "sourceType": "yml",
  "supplierId": "cuid…",
  "mode": "dry_run",
  "defaultCategorySlug": "krepezh-i-aksessuary"
}
```

Ответ — `ImportResult` (HTTP 200), при `status: "failed"` — 422, при проблемах с телом — 400,
при отсутствии прав — 403. `GET /api/import` возвращает краткую справку по полям.

---

## 3. Что умеет импорт

### 3.1. Парсеры

| Формат | Файл | Что разбирает |
| --- | --- | --- |
| YML / XML | `src/lib/import/parsers/yml.ts` | `yml_catalog/shop/offers/offer`, `shop/categories/category`, а также произвольный XML: ищет узлы `offer`/`item`/`product`/`entry`, читает `param`, `picture`, `properties/property` |
| CSV | `src/lib/import/parsers/csv.ts` | Разделители `;`, `,`, таб; BOM; гибкие заголовки (рус/англ); колонки совместимости |

Из оффера извлекаются: `id`, `vendorCode`/`sku`, `name`, `price`, `oldprice`, `currencyId`,
`categoryId` + `category`, `description`, `picture[]`, `param[]`, `count`/`stock`, `weight`.

### 3.2. Распознаваемые колонки CSV

`sku`, `id`, `name`, `price`, `old_price`, `purchase_price`, `category`, `brand`, `stock`,
`description`, `image`, `weight`, `length`, `width`, `height`, `warranty`, `capacity`,
`vertical_load`, `volume`, `material`, `mount_place`, `profile`, `hook_type`, `lock`,
`electric`, `bumper_cut`, `doors`, `plug`, `active`,
а также совместимость: `fitment` **или** `car_brand` / `car_model` / `car_generation` /
`year_from` / `year_to`.

Колонки, которых нет в списке, попадают в характеристики товара — если их название
совпадает с названием `Attribute` в базе.

### 3.3. Совместимость (fitment)

* `fitment` — список через `;`: `Toyota Camry XV70;Kia Sportage QL;Lada Vesta` — строки
  разбираются как «марка [модель] [поколение] [годы]» и сопоставляются со справочником;
* отдельные колонки `car_brand`/`car_model`/`car_generation` — точное сопоставление
  (в том числе по slug'ам: `toyota/camry/xv70`);
* если поколение не найдено, но указан год — подбирается поколение, в диапазон которого
  попадает год; если не найдена модель — привязка к марке;
* если совместимость не указана вовсе, а категория товара входит в ядро каталога
  (багажники, автобоксы, велокрепления, лыжные крепления, фаркопы) — товар привязывается
  к флагманским авто (`Toyota Camry XV70`, `Kia Sportage QL`, `Lada Vesta`, `Haval Jolion`,
  `Jetour T2`), чтобы он находился конфигуратором на главной. В `fitmentNote` пишется
  предупреждение «совместимость не была указана в прайсе — проверьте привязку к авто».

### 3.4. Категории и бренды

* Категория определяется по названию раздела фида и по названию товара: сначала точное
  совпадение slug/названия, затем «сигналы» в названии (`велокрепление`, `автобокс`,
  `фаркоп`, `лыжное`…), затем ключевые слова со стоп-словами (чтобы «Велокрепление на
  фаркоп» не попадало в категорию «Фаркопы»). Дополнительно уточняется подкатегория:
  место установки, объём бокса, количество пар лыж.
* Если категория не распознана — используется `defaultCategorySlug`; если он не задан,
  категория создаётся автоматически (sortOrder `900`, чтобы её было видно в админке).
* Бренд производителя сопоставляется по справочнику с учётом типовых написаний
  (`Thule`, `montblanc`, `Auto Hak` → `Auto-Hak`). Незнакомый бренд создаётся.

### 3.5. Деньги

* Цена в прайсе считается **рублями** (поддерживаются «12 990,50 ₽», «12990.5», «12.990,50»).
  Копейки распознаются только при явном указании («коп»).
* Наценка `Supplier.marginPercent` применяется к цене продажи.
* Закупочная цена сохраняется в `Product.purchasePrice` (из фида — если есть колонка
  `purchase_price`, иначе исходная цена до наценки).
* `oldPrice` из фида сохраняется только если он больше итоговой цены.

### 3.6. Режимы

| Режим | Поведение | ImportJob |
| --- | --- | --- |
| `dry_run` | Ничего не пишет. Возвращает план: что создать, что обновить, какие категории и бренды появятся | не создаётся (`jobId: "dry-run"`) |
| `insert_only` | Создаёт только новые товары; существующие (по `sku` или `supplierId` + `externalId`) помечает пропущенными | создаётся |
| `update` | Создаёт новые и обновляет существующие | создаётся |

Правила обновления:

* товар ищется по `sku`, затем по паре `supplierId + externalId`;
* **изображения**: заменяются только те, что пришли из прайса; локальные
  (`/images/**`, `/uploads/**`) сохраняются, поэтому фото из админки не теряются;
* **характеристики**: `upsert` по паре `productId + attributeId`;
* **совместимость**: добавляется, дубликаты не создаются;
* `slug` существующего товара не меняется — URL не ломаются.

---

## 4. Схема журнала

Каждый прогон (кроме `dry_run`) создаёт `ImportJob`: `fileName`, `sourceType`, `supplierId`,
`userId`, `status`, `mode`, счётчики `totalRows/createdCount/updatedCount/skippedCount/errorCount`,
поле `log` и `finishedAt`. Если указан `userId`, дополнительно пишется `AuditLog`
с `action: "import"`.

`ImportResult.errors` содержит первые 50 ошибок; полный журнал — в `ImportJob.log`
(обрезается до 60 000 символов).

---

## 5. Проверка и разработка

```bash
# 1. Целостность демо-данных (без БД)
npx tsx prisma/data/validate.ts

# 2. Импорт на фикстурах: dry_run для YML/XML/CSV + реальный прогон и повтор в insert_only.
#    Тест сам удаляет созданные товары и ImportJob, но обновляет позиции с теми же SKU,
#    что и сидер, — после него выполните `npm run db:seed`.
npx tsx prisma/data/tools/test-import.ts

# 3. Проверка денежной логики (наценка, purchasePrice) — создаёт и удаляет тестовый товар
npx tsx prisma/data/tools/check-margin.ts

# 4. Что получилось в БД после импорта
npx tsx prisma/data/tools/check-import-db.ts

# 5. Покрытие конфигуратора (флагманские авто во всех категориях)
npx tsx prisma/data/tools/check-configurator.ts

# Восстановить демо-товары после тестовых прогонов
npm run db:seed
```

Фикстуры: `prisma/data/samples/supplier-price.yml` (YML, 15 позиций),
`supplier-price.xml` (произвольный XML, 12 позиций), `supplier-price.csv` (CSV, 15 позиций) —
во всех есть совместимость с конкретными авто.

---

## 6. Ограничения и что стоит улучшить

* **Изображения из фида не скачиваются.** В `ProductImage.url` сохраняется внешний URL.
  Если понадобится локальное хранение — добавьте загрузку в `public/uploads/**`
  (модуль загрузки файлов вне зоны ответственности импорта).
* **Кодировка.** Файл читается как UTF-8. Прайсы в cp1251 нужно перекодировать
  (Excel → «CSV UTF-8») либо добавить перекодировку в `runImportAction`.
* **Категории из фида** не создаются деревом: при неудачном сопоставлении позиция
  уходит в `defaultCategorySlug` или в плоскую категорию с `sortOrder = 900`.
* **Модификации авто** (двигатель/привод) в совместимость не попадают — `Fitment`
  заполняется до уровня поколения (`generationId`), при необходимости вручную.
* **Склад** трактуется как точное число; слова «в наличии» → 1, «под заказ» → 0.
* **Дедупликация по имени** не выполняется: если поставщик меняет `vendorCode`,
  появится новый товар. Ключ идемпотентности — `sku` (или `supplierId + externalId`).

---

## 7. Интеграция с админкой

Админ-страницу импорта делает другой разработчик. Она вызывает импорт через
`src/lib/admin/import-bridge.ts`, который подгружает модуль динамически.

**Важно (для админского модуля):** динамический импорт вида
`import(/* webpackIgnore: true */ "@/lib/import/actions")` не работает в рантайме —
Node не умеет разрешать alias `@/`, а `webpackIgnore` отключает подстановку пути
сборщиком. Такой вызов всегда падает, и админка показывает
«Модуль импорта пока не подключён».

Правильно — статический импорт:

```ts
// src/lib/admin/import-bridge.ts
import { runImportAction } from "@/lib/import/actions";

export async function callRunImportAction(formData: FormData) {
  return runImportAction(formData);
}
```

`runImportAction` уже учитывает конвенции админки:

* `startImportAction` создаёт `ImportJob` со статусом `pending` и передаёт `jobId`
  в `FormData` — движок обновит **эту** задачу (счётчики, лог, `finishedAt`, статус)
  и не создаст вторую;
* имя файла берётся из `fileName`, если оно передано, иначе из `file.name`;
* в ответ приходит `{ result }` либо `{ error }` — этого достаточно для формы
  `useActionState`.

---

## 8. Связанные файлы

| Файл | Назначение |
| --- | --- |
| `src/lib/import/index.ts` | Публичные экспорты модуля |
| `src/lib/import/engine.ts` | Движок: парсинг → черновики → запись, ImportJob |
| `src/lib/import/draft.ts` | Сборка черновиков товара из офферов |
| `src/lib/import/mapping.ts` | Категории, бренды, справочник авто |
| `src/lib/import/normalize.ts` | Цены, склад, габариты, фасеты, slug'и |
| `src/lib/import/parsers/yml.ts` | YML и произвольный XML |
| `src/lib/import/parsers/csv.ts` | CSV с гибкими заголовками |
| `src/lib/import/types.ts` | Типы контракта импорта |
| `src/lib/import/actions.ts` | Server Action `runImportAction` |
| `src/app/api/import/route.ts` | HTTP API импорта |
