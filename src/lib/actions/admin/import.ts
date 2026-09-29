"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { IMPORT_MODES } from "@/lib/constants";
import {
  audit,
  errorToastCode,
  fail,
  getFormEnum,
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  redirectWith,
  toState,
  type ActionResult,
  type ActionState,
} from "@/lib/admin/actions";
import { callRunImportAction } from "@/lib/admin/import-bridge";

/**
 * Импорт прайсов: создание задачи (ImportJob) и запуск через Server Action
 * `runImportAction` из `@/lib/import/actions` (реализация — зона другого
 * разработчика, см. src/lib/admin/import-bridge.ts).
 */

const IMPORT_MODE_KEYS = Object.keys(IMPORT_MODES);
const SOURCE_TYPES = ["xml", "yml", "csv"];

function detectSourceType(fileName: string, declared: string): string {
  if (SOURCE_TYPES.includes(declared)) return declared;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".yml")) return "yml";
  return "xml";
}

function revalidateImport(): void {
  revalidatePath("/admin/import");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

/**
 * Загрузка файла прайса: создаёт ImportJob со статусом pending,
 * передаёт управление импортёру и показывает результат в журнале.
 */
export async function startImportAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const fileName = getFormString(formData, "fileName");
  const sourceType = detectSourceType(fileName, getFormString(formData, "sourceType"));
  const mode = getFormEnum(formData, "mode", IMPORT_MODE_KEYS, "update") ?? "update";
  const supplierId = getFormOptional(formData, "supplierId") ?? null;
  const file = formData.get("file");

  const prepared = new FormData();
  prepared.set("sourceType", sourceType);
  prepared.set("mode", mode);
  if (supplierId) prepared.set("supplierId", supplierId);
  if (fileName) prepared.set("fileName", fileName);
  if (file && typeof file === "object" && "size" in file) prepared.set("file", file as File);

  return guardAction("import", async (user) => {
    const hasFile = file && typeof file === "object" && "size" in file && (file as File).size > 0;
    if (!hasFile && !fileName) return fail("Выберите файл прайса или укажите его имя");
    if (supplierId && !isId(supplierId)) return fail("Поставщик не найден");

    const job = await prisma.importJob.create({
      data: {
        fileName: fileName || (file as File).name,
        sourceType,
        supplierId,
        userId: user.id,
        status: "pending",
        mode,
      },
    });

    prepared.set("jobId", job.id);
    await audit(user, "import", "importJob", job.id, { fileName: job.fileName, sourceType, mode, supplierId });

    let error: string | undefined;
    try {
      const result = await callRunImportAction(prepared);
      if (result && "error" in result && result.error) error = result.error;
    } catch {
      error = "Импортёр недоступен: модуль @/lib/import/actions не загрузился";
    }

    revalidateImport();
    if (error) return fail(error);
    return { ok: true };
  });
}

/** Повторный запуск существующей задачи импорта. */
export async function rerunImportAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  let toast = "import.created";

  await guardAction("import", async (user) => {
    if (!isId(id)) return fail("Задача не найдена");
    const job = await prisma.importJob.findUnique({ where: { id } });
    if (!job) return fail("Задача не найдена");

    await prisma.importJob.update({
      where: { id },
      data: { status: "pending", errorCount: 0, log: null, finishedAt: null },
    });

    const prepared = new FormData();
    prepared.set("jobId", job.id);
    prepared.set("sourceType", job.sourceType);
    prepared.set("mode", job.mode);
    prepared.set("fileName", job.fileName);
    if (job.supplierId) prepared.set("supplierId", job.supplierId);

    try {
      const result = await callRunImportAction(prepared);
      if (result && "error" in result && result.error) {
        await prisma.importJob.update({
          where: { id },
          data: { status: "failed", log: result.error, finishedAt: new Date() },
        });
        toast = "error.failed";
      }
    } catch {
      await prisma.importJob.update({
        where: { id },
        data: { status: "failed", log: "Импортёр недоступен", finishedAt: new Date() },
      });
      toast = "error.failed";
    }

    await audit(user, "import", "importJob", id, { rerun: true });
    revalidateImport();
    return { ok: true };
  });

  redirectWith("/admin/import", toast);
}

/** Очистка журнала: удаление завершённых задач импорта. */
export async function clearFinishedImportsAction(formData: FormData): Promise<void> {
  const ids = formData
    .getAll("ids")
    .filter((value): value is string => typeof value === "string" && value !== "" && isId(value));

  const result = await guardAction("import", async (user) => {
    const where = ids.length > 0 ? { id: { in: ids } } : { status: { in: ["done", "failed"] } };
    const removed = await prisma.importJob.deleteMany({ where });
    await audit(user, "delete", "importJob", null, { removed: removed.count });
    revalidateImport();
    return { ok: true };
  });

  redirectWith("/admin/import", errorToastCode(result) ?? "import.deleted");
}

export async function deleteImportJobAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return toState(await applyImportJobDelete(formData));
}

async function applyImportJobDelete(formData: FormData): Promise<ActionResult> {
  return guardAction("import", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Задача не найдена");
    await prisma.importJob.delete({ where: { id } });
    await audit(user, "delete", "importJob", id);
    revalidateImport();
    return { ok: true };
  });
}

/** Проверка прав на раздел импорта (только администратор). */
export async function canRunImport(): Promise<boolean> {
  const user = await getCurrentUser();
  return Boolean(user && user.role === "admin");
}
