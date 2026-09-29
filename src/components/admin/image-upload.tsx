"use client";

import { useEffect, useState } from "react";

/**
 * Изображения товара/сущности: список URL (по одному в строке) + загрузка файлов.
 * Загрузка идёт тем же составным POST-запросом, что и форма (multipart),
 * файлы обрабатываются Server Action и складываются в public/uploads.
 */

export function ImageUpload({
  name,
  label,
  hint,
  defaultValue = [],
  filesName,
  previews,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string[];
  filesName?: string;
  previews?: { url: string; alt?: string | null }[];
}) {
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [objectUrls]);

  return (
    <div className="space-y-3">
      <div>
        <label className="g19-label" htmlFor={name}>
          {label}
        </label>
        <textarea
          id={name}
          name={name}
          rows={Math.min(10, Math.max(4, defaultValue.length + 2))}
          defaultValue={defaultValue.join("\n")}
          placeholder={"https://example.com/photo-1.jpg\n/uploads/products/photo-2.jpg"}
          className="g19-input min-h-24 font-mono text-xs leading-relaxed"
        />
        <p className="mt-1 text-xs text-ink-400">
          {hint ?? "Один URL на строку. Первое изображение считается главным, порядок строк = порядок галереи."}
        </p>
      </div>

      {filesName && (
        <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-3">
          <label className="g19-label" htmlFor={filesName}>
            Загрузить файлы
          </label>
          <input
            id={filesName}
            type="file"
            name={filesName}
            multiple
            accept="image/*"
            className="block w-full cursor-pointer text-xs text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700"
            onChange={(event) => {
              objectUrls.forEach((url) => URL.revokeObjectURL(url));
              const files = event.target.files ? Array.from(event.target.files) : [];
              setObjectUrls(files.map((file) => URL.createObjectURL(file)));
            }}
          />
          <p className="mt-1 text-xs text-ink-400">
            jpg, png, webp или svg до 8 МБ. Файлы добавятся к списку URL после сохранения.
          </p>
        </div>
      )}

      {previews && previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((image, index) => (
            <span key={`${image.url}-${index}`} className="relative block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt ?? ""}
                className="size-20 rounded-lg border border-ink-200 object-cover"
              />
              {index === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  главное
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {objectUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {objectUrls.map((url, index) => (
            <span key={url} className="relative block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-20 rounded-lg border border-brand-300 object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-brand-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                новый {index + 1}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
