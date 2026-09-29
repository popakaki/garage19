/**
 * Демо-пользователи, заказы, «гараж» покупателя и записи на установку.
 *
 * Пароли не хранятся в файле: администратор создаётся из ADMIN_EMAIL/ADMIN_PASSWORD
 * (см. prisma/seed.ts), остальным пользователям сидер задаёт общий демо-пароль.
 */

export const DEMO_PASSWORD = "Garage19!Demo";

export type UserSeed = {
  email: string;
  name: string;
  phone?: string;
  role: "customer" | "manager" | "admin";
  citySlug?: string;
  daysAgo: number;
};

export const USERS: UserSeed[] = [
  {
    email: "manager@garage19.ru",
    name: "Ольга Менеджерова",
    phone: "+7 (495) 190-19-20",
    role: "manager",
    citySlug: "moskva",
    daysAgo: 420,
  },
  {
    email: "k.seleznev@example.com",
    name: "Кирилл Селезнёв",
    phone: "+7 (916) 555-11-22",
    role: "customer",
    citySlug: "moskva",
    daysAgo: 260,
  },
  {
    email: "anna.rybakova@example.com",
    name: "Анна Рыбакова",
    phone: "+7 (903) 222-33-44",
    role: "customer",
    citySlug: "sankt-peterburg",
    daysAgo: 180,
  },
  {
    email: "d.smirnov@example.com",
    name: "Дмитрий Смирнов",
    phone: "+7 (925) 777-88-99",
    role: "customer",
    citySlug: "kazan",
    daysAgo: 95,
  },
];

export type AddressSeed = {
  userEmail: string;
  title: string;
  citySlug: string;
  street: string;
  comment?: string;
  isDefault?: boolean;
};

export const ADDRESSES: AddressSeed[] = [
  {
    userEmail: "k.seleznev@example.com",
    title: "Дом",
    citySlug: "moskva",
    street: "г. Москва, ул. Профсоюзная, 104, кв. 37",
    comment: "Домофон 37, звонить за 30 минут",
    isDefault: true,
  },
  {
    userEmail: "anna.rybakova@example.com",
    title: "Дом",
    citySlug: "sankt-peterburg",
    street: "г. Санкт-Петербург, ул. Софийская, 60, корп. 1, кв. 12",
    isDefault: true,
  },
  {
    userEmail: "d.smirnov@example.com",
    title: "Работа",
    citySlug: "kazan",
    street: "г. Казань, ул. Петербургская, 50, офис 305",
    comment: "Доставка по будням до 18:00",
    isDefault: true,
  },
];

export type OrderItemSeed = {
  /** SKU товара из каталога. */
  sku: string;
  qty: number;
  /** Цена на момент заказа (копейки). Если не указана — берётся текущая цена товара. */
  price?: number;
};

export type OrderSeed = {
  /** Номер формируется formatOrderNumber(sequence). */
  sequence: number;
  userEmail?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  citySlug: string;
  status: "new" | "confirmed" | "assembling" | "shipped" | "done" | "canceled";
  paymentStatus: "pending" | "paid" | "refunded" | "failed";
  paymentType: "cash" | "card_on_delivery" | "card_online" | "invoice";
  deliveryType: "pickup" | "cdek_pvz" | "cdek_courier" | "boxberry_pvz" | "post" | "courier_local";
  deliveryProvider?: "cdek" | "boxberry" | "post" | "own";
  deliveryAddress?: string;
  pickupPointAddress?: string;
  deliveryPrice: number;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
  installRequested?: boolean;
  installPrice?: number;
  discount?: number;
  promoCode?: string;
  comment?: string;
  managerComment?: string;
  source: "site" | "phone" | "configurator";
  carInfo?: string;
  ip?: string;
  daysAgo: number;
  items: OrderItemSeed[];
};

/** Статусная история заказа — заполняется сидером по датам. */
export const ORDER_HISTORY_TEMPLATE: { status: string; note: string }[] = [
  { status: "new", note: "Заказ создан на сайте" },
  { status: "confirmed", note: "Заказ подтверждён менеджером" },
  { status: "assembling", note: "Заказ комплектуется на складе" },
  { status: "shipped", note: "Передан в службу доставки" },
  { status: "done", note: "Заказ получен покупателем" },
];

