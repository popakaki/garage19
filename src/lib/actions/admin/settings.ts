"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { settingsOfGroup } from "@/lib/admin/settings";
import {
  audit,
  fail,
  getFormString,
  guardAction,
  type ActionResult,
  type ActionState,
} from "@/lib/admin/actions";

/**
 * Настройки сайта (таблица Setting).
 * Поля группы называются так же, как ключи настроек, — сохранение идёт
 * простым перебором по списку из @/lib/admin/settings.
 */

function revalidateSettings(): void {
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}

/** Сохранение группы настроек. */
export async function saveSettingsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("settings", async (user) => {
    const group = getFormString(formData, "group");
    const fields = settingsOfGroup(group);
    if (fields.length === 0) return fail("Неизвестная группа настроек");

    const existing = await prisma.setting.findMany({ where: { key: { in: fields.map((item) => item.key) } } });
    const before = new Map(existing.map((row) => [row.key, row.value]));

    const changed: Record<string, { before: string; after: string }> = {};

    for (const field of fields) {
      const raw = getFormString(formData, field.key);
      const value = field.type === "number" ? raw.replace(/\s|₽/g, "").replace(",", ".") : raw;
      const previous = before.get(field.key) ?? DEFAULT_SETTINGS[field.key] ?? "";
      if (previous === value) continue;

      await prisma.setting.upsert({
        where: { key: field.key },
        create: { key: field.key, value, group, label: field.label },
        update: { value, group },
      });
      changed[field.key] = { before: previous, after: value };
    }

    if (Object.keys(changed).length === 0) return { ok: true };

    await audit(user, "update", "setting", group, changed);
    revalidateSettings();
    return { ok: true };
  });
}

/** Сохранение одной настройки (используется вспомогательными формами). */
export async function saveSingleSettingAction(formData: FormData): Promise<ActionResult> {
  return guardAction("settings", async (user) => {
    const key = getFormString(formData, "key");
    const value = getFormString(formData, "value");
    if (!key || !(key in DEFAULT_SETTINGS)) return fail("Неизвестная настройка");

    await prisma.setting.upsert({
      where: { key },
      create: { key, value, group: key.split(".")[0] ?? "general" },
      update: { value },
    });
    await audit(user, "update", "setting", key, { value });
    revalidateSettings();
    return { ok: true };
  });
}
