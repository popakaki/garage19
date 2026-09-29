import { DEFAULT_SETTINGS } from "@/lib/settings";

/**
 * Группы настроек сайта для редактора в админке.
 * Набор ключей берётся из DEFAULT_SETTINGS (@/lib/settings), поэтому
 * настройки витрины и админки не расходятся.
 */

export const SETTING_GROUPS = [
  { key: "general", label: "Общие", description: "Название магазина и слоган" },
  { key: "contacts", label: "Контакты", description: "Телефон, email, адрес, часы работы" },
  { key: "seo", label: "SEO по умолчанию", description: "Заголовок и описание для страниц без своих метаданных" },
  { key: "delivery", label: "Доставка", description: "Порог бесплатной доставки и примечание" },
  { key: "payment", label: "Оплата", description: "Примечание о способах оплаты" },
  { key: "social", label: "Соцсети", description: "Ссылки в подвале сайта" },
] as const;

export type SettingGroupKey = (typeof SETTING_GROUPS)[number]["key"];

export type SettingFieldType = "text" | "textarea" | "number" | "bool";

const SETTING_TYPES: Record<string, SettingFieldType> = {
  "general.siteName": "text",
  "general.tagline": "text",
  "contacts.phone": "text",
  "contacts.email": "text",
  "contacts.address": "text",
  "contacts.workTime": "text",
  "seo.defaultTitle": "text",
  "seo.defaultDescription": "textarea",
  "seo.defaultKeywords": "textarea",
  "delivery.freeFrom": "number",
  "delivery.note": "textarea",
  "payment.note": "textarea",
  "social.telegram": "text",
  "social.whatsapp": "text",
  "social.vk": "text",
  "social.youtube": "text",
};

export type SettingsField = {
  key: string;
  type: SettingFieldType;
  label: string;
  hint?: string;
};

const FIELD_LABELS: Record<string, { label: string; hint?: string }> = {
  "general.siteName": { label: "Название магазина" },
  "general.tagline": { label: "Слоган" },
  "contacts.phone": { label: "Телефон", hint: "В формате +7 (900) 000-00-00" },
  "contacts.email": { label: "Email" },
  "contacts.address": { label: "Адрес" },
  "contacts.workTime": { label: "Часы работы" },
  "seo.defaultTitle": { label: "Title по умолчанию" },
  "seo.defaultDescription": { label: "Description по умолчанию" },
  "seo.defaultKeywords": { label: "Ключевые слова" },
  "delivery.freeFrom": { label: "Бесплатная доставка от, ₽", hint: "Сумма в рублях" },
  "delivery.note": { label: "Примечание о доставке" },
  "payment.note": { label: "Примечание об оплате" },
  "social.telegram": { label: "Telegram", hint: "Ссылка или @username" },
  "social.whatsapp": { label: "WhatsApp" },
  "social.vk": { label: "ВКонтакте" },
  "social.youtube": { label: "YouTube" },
};

/** Поля выбранной группы (порядок — как в DEFAULT_SETTINGS). */
export function settingsOfGroup(group: string): SettingsField[] {
  return Object.keys(DEFAULT_SETTINGS)
    .filter((key) => key.startsWith(`${group}.`))
    .map((key) => ({
      key,
      type: SETTING_TYPES[key] ?? "text",
      label: FIELD_LABELS[key]?.label ?? key.split(".")[1] ?? key,
      hint: FIELD_LABELS[key]?.hint,
    }));
}
