import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { SETTING_GROUPS, settingsOfGroup } from "@/lib/admin/settings";
import { getRecentAudit } from "@/lib/admin/audit";
import { formatDate } from "@/lib/utils";
import { AdminPanelPage } from "@/components/admin/panel-page";
import { AdminPageHeader, AdminCard } from "@/components/admin/page-parts";
import { StatusBadge } from "@/components/admin/badges";
import { SettingsGroupForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Настройки" };

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  return (
    <AdminPanelPage resource="settings" requireAdminRole>
      {async () => {
        const [values, auditTrail] = await Promise.all([getSettings(), getRecentAudit(10, undefined)]);

        return (
          <div className="space-y-5">
            <AdminPageHeader
              title="Настройки"
              description="Контакты, SEO по умолчанию, условия доставки и оплаты, соцсети. Изменения применяются сразу."
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                {SETTING_GROUPS.map((group) => {
                  const fields = settingsOfGroup(group.key);
                  if (fields.length === 0) return null;
                  return (
                    <div key={group.key} className="g19-card overflow-hidden">
                      <SettingsGroupForm
                        group={group.key}
                        title={group.label}
                        description={group.description}
                        fields={fields}
                        values={values}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <AdminCard title="Как это работает">
                  <ul className="space-y-2 text-sm text-ink-600">
                    <li>
                      Настройки хранятся в таблице <code className="font-mono text-xs">Setting</code> и читаются сайтом
                      через <code className="font-mono text-xs">getSettings()</code>.
                    </li>
                    <li>
                      Если значение не задано, используется значение по умолчанию из{" "}
                      <code className="font-mono text-xs">DEFAULT_SETTINGS</code>.
                    </li>
                    <li>Пустое поле означает «не задано» — на витрине появится значение по умолчанию.</li>
                  </ul>
                </AdminCard>

                <AdminCard title="Последние изменения" padded={false}>
                  {auditTrail.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-ink-400">Записей нет</p>
                  ) : (
                    <ul className="divide-y divide-ink-100">
                      {auditTrail.map((entry) => (
                        <li key={entry.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-xs">
                          <span className="min-w-0 truncate text-ink-600">
                            <StatusBadge tone="outline">{entry.action}</StatusBadge>{" "}
                            <span className="ml-1">{entry.entity}</span>
                            {entry.entityId ? <span className="text-ink-400"> · {entry.entityId}</span> : null}
                          </span>
                          <span className="shrink-0 text-ink-400">{formatDate(entry.createdAt, true)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </AdminCard>
              </div>
            </div>
          </div>
        );
      }}
    </AdminPanelPage>
  );
}
