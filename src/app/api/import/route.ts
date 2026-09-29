/**
 * POST /api/import — импорт прайса поставщика.
 *
 * Поддерживает два формата запроса:
 *  1. `multipart/form-data` с полем `file` (плюс необязательные `fileName`,
 *     `sourceType`, `supplierId`, `mode`, `defaultCategorySlug`);
 *  2. `application/json` с телом `{ text, fileName, sourceType, supplierId, mode, defaultCategorySlug }`.
 *
 * Доступ: только администратор или менеджер (`requireAdmin`).
 *
 * Ответ: `ImportResult` (см. docs/IMPORT.md) либо `{ error }` со статусом 4xx/5xx.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runImport } from "@/lib/import";
import type { ImportInput, ImportMode, ImportSourceType } from "@/lib/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES: ImportMode[] = ["update", "insert_only", "dry_run"];
const SOURCE_TYPES: ImportSourceType[] = ["xml", "yml", "csv"];

function sourceTypeFromFileName(fileName: string): ImportSourceType {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "csv") return "csv";
  if (extension === "yml") return "yml";
  return "xml";
}

function normalizeMode(value: unknown): ImportMode {
  const mode = String(value ?? "update").trim();
  return (MODES as string[]).includes(mode) ? (mode as ImportMode) : "update";
}

function normalizeSourceType(value: unknown, fileName: string): ImportSourceType {
  const sourceType = String(value ?? "").trim();
  return (SOURCE_TYPES as string[]).includes(sourceType)
    ? (sourceType as ImportSourceType)
    : sourceTypeFromFileName(fileName);
}

function optionalString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text === "" ? undefined : text;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userId: string;
  try {
    const user = await requireAdmin();
    userId = user.id;
  } catch {
    return NextResponse.json(
      { error: "Недостаточно прав: импорт доступен администратору и менеджеру." },
      { status: 403 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  let input: ImportInput;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (file instanceof File) {
        const text = await file.text();
        if (text.trim() === "") {
          return NextResponse.json({ error: "Файл пуст." }, { status: 400 });
        }
        input = {
          text,
          fileName: optionalString(formData.get("fileName")) ?? file.name,
          sourceType: normalizeSourceType(formData.get("sourceType"), file.name),
          supplierId: optionalString(formData.get("supplierId")),
          mode: normalizeMode(formData.get("mode")),
          userId,
          defaultCategorySlug: optionalString(formData.get("defaultCategorySlug")),
          jobId: optionalString(formData.get("jobId")),
        };
      } else {
        // Админка может прислать уже прочитанный текст (например, после предпросмотра)
        const text = optionalString(formData.get("text"));
        const fileName = optionalString(formData.get("fileName"));
        if (!text || !fileName) {
          return NextResponse.json(
            { error: "Ожидается файл в поле «file» либо поля «text» и «fileName»." },
            { status: 400 },
          );
        }
        input = {
          text,
          fileName,
          sourceType: normalizeSourceType(formData.get("sourceType"), fileName),
          supplierId: optionalString(formData.get("supplierId")),
          mode: normalizeMode(formData.get("mode")),
          userId,
          defaultCategorySlug: optionalString(formData.get("defaultCategorySlug")),
          jobId: optionalString(formData.get("jobId")),
        };
      }
    } else {
      const body = (await request.json()) as Record<string, unknown>;
      const text = typeof body.text === "string" ? body.text : "";
      const fileName = optionalString(body.fileName);

      if (!text.trim() || !fileName) {
        return NextResponse.json(
          { error: "В JSON-теле обязательны поля «text» и «fileName»." },
          { status: 400 },
        );
      }

      input = {
        text,
        fileName,
        sourceType: normalizeSourceType(body.sourceType, fileName),
        supplierId: optionalString(body.supplierId),
        mode: normalizeMode(body.mode),
        userId,
        defaultCategorySlug: optionalString(body.defaultCategorySlug),
        jobId: optionalString(body.jobId),
      };
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Не удалось разобрать запрос: ${(error as Error).message}` },
      { status: 400 },
    );
  }

  try {
    const result = await runImport(input);
    return NextResponse.json(result, { status: result.status === "failed" ? 422 : 200 });
  } catch (error) {
    return NextResponse.json({ error: `Импорт не выполнен: ${(error as Error).message}` }, { status: 500 });
  }
}

/** GET /api/import — краткая справка для разработчика. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "POST /api/import",
    contentTypes: ["multipart/form-data", "application/json"],
    fields: {
      file: "File — обязателен для multipart",
      text: "string — обязателен для JSON",
      fileName: "string — обязателен для JSON",
      sourceType: SOURCE_TYPES,
      mode: MODES,
      supplierId: "string — id поставщика (наценка и purchasePrice)",
      defaultCategorySlug: "string — категория для товаров без категории",
    },
    docs: "/docs/IMPORT.md",
  });
}
