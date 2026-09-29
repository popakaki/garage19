/**
 * Короткие тексты результата для редиректов Server Actions.
 * Редирект намеренно передаёт код, а не текст: страница сама превращает код
 * в сообщение, поэтому произвольный текст из запроса не может попасть в UI.
 */

export const ADMIN_TOASTS = {
  // Заказы
  "order.updated": { type: "success", text: "Заказ обновлён" },
  "order.deleted": { type: "success", text: "Заказ удалён" },
  "order.status": { type: "success", text: "Статус заказа изменён" },
  "order.payment": { type: "success", text: "Статус оплаты изменён" },
  // Товары
  "product.created": { type: "success", text: "Товар создан" },
  "product.updated": { type: "success", text: "Товар сохранён" },
  "product.deleted": { type: "success", text: "Товар удалён" },
  "product.bulk": { type: "success", text: "Массовое действие выполнено" },
  "product.price_changed": { type: "success", text: "Цены пересчитаны" },
  "product.images": { type: "success", text: "Изображения сохранены" },
  "product.attributes": { type: "success", text: "Характеристики сохранены" },
  "product.documents": { type: "success", text: "Документы сохранены" },
  "product.relations": { type: "success", text: "Связи сохранены" },
  "product.upload": { type: "success", text: "Файл загружен" },
  // Категории и характеристики
  "category.created": { type: "success", text: "Категория создана" },
  "category.updated": { type: "success", text: "Категория сохранена" },
  "category.deleted": { type: "success", text: "Категория удалена" },
  "category.moved": { type: "success", text: "Товары перенесены" },
  "attribute.created": { type: "success", text: "Характеристика создана" },
  "attribute.updated": { type: "success", text: "Характеристика сохранена" },
  "attribute.deleted": { type: "success", text: "Характеристика удалена" },
  // Автомобили
  "brand.created": { type: "success", text: "Марка создана" },
  "brand.updated": { type: "success", text: "Марка сохранена" },
  "brand.deleted": { type: "success", text: "Марка удалена" },
  "model.created": { type: "success", text: "Модель создана" },
  "model.updated": { type: "success", text: "Модель сохранена" },
  "model.deleted": { type: "success", text: "Модель удалена" },
  "generation.created": { type: "success", text: "Поколение создано" },
  "generation.updated": { type: "success", text: "Поколение сохранено" },
  "generation.deleted": { type: "success", text: "Поколение удалено" },
  "modification.created": { type: "success", text: "Модификация создана" },
  "modification.updated": { type: "success", text: "Модификация сохранена" },
  "modification.deleted": { type: "success", text: "Модификация удалена" },
  // Совместимость
  "fitment.created": { type: "success", text: "Совместимость добавлена" },
  "fitment.deleted": { type: "success", text: "Привязки удалены" },
  // Импорт и поставщики
  "import.created": { type: "success", text: "Задача импорта создана" },
  "import.deleted": { type: "success", text: "Задача импорта удалена" },
  "supplier.created": { type: "success", text: "Поставщик создан" },
  "supplier.updated": { type: "success", text: "Поставщик сохранён" },
  "supplier.deleted": { type: "success", text: "Поставщик удалён" },
  // Отзывы и заявки
  "review.updated": { type: "success", text: "Отзыв обновлён" },
  "review.deleted": { type: "success", text: "Отзыв удалён" },
  "review.replied": { type: "success", text: "Ответ магазина сохранён" },
  "callback.updated": { type: "success", text: "Заявка обновлена" },
  "callback.deleted": { type: "success", text: "Заявка удалена" },
  // Контент
  "banner.created": { type: "success", text: "Баннер создан" },
  "banner.updated": { type: "success", text: "Баннер сохранён" },
  "banner.deleted": { type: "success", text: "Баннер удалён" },
  "page.created": { type: "success", text: "Страница создана" },
  "page.updated": { type: "success", text: "Страница сохранена" },
  "page.deleted": { type: "success", text: "Страница удалена" },
  // Города и доставка
  "city.created": { type: "success", text: "Город создан" },
  "city.updated": { type: "success", text: "Город сохранён" },
  "city.deleted": { type: "success", text: "Город удалён" },
  "tariff.created": { type: "success", text: "Тариф добавлен" },
  "tariff.updated": { type: "success", text: "Тариф сохранён" },
  "tariff.deleted": { type: "success", text: "Тариф удалён" },
  "pickup.created": { type: "success", text: "Пункт выдачи добавлен" },
  "pickup.updated": { type: "success", text: "Пункт выдачи сохранён" },
  "pickup.deleted": { type: "success", text: "Пункт выдачи удалён" },
  // Пользователи и настройки
  "user.created": { type: "success", text: "Пользователь создан" },
  "user.updated": { type: "success", text: "Пользователь обновлён" },
  "user.role": { type: "success", text: "Роль изменена" },
  "settings.saved": { type: "success", text: "Настройки сохранены" },
  "auth.loggedOut": { type: "success", text: "Вы вышли из админки" },
  // Ошибки
  "error.forbidden": { type: "danger", text: "Недостаточно прав для этого действия" },
  "error.invalid": { type: "danger", text: "Проверьте заполнение формы" },
  "error.notfound": { type: "danger", text: "Запись не найдена" },
  "error.unique": { type: "danger", text: "Такое значение уже используется (slug, артикул или код)" },
  "error.relation": { type: "danger", text: "Нельзя удалить запись: с ней связаны другие данные" },
  "error.failed": { type: "danger", text: "Не удалось выполнить действие. Попробуйте ещё раз" },
  "error.upload": { type: "danger", text: "Не удалось загрузить файл" },
} as const;

export type AdminToastCode = keyof typeof ADMIN_TOASTS;
export type AdminToastType = "success" | "danger" | "info" | "warning";
export type AdminToast = { code: AdminToastCode; type: AdminToastType; text: string };

/** Превращает код из query-параметра в сообщение (или null, если код неизвестен). */
export function resolveToast(code: string | undefined | null): AdminToast | null {
  if (!code) return null;
  const known = (ADMIN_TOASTS as Record<string, { type: AdminToastType; text: string }>)[code];
  if (!known) return null;
  return { code: code as AdminToastCode, type: known.type, text: known.text };
}