export const ORDERS: OrderSeed[] = [
  {
    sequence: 101,
    userEmail: "k.seleznev@example.com",
    customerName: "Кирилл Селезнёв",
    customerPhone: "+7 (916) 555-11-22",
    customerEmail: "k.seleznev@example.com",
    citySlug: "moskva",
    status: "done",
    paymentStatus: "paid",
    paymentType: "card_online",
    deliveryType: "courier_local",
    deliveryProvider: "own",
    deliveryAddress: "г. Москва, ул. Профсоюзная, 104, кв. 37",
    deliveryPrice: 0,
    deliveryDaysMin: 1,
    deliveryDaysMax: 1,
    installRequested: true,
    installPrice: 120_000,
    source: "configurator",
    carInfo: "Toyota Camry XV70 2018–2021",
    ip: "95.31.18.44",
    daysAgo: 120,
    items: [
      { sku: "THU-7204-7215", qty: 1 },
      { sku: "THU-9282-SNOWPACK-4", qty: 1 },
      { sku: "THU-544-LOCK", qty: 2 },
    ],
  },
  {
    sequence: 102,
    userEmail: "anna.rybakova@example.com",
    customerName: "Анна Рыбакова",
    customerPhone: "+7 (903) 222-33-44",
    customerEmail: "anna.rybakova@example.com",
    citySlug: "sankt-peterburg",
    status: "done",
    paymentStatus: "paid",
    paymentType: "card_online",
    deliveryType: "cdek_pvz",
    deliveryProvider: "cdek",
    pickupPointAddress: "г. Санкт-Петербург, Лиговский пр-т, 150",
    deliveryPrice: 35_000,
    deliveryDaysMin: 2,
    deliveryDaysMax: 5,
    source: "site",
    carInfo: "Kia Sportage QL 2015–2021",
    ip: "78.140.22.10",
    daysAgo: 90,
    items: [
      { sku: "THU-6295-MOTION-XT-XL", qty: 1 },
      { sku: "G19-STRAP-2", qty: 1 },
    ],
  },
  {
    sequence: 103,
    customerName: "Игорь Логинов",
    customerPhone: "+7 (911) 444-55-66",
    customerEmail: "igor.loginov@example.com",
    citySlug: "moskva",
    status: "shipped",
    paymentStatus: "paid",
    paymentType: "card_online",
    deliveryType: "cdek_courier",
    deliveryProvider: "cdek",
    deliveryAddress: "г. Химки, ул. Молодёжная, 14, кв. 88",
    deliveryPrice: 55_000,
    deliveryDaysMin: 2,
    deliveryDaysMax: 6,
    installRequested: true,
    installPrice: 600_000,
    source: "site",
    carInfo: "Jetour T2 2023–н.в.",
    ip: "188.170.75.9",
    daysAgo: 12,
    items: [
      { sku: "TOWRUS-289252-JETOUR-T2", qty: 1 },
      { sku: "EL-13TO7-ADAPTER", qty: 1 },
      { sku: "AUTHAK-BALL-COVER", qty: 1 },
    ],
  },
  {
    sequence: 104,
    userEmail: "d.smirnov@example.com",
    customerName: "Дмитрий Смирнов",
    customerPhone: "+7 (925) 777-88-99",
    customerEmail: "d.smirnov@example.com",
    citySlug: "kazan",
    status: "assembling",
    paymentStatus: "paid",
    paymentType: "card_online",
    deliveryType: "cdek_pvz",
    deliveryProvider: "cdek",
    pickupPointAddress: "г. Казань, ул. Пушкина, 12",
    deliveryPrice: 35_000,
    deliveryDaysMin: 3,
    deliveryDaysMax: 5,
    source: "site",
    carInfo: "Lada Vesta NG 2022–н.в.",
    ip: "85.140.11.203",
    daysAgo: 4,
    items: [
      { sku: "TOWRUS-VESTA-NG", qty: 1 },
      { sku: "EL-7PIN-UNI", qty: 1 },
      { sku: "TOWRUS-KIT-BOLTS", qty: 1 },
    ],
  },
  {
    sequence: 105,
    customerName: "Марина Волкова",
    customerPhone: "+7 (926) 123-45-67",
    customerEmail: "m.volkova@example.com",
    citySlug: "moskva",
    status: "confirmed",
    paymentStatus: "pending",
    paymentType: "cash",
    deliveryType: "pickup",
    deliveryPrice: 0,
    deliveryDaysMin: 0,
    deliveryDaysMax: 1,
    source: "phone",
    carInfo: "Haval Jolion 2021–н.в.",
    ip: "",
    daysAgo: 2,
    items: [
      { sku: "PIL-AERO-15", qty: 1 },
      { sku: "THU-5992-FREEIDE", qty: 2 },
    ],
  },
  {
    sequence: 106,
    customerName: "Роман Дорохов",
    customerPhone: "+7 (901) 234-56-78",
    customerEmail: "roman.d@example.com",
    citySlug: "ekaterinburg",
    status: "new",
    paymentStatus: "pending",
    paymentType: "invoice",
    deliveryType: "cdek_courier",
    deliveryProvider: "cdek",
    deliveryAddress: "г. Екатеринбург, ул. Малышева, 120, офис 12",
    deliveryPrice: 55_000,
    deliveryDaysMin: 4,
    deliveryDaysMax: 7,
    comment: "Нужны закрывающие документы и счёт на ООО «Уралстрой»",
    source: "site",
    carInfo: "Volkswagen Tiguan II",
    ip: "212.45.9.77",
    daysAgo: 1,
    items: [
      { sku: "AUTHAK-VW-TIGUAN", qty: 1 },
      { sku: "EL-13PIN-UNI", qty: 1 },
      { sku: "EL-HARNESS-5M", qty: 1 },
    ],
  },
  {
    sequence: 107,
    userEmail: "anna.rybakova@example.com",
    customerName: "Анна Рыбакова",
    customerPhone: "+7 (903) 222-33-44",
    customerEmail: "anna.rybakova@example.com",
    citySlug: "sankt-peterburg",
    status: "done",
    paymentStatus: "paid",
    paymentType: "card_on_delivery",
    deliveryType: "boxberry_pvz",
    deliveryProvider: "boxberry",
    pickupPointAddress: "г. Санкт-Петербург, Большой пр-т П.С., 44",
    deliveryPrice: 32_000,
    deliveryDaysMin: 3,
    deliveryDaysMax: 7,
    discount: 100_000,
    promoCode: "WINTER10",
    source: "site",
    carInfo: "Kia Sportage QL 2015–2021",
    ip: "78.140.22.10",
    daysAgo: 210,
    items: [
      { sku: "THU-9283-SNOWPACK-6", qty: 1, price: 1_990_000 },
      { sku: "MB-SKI-4", qty: 1, price: 1_090_000 },
    ],
  },
  {
    sequence: 108,
    userEmail: "k.seleznev@example.com",
    customerName: "Кирилл Селезнёв",
    customerPhone: "+7 (916) 555-11-22",
    customerEmail: "k.seleznev@example.com",
    citySlug: "moskva",
    status: "canceled",
    paymentStatus: "refunded",
    paymentType: "card_online",
    deliveryType: "courier_local",
    deliveryProvider: "own",
    deliveryAddress: "г. Москва, ул. Профсоюзная, 104, кв. 37",
    deliveryPrice: 0,
    deliveryDaysMin: 1,
    deliveryDaysMax: 2,
    managerComment: "Клиент отказался: не подошёл объём бокса, деньги возвращены.",
    source: "site",
    carInfo: "Toyota Camry XV70 2018–2021",
    ip: "95.31.18.44",
    daysAgo: 60,
    items: [{ sku: "MEN-BOX-320", qty: 1 }],
  },
  {
    sequence: 109,
    customerName: "Наталья Ковалёва",
    customerPhone: "+7 (915) 987-65-43",
    customerEmail: "n.kovaleva@example.com",
    citySlug: "nizhnij-novgorod",
    status: "done",
    paymentStatus: "paid",
    paymentType: "card_online",
    deliveryType: "post",
    deliveryProvider: "post",
    deliveryAddress: "г. Нижний Новгород, ул. Большая Покровская, 60, до востребования",
    deliveryPrice: 40_000,
    deliveryDaysMin: 5,
    deliveryDaysMax: 14,
    source: "site",
    carInfo: "Chery Tiggo 7 Pro 2020–н.в.",
    ip: "31.173.44.12",
    daysAgo: 150,
    items: [
      { sku: "BIZON-TIGGO-7-PRO", qty: 1 },
      { sku: "EL-13PIN-UNI", qty: 1 },
      { sku: "G19-ZAMOK-UNI", qty: 1 },
    ],
  },
  {
    sequence: 110,
    customerName: "Артём Гончаров",
    customerPhone: "+7 (962) 111-22-33",
    customerEmail: "artem.g@example.com",
    citySlug: "krasnodar",
    status: "confirmed",
    paymentStatus: "paid",
    paymentType: "card_online",
    deliveryType: "cdek_pvz",
    deliveryProvider: "cdek",
    pickupPointAddress: "г. Краснодар, ул. Ставропольская, 150",
    deliveryPrice: 35_000,
    deliveryDaysMin: 4,
    deliveryDaysMax: 6,
    installRequested: true,
    installPrice: 120_000,
    source: "configurator",
    carInfo: "Hyundai Tucson NX4 2020–н.в.",
    ip: "93.170.8.31",
    daysAgo: 6,
    items: [
      { sku: "BALTEX-HYUNDAI-TUCSON", qty: 1 },
      { sku: "EL-13PIN-KIA-HYUNDAI", qty: 1 },
    ],
  },
];

