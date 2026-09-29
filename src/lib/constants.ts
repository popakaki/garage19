/**
 * Общие константы проекта.
 * Статусы и типы хранятся в БД строками — здесь единый источник правды
 * для форм, фильтров, бейджей и валидации.
 */

export const SITE = {
  name: "Garage19",
  legalName: 'Автомагазин "Garage19"',
  tagline: "Багажники, автобоксы, крепления и фаркопы для вашего авто",
  phone: "+7 (900) 000-00-00",
  phoneHref: "tel:+79000000000",
  email: "info@garage19.ru",
  address: "г. Москва, ул. Автомобильная, 19",
  workTime: "Пн–Сб 09:00–20:00, Вс 10:00–18:00",
  inn: "",
  ogrn: "",
  defaultCity: "Москва",
  freeDeliveryFrom: 1_500_000, // 15 000 ₽
  currency: "₽",
} as const;

/** Категории-«якоря» каталога (используются в меню и на главной, если нет БД). */
export const CORE_CATEGORIES = [
  { slug: "bagazhniki", name: "Багажники на крышу", icon: "Cargo" },
  { slug: "avtoboksy", name: "Автобоксы", icon: "Box" },
  { slug: "veloperekreateli", name: "Велокрепления", icon: "Bike" },
  { slug: "lyzhnye-krepleniya", name: "Лыжные крепления", icon: "Snowflake" },
  { slug: "farkopy", name: "Фаркопы (ТСУ)", icon: "Truck" },
  { slug: "krepezh-i-aksessuary", name: "Крепёж и аксессуары", icon: "Wrench" },
] as const;

/** Позиции баннеров на главной. */
export const BANNER_POSITIONS = {
  hero: "Главный слайдер",
  promo: "Промо-блок",
  category: "Баннер категории",
} as const;

export const USER_ROLES = {
  customer: "Покупатель",
  manager: "Менеджер",
  admin: "Администратор",
} as const;

export type UserRole = keyof typeof USER_ROLES;

export const ORDER_STATUSES = {
  new: "Новый",
  confirmed: "Подтверждён",
  assembling: "Комплектуется",
  shipped: "Отправлен",
  done: "Выполнен",
  canceled: "Отменён",
} as const;

export type OrderStatus = keyof typeof ORDER_STATUSES;

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  new: "bg-brand-100 text-brand-800",
  confirmed: "bg-blue-100 text-blue-800",
  assembling: "bg-amber-100 text-amber-800",
  shipped: "bg-indigo-100 text-indigo-800",
  done: "bg-emerald-100 text-emerald-800",
  canceled: "bg-ink-200 text-ink-700",
};

export const PAYMENT_STATUSES = {
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  refunded: "Возврат",
  failed: "Ошибка оплаты",
} as const;

export const PAYMENT_TYPES = {
  cash: "Наличными при получении",
  card_on_delivery: "Картой при получении",
  card_online: "Онлайн-оплата картой",
  invoice: "Счёт для юридических лиц",
} as const;

export type PaymentType = keyof typeof PAYMENT_TYPES;

export const DELIVERY_TYPES = {
  pickup: "Самовывоз со склада",
  cdek_pvz: "СДЭК — пункт выдачи",
  cdek_courier: "СДЭК — курьером до двери",
  boxberry_pvz: "Boxberry — пункт выдачи",
  post: "Почта России",
  courier_local: "Курьер по городу",
} as const;

export type DeliveryType = keyof typeof DELIVERY_TYPES;

export const DELIVERY_PROVIDERS = {
  pickup: "Самовывоз",
  cdek: "СДЭК",
  boxberry: "Boxberry",
  post: "Почта России",
  own: "Собственная доставка",
} as const;

export const REVIEW_STATUSES = {
  pending: "На модерации",
  published: "Опубликован",
  rejected: "Отклонён",
} as const;

export const CALLBACK_TYPES = {
  callback: "Обратный звонок",
  question: "Вопрос по товару",
  vin: "Подбор по VIN",
  install: "Запись на установку",
  wholesale: "Оптовый запрос",
} as const;

export const CALLBACK_STATUSES = {
  new: "Новая",
  in_progress: "В работе",
  done: "Обработана",
  spam: "Спам",
} as const;

export const FITMENT_TYPES = {
  specific: "Для конкретных авто",
  universal: "Универсальный",
} as const;

export const ATTRIBUTE_TYPES = {
  select: "Список",
  number: "Число",
  bool: "Да / Нет",
  text: "Текст",
} as const;

export const IMPORT_STATUSES = {
  pending: "В очереди",
  running: "Выполняется",
  done: "Завершён",
  failed: "Ошибка",
} as const;

export const IMPORT_MODES = {
  update: "Обновлять и добавлять",
  insert_only: "Только добавлять новые",
  dry_run: "Проверка без записи",
} as const;

/** Быстрые фильтры цены для каталога (в копейках). */
export const PRICE_RANGES = [
  { label: "до 5 000 ₽", min: 0, max: 500_000 },
  { label: "5 000 – 15 000 ₽", min: 500_000, max: 1_500_000 },
  { label: "15 000 – 30 000 ₽", min: 1_500_000, max: 3_000_000 },
  { label: "30 000 – 60 000 ₽", min: 3_000_000, max: 6_000_000 },
  { label: "от 60 000 ₽", min: 6_000_000, max: undefined },
] as const;

export const SORT_OPTIONS = {
  popular: "Популярные",
  price_asc: "Сначала дешёвые",
  price_desc: "Сначала дорогие",
  new: "Новинки",
  rating: "По рейтингу",
  name: "По названию",
} as const;

export type SortOption = keyof typeof SORT_OPTIONS;

export const ACCOUNT_NAV = [
  { href: "/account", label: "Личный кабинет", icon: "LayoutDashboard" },
  { href: "/account/orders", label: "Мои заказы", icon: "Package" },
  { href: "/account/profile", label: "Профиль", icon: "User" },
  { href: "/account/reviews", label: "Мои отзывы", icon: "Star" },
] as const;

export const ADMIN_NAV = [
  { href: "/admin", label: "Сводка", icon: "LayoutDashboard", exact: true },
  { href: "/admin/orders", label: "Заказы", icon: "ShoppingCart" },
  { href: "/admin/products", label: "Товары", icon: "Package" },
  { href: "/admin/categories", label: "Категории", icon: "FolderTree" },
  { href: "/admin/attributes", label: "Характеристики", icon: "SlidersHorizontal" },
  { href: "/admin/cars", label: "Автомобили", icon: "Car" },
  { href: "/admin/compatibility", label: "Совместимость", icon: "Link2" },
  { href: "/admin/import", label: "Импорт прайсов", icon: "FileUp" },
  { href: "/admin/suppliers", label: "Поставщики", icon: "Factory" },
  { href: "/admin/reviews", label: "Отзывы", icon: "Star" },
  { href: "/admin/callbacks", label: "Заявки", icon: "PhoneCall" },
  { href: "/admin/banners", label: "Баннеры", icon: "Images" },
  { href: "/admin/pages", label: "Страницы", icon: "FileText" },
  { href: "/admin/cities", label: "Города и доставка", icon: "MapPin" },
  { href: "/admin/users", label: "Пользователи", icon: "Users" },
  { href: "/admin/settings", label: "Настройки", icon: "Settings" },
] as const;

export const PER_PAGE = 24;
export const ADMIN_PER_PAGE = 20;
