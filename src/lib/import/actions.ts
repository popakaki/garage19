"use server";

/**
 * Server Action для админ-страницы импорта прайсов.
 *
 * Вызывается из формы с файлом:
 * ```tsx
 * <form action={runImportAction}>
 *   <input type="file" name="file" accept=".xml,.yml,.csv" />
 *   <select name="sourceType"><option value="yml">YML</option>...</select>
 *   <select name="mode"><option value="update">Обновлять</option>...</select>
 *   <select name="supplierId">...</select>
 *   <button type="submit">Загрузить</button>
 * </form>
 * ```
 *
 * Поля формы: `file` (File, обязателен), `sourceType`, `mode`, `supplierId`,
 * `defaultCategorySlug`. Возвращает `{ error }` либо `{ result }`.
 */

import { requireAdmin } from "@/lib/auth";
import { runImport } from "./index";
import type { ImportMode, ImportResult, ImportSourceType } from "./types";

const MODES: ImportMode[] = ["update", "insert_only", "dry_run"];
const SOURCE_TYPES: ImportSourceType[] = ["xml", "yml", "csv"];

export type ImportActionResult = {
  error?: string;
  result?: ImportResult;
};

/** Определяет формат по расширению файла, если поле не заполнено. */
function sourceTypeFromFileName(fileName: string): ImportSourceType {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "csv") return "csv";
  if (extension === "yml") return "yml";
  return "xml";
}

export async function runImportAction(formData: FormData): Promise<ImportActionResult> {
  let user;
  try {
    user = await requireAdmin();
  } catch {
    return { error: "Недостаточно прав: импорт доступен администратору и менеджеру." };
  }

  const file = formData.get("file");
  const jobId = String(formData.get("jobId") ?? "").trim() || undefined;

  if (!(file instanceof File) || file.size === 0) {
    // Повторный запуск задачи из журнала: файл не сохраняется, поэтому запрашиваем его заново.
    return {
      error: jobId
        ? "Повторный запуск требует файла: выберите прайс ещё раз (исходный файл не хранится на сервере)."
        : "Выберите файл прайса (.xml, .yml или .csv).",
    };
  }

  const rawSourceType = String(formData.get("sourceType") ?? "").trim();
  const sourceType = (SOURCE_TYPES as string[]).includes(rawSourceType)
    ? (rawSourceType as ImportSourceType)
    : sourceTypeFromFileName(file.name);

  const rawMode = String(formData.get("mode") ?? "").trim() || "update";
  const mode = (MODES as string[]).includes(rawMode) ? (rawMode as ImportMode) : "update";

  const supplierId = String(formData.get("supplierId") ?? "").trim() || undefined;
  const defaultCategorySlug = String(formData.get("defaultCategorySlug") ?? "").trim() || undefined;
  // Имя файла из формы имеет приоритет: админка позволяет загружать прайс «по ссылке».
  const fileName = String(formData.get("fileName") ?? "").trim() || file.name;

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { error: "Не удалось прочитать файл. Попробуйте сохранить его в UTF-8 и повторить." };
  }

  if (text.trim() === "") {
    return { error: "Файл пуст." };
  }

  try {
    const result = await runImport({
      text,
      fileName,
      sourceType,
      supplierId,
      mode,
      userId: user.id,
      defaultCategorySlug,
      jobId,
    });
    return { result };
  } catch (error) {
    return { error: `Импорт не выполнен: ${(error as Error).message}` };
  }
}
