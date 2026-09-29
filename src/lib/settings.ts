import { cache } from "react";
import prisma from "@/lib/prisma";
import { SITE } from "@/lib/constants";

/**
 * Настройки сайта из БД (таблица Setting) с фолбэком на значения по умолчанию.
 * Читаются на каждом запросе, но кэшируются в рамках одного рендера.
 */
export const DEFAULT_SETTINGS: Record<string, string> = {
  "general.siteName": SITE.name,
  "general.tagline": SITE.tagline,
  "contacts.phone": SITE.phone,
  "contacts.email": SITE.email,
  "contacts.address": SITE.address,
  "contacts.workTime": SITE.workTime,
  "seo.defaultTitle": `${SITE.name} — ${SITE.tagline}`,
  "seo.defaultDescription":
    "Багажники на крышу, автобоксы, велокрепления, лыжные крепления и фаркопы с подбором по марке, модели и поколению автомобиля. Доставка по России, установка в сервисе.",
  "seo.defaultKeywords": "багажник на крышу, автобокс, велокрепление, фаркоп, ТСУ, подбор багажника",
  "delivery.freeFrom": String(SITE.freeDeliveryFrom),
  "delivery.note": "Доставка по России от 2 дней. Точная стоимость рассчитывается при оформлении заказа.",
  "payment.note": "Оплата картой онлайн, при получении или по счёту для юридических лиц.",
  "social.telegram": "",
  "social.whatsapp": "",
  "social.vk": "",
  "social.youtube": "",
};

export const getSettings = cache(async (): Promise<Record<string, string>> => {
  const settings = { ...DEFAULT_SETTINGS };
  try {
    const rows = await prisma.setting.findMany();
    for (const row of rows) {
      if (row.value !== null && row.value !== undefined && row.value !== "") {
        settings[row.key] = row.value;
      }
    }
  } catch {
    // БД ещё не инициализирована — используем значения по умолчанию
  }
  return settings;
});

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const settings = await getSettings();
  return settings[key] ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
