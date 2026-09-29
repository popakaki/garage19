/**
 * Слоты записи на установку.
 * Вынесены из Server Actions в обычный модуль, чтобы их можно было
 * безопасно импортировать в клиентские компоненты.
 */

export const INSTALL_SLOTS = [
  "09:00–11:00",
  "11:00–13:00",
  "13:00–15:00",
  "15:00–17:00",
  "17:00–19:00",
] as const;

export type InstallSlot = (typeof INSTALL_SLOTS)[number];

/** Ближайшие N доступных дат (воскресенье пропускаем — сервис не работает). */
export function nextInstallDates(count = 10, from = new Date()): string[] {
  const dates: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (dates.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() === 0) continue;
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
}
