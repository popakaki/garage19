"use client";

import { useActionState, useState } from "react";
import { Alert, Textarea } from "@/components/ui";
import { createPageAction, updatePageAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { CheckboxField, FormActions, FormSection, TextField } from "@/components/admin/form-fields";
import { Prose } from "@/components/ui";

/** Форма страницы (Page): HTML-контент с предпросмотром, публикация, SEO. */

export type PageDefaults = {
  id?: string;
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string;
  isPublished?: boolean;
  showInHeader?: boolean;
  showInFooter?: boolean;
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
};

export function PageForm({
  mode,
  defaults,
  cancelHref = "/admin/pages",
}: {
  mode: "create" | "edit";
  defaults: PageDefaults;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    mode === "create" ? createPageAction : updatePageAction,
    null,
  );
  const [content, setContent] = useState(defaults.content ?? "");
  const [preview, setPreview] = useState(false);
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok === true;

  return (
    <form action={formAction}>
      {mode === "edit" && defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      {ok && (
        <Alert variant="success" className="mb-4">
          Страница сохранена
        </Alert>
      )}

      <FormSection title="Страница">
        <TextField label="Заголовок" name="title" defaultValue={defaults.title} required />
        <TextField label="Slug (URL)" name="slug" defaultValue={defaults.slug} hint="Например: delivery или garantii" />
        <TextField
          label="Краткое описание"
          name="excerpt"
          defaultValue={defaults.excerpt}
          wrapperClassName="sm:col-span-2"
          hint="Показывается в списках и подвале"
        />
        <TextField label="Порядок" name="sortOrder" type="number" defaultValue={String(defaults.sortOrder ?? 100)} />
      </FormSection>

      <FormSection title="Содержимое (HTML)" columns={1}>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="g19-label mb-0" htmlFor="content">
              HTML-код страницы
            </label>
            <button
              type="button"
              onClick={() => setPreview((current) => !current)}
              className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
            >
              {preview ? "Скрыть предпросмотр" : "Предпросмотр"}
            </button>
          </div>
          <Textarea
            id="content"
            name="content"
            rows={14}
            required
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="font-mono text-xs"
          />
          <p className="mt-1 text-xs text-ink-400">
            Разрешены заголовки h2/h3, списки, таблицы и ссылки — они выводятся в стилях сайта.
          </p>
        </div>

        {preview && (
          <div className="rounded-xl border border-dashed border-ink-200 bg-white p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Предпросмотр</p>
            <Prose html={content} />
          </div>
        )}
      </FormSection>

      <FormSection title="Публикация">
        <CheckboxField label="Опубликована" name="isPublished" defaultChecked={defaults.isPublished ?? true} />
        <CheckboxField label="Показывать в шапке" name="showInHeader" defaultChecked={defaults.showInHeader ?? false} />
        <CheckboxField label="Показывать в подвале" name="showInFooter" defaultChecked={defaults.showInFooter ?? true} />
      </FormSection>

      <FormSection title="SEO" columns={1}>
        <TextField label="SEO Title" name="seoTitle" defaultValue={defaults.seoTitle} />
        <div>
          <label className="g19-label" htmlFor="seoDescription">
            SEO Description
          </label>
          <Textarea id="seoDescription" name="seoDescription" rows={2} defaultValue={defaults.seoDescription} />
        </div>
      </FormSection>

      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {mode === "create" ? "Создать страницу" : "Сохранить страницу"}
        </button>
        <a
          href={cancelHref}
          className="inline-flex items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
        >
          Отмена
        </a>
      </FormActions>
    </form>
  );
}
