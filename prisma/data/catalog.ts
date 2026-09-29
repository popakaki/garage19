/**
 * Иерархия каталога: категории и характеристики (Attribute).
 *
 * Слаг'и соответствуют CORE_CATEGORIES из src/lib/constants.ts — на них завязаны
 * навигация, сиды товаров и импорт прайсов (маппинг YML-категорий).
 */

import type { AttributeType } from "./types";

export type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  image?: string;
  sortOrder: number;
  showInMenu?: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  children?: CategorySeed[];
};

export const CATEGORY_TREE: CategorySeed[] = [
  {
    slug: "bagazhniki",
    name: "Багажники на крышу",
    icon: "Cargo",
    image: "/images/products/bagazhnik-1.svg",
    sortOrder: 10,
    description:
      "Поперечины и дуги на крышу: на рейлинги, на гладкую крышу через штатные места и водосточный желоб. Аэродинамические и прямоугольные профили, грузоподъёмность до 100 кг, замки в комплекте.",
    seoTitle: "Багажники на крышу — подбор по марке и модели авто | Garage19",
    seoDescription:
      "Багажники на крышу Thule, Atera, Mont Blanc, Lux, Titan с подбором по марке, модели и поколению автомобиля. Установка на рейлинги, гладкую крышу и штатные места. Доставка по России.",
    seoKeywords: "багажник на крышу, дуги на крышу, поперечины, рейлинги, автобагажник, купить багажник",
    children: [
      {
        slug: "bagazhniki-na-rejlingi",
        name: "На рейлинги",
        icon: "AlignVerticalSpaceAround",
        sortOrder: 10,
        description:
          "Крепления на продольные рейлинги — самый распространённый тип для кроссоверов и универсалов. Установка без сверления, монтаж за 10–15 минут.",
        seoTitle: "Багажники на рейлинги — купить с подбором по авто | Garage19",
        seoDescription:
          "Багажники на рейлинги для кроссоверов и универсалов: Thule, Atera, Lux, Titan. Подбор по марке и модели, установка без сверления крыши.",
        seoKeywords: "багажник на рейлинги, дуги на рейлинги, поперечины на рейлинги",
      },
      {
        slug: "bagazhniki-na-gladkuyu-kryshu",
        name: "На гладкую крышу",
        icon: "AlignHorizontalSpaceAround",
        sortOrder: 20,
        description:
          "Для автомобилей без рейлингов: крепление за водосточный желоб или штатные отверстия. Обязательно указывайте поколение — упоры подбираются индивидуально.",
        seoTitle: "Багажники на гладкую крышу — подбор по авто | Garage19",
        seoDescription:
          "Багажники на гладкую крышу без рейлингов: крепление за водосток и штатные места. Подбор по поколению автомобиля, доставка по России.",
        seoKeywords: "багажник на гладкую крышу, багажник без рейлингов, водосток, штатные места",
      },
      {
        slug: "bagazhniki-shtatnye-mesta",
        name: "На штатные места",
        icon: "Anchor",
        sortOrder: 30,
        description:
          "Крепления в заводские точки крепления на крыше (заглушки или резьбовые гнёзда). Надёжнее и тише универсальных упоров.",
        seoTitle: "Багажники на штатные места крыши | Garage19",
        seoDescription:
          "Багажники, устанавливаемые в штатные точки крепления крыши автомобиля. Подбор по марке, модели и поколению.",
        seoKeywords: "багажник на штатные места, штатные точки крепления, дуги",
      },
    ],
  },
  {
    slug: "avtoboksy",
    name: "Автобоксы",
    icon: "Box",
    image: "/images/products/avtoboks-1.svg",
    sortOrder: 20,
    description:
      "Автомобильные боксы на крышу объёмом от 300 до 600 литров: двухстороннее открытие, крепление Quick Grip, замок с ключом, возможность аренды на одну поездку.",
    seoTitle: "Автобоксы на крышу — Thule, Atera, Mont Blanc, Menabo | Garage19",
    seoDescription:
      "Автобоксы 300–600 л с подбором по авто: Thule Motion XT, Atera Casar, Mont Blanc, Menabo. Аренда автобокса, доставка по России, установка в сервисе.",
    seoKeywords: "автобокс, автобагажник, бокс на крышу, Thule Motion, аренда автобокса",
    children: [
      {
        slug: "avtoboksy-300-400",
        name: "300–400 литров",
        icon: "Box",
        sortOrder: 10,
        description:
          "Компактные боксы для хэтчбеков и седанов: 3–4 чемодана, лыжи до 170 см, вес груза до 50 кг.",
        seoTitle: "Автобоксы 300–400 литров — купить | Garage19",
        seoDescription: "Компактные автобоксы объёмом 300–400 л для седанов, хэтчбеков и кроссоверов.",
        seoKeywords: "автобокс 350 л, автобокс 400 л, компактный автобокс",
      },
      {
        slug: "avtoboksy-400-480",
        name: "440–480 литров",
        icon: "Box",
        sortOrder: 20,
        description:
          "Оптимальный объём для семьи: подходит под большинство кроссоверов и универсалов, не мешает открытию багажника.",
        seoTitle: "Автобоксы 440–480 литров — купить | Garage19",
        seoDescription: "Автобоксы объёмом 440–480 л — оптимальный выбор для кроссоверов и универсалов.",
        seoKeywords: "автобокс 450 л, автобокс 480 л",
      },
      {
        slug: "avtoboksy-500-plus",
        name: "От 500 литров",
        icon: "Box",
        sortOrder: 30,
        description:
          "Максимальный объём для минивэнов, больших кроссоверов и дальних поездок: до 75 кг груза и лыжи до 200 см.",
        seoTitle: "Автобоксы от 500 литров — купить | Garage19",
        seoDescription: "Большие автобоксы от 500 л для минивэнов и крупных кроссоверов.",
        seoKeywords: "автобокс 500 л, автобокс 600 л, большой автобокс",
      },
      {
        slug: "avtoboksy-na-farkop",
        name: "На фаркоп",
        icon: "Truck",
        sortOrder: 40,
        description:
          "Грузовые платформы и боксы на фаркоп: не увеличивают расход топлива, легко снимаются, подходят для велосипедов и багажа.",
        seoTitle: "Автобоксы и платформы на фаркоп | Garage19",
        seoDescription: "Боксы и грузовые платформы на фаркоп: монтаж за 5 минут, без нагрузки на крышу.",
        seoKeywords: "автобокс на фаркоп, платформа на фаркоп, грузовой бокс",
      },
    ],
  },
  {
    slug: "veloperekreateli",
    name: "Велокрепления",
    icon: "Bike",
    image: "/images/products/velokreplenie-1.svg",
    sortOrder: 30,
    description:
      "Крепления для перевозки велосипедов на крышу, фаркоп и заднюю дверь. Замок в комплекте, крепление за раму или за колёса, до 4 велосипедов на фаркопе.",
    seoTitle: "Велокрепления на крышу, фаркоп и заднюю дверь | Garage19",
    seoDescription:
      "Велокрепления Thule, Atera, Mont Blanc, Menabo, Yakima: на крышу, на фаркоп, на заднюю дверь. Подбор по авто, замки, доставка по России.",
    seoKeywords: "велокрепление, крепление для велосипеда, велобагажник, фаркопное велокрепление",
    children: [
      {
        slug: "velokrepleniya-na-kryshu",
        name: "На крышу",
        icon: "Bike",
        sortOrder: 10,
        description:
          "Крепление велосипеда за раму или вилку на поперечины крыши. Компактно, но требует подъёма велосипеда на высоту.",
        seoTitle: "Велокрепления на крышу — купить | Garage19",
        seoDescription: "Велокрепления на крышу: крепление за раму или вилку, замок в комплекте.",
        seoKeywords: "велокрепление на крышу, крепление велосипеда на крышу",
      },
      {
        slug: "velokrepleniya-na-farkop",
        name: "На фаркоп",
        icon: "Truck",
        sortOrder: 20,
        description:
          "Платформы на фаркоп на 2–4 велосипеда: не нужно поднимать велосипед, есть откидная функция для доступа в багажник.",
        seoTitle: "Велокрепления на фаркоп — купить | Garage19",
        seoDescription: "Велокрепления и платформы на фаркоп на 2–4 велосипеда с замком и откидным механизмом.",
        seoKeywords: "велокрепление на фаркоп, платформа для велосипедов на фаркоп",
      },
      {
        slug: "velokrepleniya-na-zadnyuyu-dver",
        name: "На заднюю дверь",
        icon: "DoorOpen",
        sortOrder: 30,
        description:
          "Универсальные крепления на заднюю дверь для автомобилей без фаркопа. Важно учитывать количество дверей и наличие спойлера.",
        seoTitle: "Велокрепления на заднюю дверь — купить | Garage19",
        seoDescription: "Велокрепления на заднюю дверь: 2–3 велосипеда, монтаж без фаркопа.",
        seoKeywords: "велокрепление на заднюю дверь, велобагажник на багажник",
      },
    ],
  },
  {
    slug: "lyzhnye-krepleniya",
    name: "Лыжные крепления",
    icon: "Snowflake",
    image: "/images/products/lyzhnoe-kreplenie-1.svg",
    sortOrder: 40,
    description:
      "Крепления для лыж и сноубордов на 2–6 пар: аэродинамические модели шириной 80–90 см, замок в комплекте, совместимы с любыми поперечинами.",
    seoTitle: "Лыжные крепления и крепления для сноуборда | Garage19",
    seoDescription:
      "Лыжные крепления Thule SnowPack, Mont Blanc, Menabo на 4 и 6 пар и крепления для сноуборда. Подбор по авто, доставка по России.",
    seoKeywords: "лыжное крепление, крепление для сноуборда, лыжный бокс, SnowPack",
    children: [
      {
        slug: "lyzhi-4-pary",
        name: "На 4 пары",
        icon: "Snowflake",
        sortOrder: 10,
        description: "Компактные крепления на 3–4 пары лыж или 2 сноуборда.",
        seoTitle: "Лыжные крепления на 4 пары | Garage19",
        seoDescription: "Лыжные крепления на 4 пары лыж или 2 сноуборда с замком.",
        seoKeywords: "лыжное крепление 4 пары, крепление для сноуборда",
      },
      {
        slug: "lyzhi-6-par",
        name: "На 6 пар",
        icon: "Snowflake",
        sortOrder: 20,
        description: "Широкие крепления на 6 пар лыж — для больших компаний и семейных поездок.",
        seoTitle: "Лыжные крепления на 6 пар | Garage19",
        seoDescription: "Лыжные крепления на 6 пар: ширина 90 см, замок в комплекте.",
        seoKeywords: "лыжное крепление 6 пар, широкое лыжное крепление",
      },
    ],
  },
  {
    slug: "farkopy",
    name: "Фаркопы (ТСУ)",
    icon: "Truck",
    image: "/images/products/farkop-1.svg",
    sortOrder: 50,
    description:
      "Тягово-сцепные устройства для буксировки прицепа: съёмные и несъёмные, вертикальные и горизонтальные, с вырезом бампера и без. Паспорт и сертификат в комплекте, установка и помощь с регистрацией в ГИБДД.",
    seoTitle: "Фаркопы (ТСУ) с паспортом и сертификатом — подбор по авто | Garage19",
    seoDescription:
      "Фаркопы TowRus, Baltex, Auto-Hak, Galia, Oris, Westfalia, Brink с подбором по марке и модели. Тяговая нагрузка до 2500 кг, паспорт и сертификат для ГИБДД, установка в сервисе.",
    seoKeywords: "фаркоп, ТСУ, тягово-сцепное устройство, фаркоп с электрикой, регистрация фаркопа ГИБДД",
    children: [
      {
        slug: "farkopy-syemnye",
        name: "Съёмные",
        icon: "Truck",
        sortOrder: 10,
        description:
          "Крюк снимается одним движением — не портит внешний вид и не мешает парковке. Быстросъёмные системы с замком.",
        seoTitle: "Съёмные фаркопы (ТСУ) — купить | Garage19",
        seoDescription: "Съёмные фаркопы с замком: крюк снимается без инструмента, паспорт и сертификат в комплекте.",
        seoKeywords: "съёмный фаркоп, быстросъёмный фаркоп, фаркоп с замком",
      },
      {
        slug: "farkopy-nesemnye",
        name: "Несъёмные",
        icon: "Truck",
        sortOrder: 20,
        description:
          "Классическая жёсткая конструкция: максимальная надёжность и тяговая нагрузка до 2500 кг.",
        seoTitle: "Несъёмные фаркопы (ТСУ) — купить | Garage19",
        seoDescription: "Несъёмные фаркопы с тяговой нагрузкой до 2500 кг: надёжность и цена.",
        seoKeywords: "несъёмный фаркоп, жёсткий фаркоп, ТСУ",
      },
      {
        slug: "farkopy-s-elektrikoy",
        name: "С электрикой",
        icon: "Plug",
        sortOrder: 30,
        description:
          "Комплект с электрикой 7-pin или 13-pin и согласующим блоком — готовое решение под ключ.",
        seoTitle: "Фаркопы с электрикой 7-pin и 13-pin | Garage19",
        seoDescription: "Фаркопы с электрикой в комплекте: 7-pin и 13-pin, согласующий блок, установка в сервисе.",
        seoKeywords: "фаркоп с электрикой, фаркоп 13 pin, розетка фаркопа",
      },
    ],
  },
  {
    slug: "korziny-i-platformy",
    name: "Корзины и платформы",
    icon: "Grid3x3",
    image: "/images/products/korzina-1.svg",
    sortOrder: 60,
    description:
      "Универсальные корзины на крышу и грузовые платформы на фаркоп: перевозка объёмных и грязных грузов, крепёжные петли, борт из алюминия.",
    seoTitle: "Корзины на крышу и грузовые платформы | Garage19",
    seoDescription:
      "Корзины на крышу и платформы на фаркоп: алюминий, крепёжные петли, грузоподъёмность до 100 кг. Подбор по авто.",
    seoKeywords: "корзина на крышу, грузовая платформа, багажная корзина, платформа на фаркоп",
  },
  {
    slug: "vodnoe-snaryazhenie",
    name: "Водное снаряжение",
    icon: "Waves",
    image: "/images/products/voda-1.svg",
    sortOrder: 70,
    description:
      "Крепления для каяков, SUP-досок и сёрфов на крышу: мягкие стропы, J-образные держатели, комплекты на 1–2 доски.",
    seoTitle: "Крепления для каяков и SUP-досок | Garage19",
    seoDescription:
      "Крепления для каяков, SUP-досок и сёрфов на крышу автомобиля: J-образные держатели и мягкие стропы.",
    seoKeywords: "крепление для каяка, SUP крепление, перевозка каяка, крепление для сёрфа",
  },
  {
    slug: "krepezh-i-aksessuary",
    name: "Крепёж и аксессуары",
    icon: "Wrench",
    image: "/images/products/aksessuar-1.svg",
    sortOrder: 80,
    description:
      "Замки и ключи, ремкомплекты, сумки для автобоксов, ремни-стяжки, адаптеры T-track, заглушки и переходники под фаркоп.",
    seoTitle: "Аксессуары и крепёж для багажных систем | Garage19",
    seoDescription:
      "Замки, ремкомплекты, сумки, ремни, адаптеры T-track и переходники для багажников, автобоксов и фаркопов.",
    seoKeywords: "ремкомплект багажника, замок для багажника, сумка для автобокса, адаптер T-track",
  },
  {
    slug: "elektrika-farkopov",
    name: "Электрика фаркопов",
    icon: "Plug",
    image: "/images/products/elektrika-1.svg",
    sortOrder: 90,
    description:
      "Электрические комплекты для фаркопа: розетки 7-pin и 13-pin, согласующие блоки, жгуты проводки, адаптеры и переходники.",
    seoTitle: "Электрика для фаркопа: розетки 7-pin и 13-pin | Garage19",
    seoDescription:
      "Электрические комплекты для фаркопа: розетка 7-pin, 13-pin, согласующий блок, жгут проводки, адаптер 13→7.",
    seoKeywords: "электрика фаркопа, розетка 13 pin, согласующий блок фаркопа, жгут проводки",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Характеристики (Attribute)
// ─────────────────────────────────────────────────────────────────────────────

export type AttributeSeed = {
  slug: string;
  name: string;
  type: AttributeType;
  unit?: string;
  options?: string[];
  isFilterable?: boolean;
  isRequired?: boolean;
  group?: string;
  sortOrder: number;
  /** Категории, к которым привязана характеристика (по slug). */
  categories: string[];
};

export const ATTRIBUTE_SEEDS: AttributeSeed[] = [
  {
    slug: "mesto-ustanovki",
    name: "Место установки",
    type: "select",
    options: ["рейлинги", "штатные места", "гладкая крыша", "фаркоп", "задняя дверь", "водосточный желоб", "интегрированные рейлинги"],
    group: "Совместимость",
    sortOrder: 10,
    isRequired: true,
    categories: ["bagazhniki", "avtoboksy", "veloperekreateli", "lyzhnye-krepleniya", "korziny-i-platformy", "vodnoe-snaryazhenie"],
  },
  {
    slug: "material",
    name: "Материал",
    type: "select",
    options: ["алюминий", "сталь", "ABS-пластик", "комбинированный"],
    group: "Конструкция",
    sortOrder: 20,
    isRequired: true,
    categories: ["bagazhniki", "avtoboksy", "veloperekreateli", "lyzhnye-krepleniya", "farkopy", "korziny-i-platformy", "vodnoe-snaryazhenie"],
  },
  {
    slug: "profil",
    name: "Профиль",
    type: "select",
    options: ["WingBar", "аэродинамический", "прямоугольный", "овальный"],
    group: "Конструкция",
    sortOrder: 30,
    categories: ["bagazhniki"],
  },
  {
    slug: "tip-kryuka",
    name: "Тип крюка",
    type: "select",
    options: ["съёмный", "быстросъёмный с замком", "несъёмный", "вертикальный съёмный", "фланцевый"],
    group: "Конструкция",
    sortOrder: 40,
    categories: ["farkopy"],
  },
  {
    slug: "gruzopodyomnost",
    name: "Грузоподъёмность",
    type: "number",
    unit: "кг",
    group: "Нагрузка",
    sortOrder: 50,
    isRequired: true,
    categories: ["bagazhniki", "korziny-i-platformy", "veloperekreateli", "vodnoe-snaryazhenie"],
  },
  {
    slug: "obyom",
    name: "Объём",
    type: "number",
    unit: "л",
    group: "Габариты",
    sortOrder: 60,
    categories: ["avtoboksy"],
  },
  {
    slug: "zamok-v-komplekte",
    name: "Замок в комплекте",
    type: "bool",
    group: "Комплектация",
    sortOrder: 70,
    categories: ["bagazhniki", "avtoboksy", "veloperekreateli", "lyzhnye-krepleniya", "korziny-i-platformy"],
  },
  {
    slug: "vyrez-bampera",
    name: "Вырез бампера",
    type: "bool",
    group: "Установка",
    sortOrder: 80,
    categories: ["farkopy"],
  },
  {
    slug: "elektrika-v-komplekte",
    name: "Электрика в комплекте",
    type: "bool",
    group: "Комплектация",
    sortOrder: 90,
    categories: ["farkopy"],
  },
  {
    slug: "kolichestvo-dverey",
    name: "Количество дверей",
    type: "number",
    unit: "шт",
    group: "Совместимость",
    sortOrder: 100,
    categories: ["veloperekreateli"],
  },
  {
    slug: "garantiya",
    name: "Гарантия",
    type: "number",
    unit: "мес",
    group: "Сервис",
    sortOrder: 110,
    categories: ["bagazhniki", "avtoboksy", "veloperekreateli", "lyzhnye-krepleniya", "farkopy", "korziny-i-platformy", "vodnoe-snaryazhenie", "krepezh-i-aksessuary", "elektrika-farkopov"],
  },
  {
    slug: "tip-razema",
    name: "Тип разъёма",
    type: "select",
    options: ["7-pin", "13-pin", "13→7", "USB", "универсальный"],
    group: "Электрика",
    sortOrder: 120,
    categories: ["elektrika-farkopov"],
  },
  {
    slug: "kolichestvo-velosipedov",
    name: "Количество велосипедов",
    type: "number",
    unit: "шт",
    group: "Габариты",
    sortOrder: 130,
    categories: ["veloperekreateli"],
  },
  {
    slug: "kolichestvo-par-lyzh",
    name: "Количество пар лыж",
    type: "number",
    unit: "пар",
    group: "Габариты",
    sortOrder: 140,
    categories: ["lyzhnye-krepleniya"],
  },
  {
    slug: "vertikalnaya-nagruzka",
    name: "Вертикальная нагрузка",
    type: "number",
    unit: "кг",
    group: "Нагрузка",
    sortOrder: 150,
    categories: ["farkopy"],
  },
  {
    slug: "tyagovaya-nagruzka",
    name: "Тяговая нагрузка",
    type: "number",
    unit: "кг",
    group: "Нагрузка",
    sortOrder: 160,
    categories: ["farkopy"],
  },
];

/** Карта «slug категории → slug'и характеристик» для быстрого доступа в сидере. */
export function attributesForCategory(categorySlug: string): AttributeSeed[] {
  return ATTRIBUTE_SEEDS.filter(
    (attribute) =>
      attribute.categories.includes(categorySlug) ||
      attribute.categories.some((parent) => categorySlug.startsWith(`${parent}-`)),
  );
}
