"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { IMPORT_MODES } from "@/lib/constants";
import { startImportAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { AdminField, FormActions, FormSection } from "@/components/admin/form-fields";

/**
 * Запуск импорта прайса.
 * Файл уезжает в Server Action `startImportAction`, который создаёт ImportJob
 * и передаёт управление `runImportAction` из @/lib/import/actions.
 */

export function ImportStartForm({
  suppliers,
  importAvailable,
}: {
  suppliers: { id: string; name: string; feedType: string | null; priceUrl: string | null }[];
  importAvailable: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(startImportAction, null);
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok === true;

  return (
    <form action={formAction} encType="multipart/form-data">
      {!importAvailable && (
        <div className="px-5 pt-5">
          <Alert variant="warning" title="Модуль импорта ещё не подключён">
            Админка вызывает <code className="font-mono text-xs">runImportAction</code> из{" "}
            <code className="font-mono text-xs">@/lib/import/actions</code>. Пока модуль недоступен, задача создастся,
            но завершится ошибкой — обратитесь к разработчику импорта.
          </Alert>
        </div>
      )}

      {error && (
        <div className="px-5 pt-5">
          <Alert variant="danger">{error}</Alert>
        </div>
      )}
      {ok && (
        <div className="px-5 pt-5">
          <Alert variant="success">Импорт запущен — результат смотрите в журнале ниже</Alert>
        </div>
      )}

      <FormSection title="Новый импорт" description="XML, YML (Яндекс.Маркет) или CSV">
        <AdminField label="Файл прайса" htmlFor="file" required>
          <input
            id="file"
            type="file"
            name="file"
            required
            accept=".xml,.yml,.yaml,.csv,text/xml,text/csv"
            className="block w-full cursor-pointer text-xs text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
          />
          <p className="mt-1 text-xs text-ink-400">Файл передаётся импортёру целиком — размер ограничен настройками сервера.</p>
        </AdminField>

        <AdminField label="Поставщик" htmlFor="supplierId" hint="Наценка поставщика применяется при импорте">
          <select id="supplierId" name="supplierId" defaultValue="" className="g19-input cursor-pointer">
            <option value="">— без поставщика —</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
                {supplier.feedType ? ` (${supplier.feedType})` : ""}
              </option>
            ))}
          </select>
        </AdminField>

        <AdminField label="Режим импорта" htmlFor="mode">
          <select id="mode" name="mode" defaultValue="update" className="g19-input cursor-pointer">
            {Object.entries(IMPORT_MODES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </AdminField>

        <AdminField label="Имя файла (если загружаете по ссылке)" htmlFor="fileName" hint="Необязательно">
          <input id="fileName" name="fileName" placeholder="price-2025-05.xml" className="g19-input" />
        </AdminField>
      </FormSection>

      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Запустить импорт
        </button>
        <span className="text-xs text-ink-400">Задача появится в журнале со статусом и счётчиками.</span>
      </FormActions>
    </form>
  );
}
