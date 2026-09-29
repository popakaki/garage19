/**
 * Подписи для значений, которых нет в @/lib/constants
 * (типы документов и связи товаров из схемы Prisma).
 */

export const DOCUMENT_TYPES: Record<string, string> = {
  instruction: "Инструкция",
  passport: "Паспорт",
  certificate: "Сертификат",
  manual: "Руководство",
  other: "Другое",
};

export const RELATION_TYPES: Record<string, string> = {
  accessory: "Аксессуар",
  analog: "Аналог",
  similar: "Похожий товар",
};

export const FEED_TYPES: Record<string, string> = {
  xml: "XML",
  yml: "YML (Яндекс.Маркет)",
  csv: "CSV",
};

export const TARIFF_PROVIDERS: Record<string, string> = {
  cdek: "СДЭК",
  boxberry: "Boxberry",
  post: "Почта России",
  own: "Собственная доставка",
  pickup: "Самовывоз",
};

export const PICKUP_PROVIDERS: Record<string, string> = {
  cdek: "СДЭК",
  boxberry: "Boxberry",
  post: "Почта России",
  own: "Собственный пункт",
};

export const TEXT_ALIGN: Record<string, string> = {
  left: "Слева",
  center: "По центру",
  right: "Справа",
};

export const AUDIT_ACTIONS: Record<string, string> = {
  create: "Создание",
  update: "Изменение",
  delete: "Удаление",
  login: "Вход",
  logout: "Выход",
  import: "Импорт",
  status_change: "Смена статуса",
};
