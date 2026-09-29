import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Загрузка файлов (изображения товаров, логотипы) в public/uploads.
 * Файловые операции изолированы здесь, чтобы Server Actions оставались читаемыми.
 */

export const UPLOAD_DIRS = {
  products: "public/uploads/products",
  categories: "public/uploads/categories",
  banners: "public/uploads/banners",
  pages: "public/uploads/pages",
  brands: "public/uploads/brands",
  documents: "public/uploads/documents",
} as const;

export type UploadKind = keyof typeof UPLOAD_DIRS;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 МБ
const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/avif"];
const DOCUMENT_MIME = ["application/pdf"];

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

function extensionFor(name: string, type: string): string {
  const mapped = MIME_EXTENSION[type];
  if (mapped) return mapped;
  const fromName = path.extname(name).replace(".", "").toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(fromName) ? fromName : "bin";
}

function sanitizeBaseName(name: string): string {
  const base = path.basename(name, path.extname(name));
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "file"
  );
}

/**
 * Сохраняет загруженный файл и возвращает публичный URL (/uploads/...).
 * Проверяет размер и MIME-тип — в public нельзя класть произвольные данные.
 */
export async function saveUpload(file: File, kind: UploadKind = "products"): Promise<UploadResult> {
  if (!file || typeof file === "string") return { ok: false, error: "Файл не выбран" };
  if (file.size === 0) return { ok: false, error: "Файл пустой" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Файл больше 8 МБ" };

  const isImage = IMAGE_MIME.includes(file.type);
  const isDocument = DOCUMENT_MIME.includes(file.type);
  if (!isImage && !isDocument) {
    return { ok: false, error: "Поддерживаются изображения (jpg, png, webp, svg) и PDF" };
  }
  if (kind === "documents" && !isDocument && !isImage) {
    return { ok: false, error: "Для документов принимаются PDF или изображения" };
  }

  const extension = extensionFor(file.name || "file", file.type);
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeBaseName(file.name || "file")}.${extension}`;
  const relativeDir = UPLOAD_DIRS[kind];
  const absoluteDir = path.join(process.cwd(), relativeDir);

  try {
    await mkdir(absoluteDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(absoluteDir, fileName), buffer);
  } catch {
    return { ok: false, error: "Не удалось сохранить файл на диске" };
  }

  const publicPrefix = relativeDir.replace(/^public/, "");
  return { ok: true, url: `${publicPrefix}/${fileName}` };
}

/** Первый файл из FormData по имени поля. */
export function getUploadFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (value && typeof value === "object" && "arrayBuffer" in value && "size" in value) {
    const file = value as File;
    return file.size > 0 ? file : null;
  }
  return null;
}

export function isRemoteOrLocalUrl(value: string): boolean {
  return /^(https?:)?\/\//.test(value) || value.startsWith("/");
}
