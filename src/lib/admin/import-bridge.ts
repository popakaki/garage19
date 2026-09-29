/**
 * Адаптер к модулю импорта прайсов.
 *
 * Реализация импорта (`runImport`, `runImportAction`) — зона другого разработчика
 * и подключается по путям `@/lib/import` и `@/lib/import/actions`.
 * Админка вызывает импорт строго через эти пути: загрузка идёт динамически,
 * поэтому отсутствие модуля не ломает сборку и раздел импорта — задача
 * конкретного запуска завершится понятной ошибкой (см. TODO ниже).
 *
 * Ожидаемый контракт:
 *   src/lib/import/index.ts   export async function runImport(formData: FormData): Promise<{ error?: string } | void>
 *   src/lib/import/actions.ts export async function runImportAction(formData: FormData): Promise<{ error?: string } | void>
 *
 * TODO(импорт): когда модуль появится, убрать динамическую подстановку пути
 * и импортировать функции статически (`import { runImport } from "@/lib/import"`).
 */

export type ImportActionResult = { error?: string } | void;

type ImportRunner = (formData: FormData) => Promise<ImportActionResult>;

export const IMPORT_MODULE_PATHS = {
  runImport: "@/lib/import",
  runImportAction: "@/lib/import/actions",
} as const;

/** Динамический импорт по рантайм-пути: не требует наличия модуля на этапе сборки. */
const dynamicImport = (specifier: string): Promise<Record<string, unknown>> =>
  import(/* webpackIgnore: true */ /* turbopackIgnore: true */ specifier);

async function callImportModule(
  specifier: string,
  exportName: string,
  formData: FormData,
): Promise<ImportActionResult> {
  try {
    const module = await dynamicImport(specifier);
    const candidate = module[exportName];
    if (typeof candidate !== "function") {
      return { error: `Модуль импорта не экспортирует ${exportName}` };
    }
    const runner = candidate as ImportRunner;
    return await runner(formData);
  } catch {
    return { error: `Модуль импорта (${specifier}) пока не подключён — обратитесь к разработчику импорта` };
  }
}

/** Запуск импорта через Server Action `runImportAction` из `@/lib/import/actions`. */
export async function callRunImportAction(formData: FormData): Promise<ImportActionResult> {
  return callImportModule(IMPORT_MODULE_PATHS.runImportAction, "runImportAction", formData);
}

/** Прямой вызов `runImport` из `@/lib/import` (повторный запуск задачи и т.п.). */
export async function callRunImport(formData: FormData): Promise<ImportActionResult> {
  return callImportModule(IMPORT_MODULE_PATHS.runImport, "runImport", formData);
}

/** Есть ли модуль импорта (для подсказки в интерфейсе). */
export async function importModuleAvailable(): Promise<boolean> {
  try {
    const module = await dynamicImport(IMPORT_MODULE_PATHS.runImport);
    return typeof module.runImport === "function";
  } catch {
    return false;
  }
}