export type SavedCarSeed = {
  userEmail: string;
  brandSlug: string;
  modelSlug?: string;
  generationSlug?: string;
  label?: string;
  isPrimary?: boolean;
  daysAgo: number;
};

export const SAVED_CARS: SavedCarSeed[] = [
  {
    userEmail: "k.seleznev@example.com",
    brandSlug: "toyota",
    modelSlug: "camry",
    generationSlug: "xv70",
    label: "Моя Camry",
    isPrimary: true,
    daysAgo: 240,
  },
  {
    userEmail: "k.seleznev@example.com",
    brandSlug: "lada",
    modelSlug: "niva-legend",
    generationSlug: "2121",
    label: "Нива для дачи",
    daysAgo: 150,
  },
  {
    userEmail: "anna.rybakova@example.com",
    brandSlug: "kia",
    modelSlug: "sportage",
    generationSlug: "ql",
    label: "Sportage",
    isPrimary: true,
    daysAgo: 200,
  },
  {
    userEmail: "d.smirnov@example.com",
    brandSlug: "lada",
    modelSlug: "vesta",
    generationSlug: "ng",
    label: "Vesta NG",
    isPrimary: true,
    daysAgo: 80,
  },
];

export type InstallBookingSeed = {
  name: string;
  phone: string;
  email?: string;
  citySlug: string;
  carInfo: string;
  productSkus: string[];
  comment?: string;
  slotDateIso: string;
  slotTime: string;
  price: number;
  status: "new" | "confirmed" | "done" | "canceled";
  managerComment?: string;
};

export const INSTALL_BOOKINGS: InstallBookingSeed[] = [
  {
    name: "Игорь Логинов",
    phone: "+7 (911) 444-55-66",
    email: "igor.loginov@example.com",
    citySlug: "moskva",
    carInfo: "Jetour T2 2023",
    productSkus: ["TOWRUS-289252-JETOUR-T2"],
    comment: "Нужна установка фаркопа с электрикой 13-pin, машина на гарантии.",
    slotDateIso: "2025-05-17",
    slotTime: "10:00",
    price: 600_000,
    status: "confirmed",
    managerComment: "Мастер Дмитрий, бокс №2. Предупредить о протяжке через 500 км.",
  },
  {
    name: "Марина Волкова",
    phone: "+7 (926) 123-45-67",
    email: "m.volkova@example.com",
    citySlug: "moskva",
    carInfo: "Haval Jolion 2022",
    productSkus: ["PIL-AERO-15", "THU-5992-FREEIDE"],
    comment: "Установить багажник и два велокрепления, приеду с велосипедами.",
    slotDateIso: "2025-05-18",
    slotTime: "14:30",
    price: 220_000,
    status: "new",
  },
];
