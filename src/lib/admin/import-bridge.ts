/**
 * Адаптер админки к модулю импорта прайсов (`src/lib/import/**`).
 *
 * Импорт подключается СТАТИЧЕСКИ: динамический `import("@/lib/import/actions")`
 * с `webpackIgnore` не разрешается в рантайме (alias `@/*` существует только
 * на этапе сборки), поэтому админка показывала «модуль не подключён» при
 * полностью рабочем импортёре. Держим только прямые импорты.
 *
 * Контракт импортёра — docs/IMPORT.md.
 */

import { runImport, type ImportInput, type ImportMode, type ImportSourceType } from "@/lib/import";
import { runImportAction } from "@/lib/import/actions";

/** Результат, который ожидают Server Actions админки: либо ошибка, либо «ок». */
export type ImportActionResult = { error?: string } | void;

const MODES: ImportMode[] = ["update", "insert_only", "dry_run"];
const SOURCE_TYPES: ImportSourceType[] = ["xml", "yml", "csv"];

function normalizeMode(value: unknown): ImportMode {
  const mode = String(value ?? "update").trim() as ImportMode;
  return MODES.includes(mode) ? mode : "update";
}

function sourceTypeFromName(fileName: string): ImportSourceType {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "csv") return "csv";
  if (extension === "yml" || extension === "yaml") return "yml";
  return "xml";
}

function normalizeSourceType(value: unknown, fileName: string): ImportSourceType {
  const type = String(value ?? "").trim() as ImportSourceType;
  return SOURCE_TYPES.includes(type) ? type : sourceTypeFromName(fileName);
}

/**
 * Запуск импорта через Server Action `runImportAction`.
 * Ожидает в FormData: `file` (File) либо `text`, `fileName`, `sourceType`,
 * `mode`, `supplierId`, `defaultCategorySlug`, а также `jobId` — задачу
 * `ImportJob`, созданную админкой (движок обновит её, а не создаст новую).
 */
export async function callRunImportAction(formData: FormData): Promise<ImportActionResult> {
  const result = await runImportAction(formData);
  if (result && typeof result === "object" && "error" in result && result.error) {
    return { error: result.error };
  }
  return undefined;
}

/**
 * Прямой вызов движка `runImport` (вне Server Action): используется для
 * скриптов, крона и повторного запуска задачи по прайсу поставщика.
 * Проверку прав выполняет вызывающая сторона (админ-экшены вызывают `requireAdmin`).
 */
export async function callRunImport(formData: FormData): Promise<ImportActionResult> {
  const file = formData.get("file");
  const fileObject = file && typeof file === "object" && "size" in file ? (file as File) : null;
  const fileName = String(formData.get("fileName") ?? fileObject?.name ?? "").trim();
  const textField = String(formData.get("text") ?? "").trim();

  const text = textField || (fileObject ? await fileObject.text() : "");
  if (!text) return { error: "Нет данных прайса: передайте файл или текст выгрузки" };

  const input: ImportInput = {
    text,
    fileName: fileName || "price.xml",
    sourceType: normalizeSourceType(formData.get("sourceType"), fileName || "price.xml"),
    mode: normalizeMode(formData.get("mode")),
    supplierId: String(formData.get("supplierId") ?? "").trim() || undefined,
    userId: String(formData.get("userId") ?? "").trim() || undefined,
    defaultCategorySlug: String(formData.get("defaultCategorySlug") ?? "").trim() || undefined,
  };

  try {
    const result = await runImport(input);
    if (result.status === "failed") {
      return { error: result.errors[0] ?? "Импорт завершился с ошибкой" };
    }
    return undefined;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось выполнить импорт" };
  }
}

/** Модуль импорта подключён статически — раздел админки всегда доступен. */
export async function importModuleAvailable(): Promise<boolean> {
  return true;
}
