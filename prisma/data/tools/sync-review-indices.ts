/**
 * Синхронизация productIndex в отзывах и вопросах с фактическим порядком PRODUCTS.
 *
 * Работает структурно: разбирает файл на записи массивов REVIEWS/QUESTIONS,
 * для каждой записи находит имя автора и уникальный фрагмент вопроса/заголовка,
 * после чего проставляет правильный productIndex по SKU.
 *
 * Запуск: npx tsx prisma/data/tools/sync-review-indices.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { PRODUCTS } from "../products";

const indexBySku = new Map(PRODUCTS.map((product, index) => [product.sku, index]));

const REVIEW_FIXES: Record<string, string> = {
  "Дмитрий К.|Встал на RAV4 идеально": "THU-7204-7215",
  "Марина В.|Тише, чем ожидала": "THU-7204-7215",
  "Сергей П.|SlideBar": "THU-9595-710410",
  "Алексей Т.|Хорошие дуги за свои деньги": "ATE-SIGNO-044150",
  "Ольга Н.|Второй сезон": "MB-XPLORE-920",
  "Павел Р.|На штатные места": "MB-XPLORE-930",
  "Илья Ж.|Whispbar": "WHI-WB-701",
  "Роман Д.|Нормально, но нужен адаптер": "YAK-JETSTREAM-9815",
  "Виктор С.|Лучший вариант для Vesta": "LUX-STRONG-2",
  "Галина М.|Дешёво и работает": "ATL-STANDART",
  "Никита А.|Piligrim порадовал": "PIL-AERO-15",
  "Евгений Л.|WingBar Evo": "THU-710410-PRO",
  "Артур Б.|Универсальный — значит универсальный": "G19-UNI-RACK-01",
  "Светлана К.|Motion XT XL": "THU-6295-MOTION-XT-XL",
  "Антон Г.|Разница с дешёвыми боксами": "THU-6295-MOTION-XT-XL",
  "Кирилл Ф.|400 л — оптимально": "THU-6298-MOTION-XT-L",
  "Дарья С.|Motion 3 XXL": "THU-6350-MOTION-3-XXL",
  "Максим Ю.|Casar 450": "ATE-CASAR-450",
  "Лилия Р.|Как раз для Creta": "ATE-CASAR-400",
  "Тимур Х.|Xplorer 350 на Vesta": "MB-XPLORER-350",
  "Ирина Д.|Quasar для коротких поездок": "MEN-BOX-320",
  "Юрий В.|Rollster Premium": "ROL-BOX-470",
  "Валентина П.|Аренда — отличная идея": "G19-BOX-RENT-400",
  "Григорий З.|BackUp 9034": "THU-9034-BOX-FARKOP",
  "Станислав О.|ProRide": "THU-5980-PRORIDE",
  "Владислав Н.|Четвёртый сезон": "THU-5980-PRORIDE",
  "Пётр М.|FreeRide для прогулочного": "THU-5992-FREEIDE",
  "Анастасия Л.|Barracuda": "MB-BARRACUDA",
  "Марат И.|EasyFold XT 3": "THU-934-EASYFOLD",
  "Ксения Б.|Atera Strada DL 3": "ATE-STRADA-DL3",
  "Юлия Т.|ClipOn на хэтчбек": "THU-9106-CLIPON-3",
  "Оксана Г.|Menabo на дверь": "MEN-DOOR-3",
  "Денис Ш.|SnowPack 6": "THU-9283-SNOWPACK-6",
  "Ринат А.|SnowPack 4": "THU-9282-SNOWPACK-4",
  "Людмила Ф.|Mont Blanc на 6 пар": "MB-SKI-6",
  "Андрей Ц.|Взял на две семьи": "MEN-SKI-6",
  "Егор С.|TowRus для Jetour T2": "TOWRUS-289252-JETOUR-T2",
  "Вадим Н.|X70 с фаркопом": "TOWRUS-289253-X70",
  "Михаил Е.|Camry XV70": "TOWRUS-289254-CAMRY-XV70",
  "Артур К.|Sportage QL": "TOWRUS-289255-SPORTAGE-QL",
  "Николай Б.|Для Vesta NG": "TOWRUS-VESTA-NG",
  "Регина М.|Jolion": "TOWRUS-JOLION",
  "Семён Р.|Baltex вертикальный": "BALTEX-JETOUR-T2",
  "Тамара И.|Baltex для Vesta": "BALTEX-VESTA",
  "Игорь Л.|Auto-Hak на Sportage": "AUTHAK-KIA-SPORTAGE-QL",
  "Олег Д.|Westfalia на X3": "WESTFALIA-BMW-X3",
  "Альбина С.|Bizon — самый бюджетный": "BIZON-VESTA",
  "Руслан Т.|Bizon для Tiggo 7 Pro": "BIZON-TIGGO-7-PRO",
  "Жанна А.|Duster с фаркопом": "TOWRUS-RENAULT-DUSTER",
  "Аркадий П.|Prado 150": "TOWRUS-LAND-CRUISER-150",
  "Эльвира Н.|Thule 859 Canyon": "THU-859-ROOFBASKET",
  "Захар В.|Atlant — бюджетная корзина": "ATL-KORZINA-UNI",
  "Инна К.|WaterPack для SUP": "THU-883-WATERPACK",
  "Глеб Ф.|Универсальные подушки": "G19-SUP-UNI",
  "Кристина О.|Замок Thule": "THU-544-LOCK",
  "Леонид Х.|Сетка на корзину": "G19-SETKA-KORZINA",
  "Виолетта С.|Электрика 13-pin": "EL-13PIN-TOYOTA",
  "Борис Е.|Модельная электрика Kia": "EL-13PIN-KIA-HYUNDAI",
  "Динара М.|Адаптер 13→7 выручил": "EL-13TO7-ADAPTER",
  "Клим Р.|Пока всё отлично": "THU-6345-MOTION-3-L",
  "Алёна В.|Супер": "THU-5991-UPGRIDE",
  "Тимофей Л.|Хороший фаркоп, но долго ждал": "BALTEX-CAMRY-XV70",
  "Снежана К.|Корзина Turtle": "TUR-KORZINA-1100",
  "Гость|Скидка не применилась": "G19-ZAMOK-UNI",
  "Полина Д.|Menabo Diamond": "MEN-BOX-440",
};

const QUESTION_FIXES: Record<string, string> = {
  "Игорь|Встанет ли этот багажник на RAV4 XA50": "THU-7204-7215",
  "Светлана|Замки идут в комплекте": "THU-7204-7215",
  "Роман|Подойдёт ли Atera Signo на Duster 2019": "ATE-SIGNO-044150",
  "Артём|Насколько тише Whispbar": "WHI-WB-701",
  "Владимир|Выдержит ли Lux Strong 2 корзину": "LUX-STRONG-2",
  "Екатерина|Влезут ли лыжи 190 см": "THU-6295-MOTION-XT-XL",
  "Денис|Можно ли открывать бокс с двух сторон": "THU-6295-MOTION-XT-XL",
  "Ольга|Есть ли гарантия на матовое покрытие": "THU-6350-MOTION-3-XXL",
  "Максим|Подойдёт ли ProRide для электровелосипеда": "THU-5980-PRORIDE",
  "Наталья|Нужен ли адаптер для установки на дуги Thule": "THU-5992-FREEIDE",
  "Сергей|Какая вертикальная нагрузка нужна на фаркопе": "THU-934-EASYFOLD",
  "Ирина|Складывается ли платформа для хранения": "THU-934-EASYFOLD",
  "Юрий|Подойдёт ли на заднюю дверь Kia Rio": "THU-9106-CLIPON-3",
  "Андрей|Поместятся ли сноуборды шириной 38 см": "THU-9283-SNOWPACK-6",
  "Андрей|Поместятся ли сноуборды шириной 32 см": "THU-9283-SNOWPACK-6",
  "Жанна|Нужно ли резать бампер при установке": "TOWRUS-289252-JETOUR-T2",
  "Пётр|Какие документы выдаются для ГИБДД": "TOWRUS-289252-JETOUR-T2",
  "Кирилл|Есть ли электрика в комплекте": "TOWRUS-289254-CAMRY-XV70",
  "Алина|Можно ли снять крюк": "TOWRUS-VESTA-NG",
  "Григорий|Сколько занимает установка в вашем сервисе": "BALTEX-VESTA",
  "Вера|Есть ли в комплекте крепёж": "THU-859-ROOFBASKET",
  "Олег|Будет ли корректно работать парктроник": "EL-13PIN-TOYOTA",
  "Лилия|Подойдёт ли замок к велокреплению Mont Blanc": "THU-544-LOCK",
  "Станислав|Можно ли мыть бокс на автоматической мойке": "ATE-CASAR-400",
  "Регина|Влезут ли три велосипеда": "ATE-STRADA-DL3",
  "Ефим|Есть ли вариант с электрикой в комплекте": "BIZON-TIGGO-7-PRO",
};

type Entry = {
  /** Полный текст записи, включая productIndex. */
  raw: string;
  /** Начало записи в исходнике. */
  start: number;
  authorName: string;
  /** Текст заголовка (отзыв) или вопроса. */
  label: string;
};

/** Разбирает литерал массива на записи верхнего уровня вида { ... }. */
function splitEntries(source: string, arrayStart: number): { entries: Entry[]; arrayEnd: number } {
  const entries: Entry[] = [];
  // arrayStart — индекс символа "[" в исходной строке
  let index = arrayStart + 1;
  if (source[arrayStart] !== "[") return { entries, arrayEnd: -1 };
  const arrayEnd = source.length;
  let depth = 0;
  let entryStart = -1;
  for (let i = index; i < arrayEnd; i += 1) {
    const char = source[i];
    if (char === "{") {
      if (depth === 0) entryStart = i;
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && entryStart >= 0) {
        const raw = source.slice(entryStart, i + 1);
        const authorName = raw.match(/authorName: "([^"]+)"/)?.[1] ?? "";
        const label = raw.match(/(?:title|question): "([^"]+)"/)?.[1] ?? "";
        entries.push({ raw, start: entryStart, authorName, label });
        entryStart = -1;
      }
    } else if (char === "]" && depth === 0) {
      return { entries, arrayEnd: i };
    }
  }
  return { entries, arrayEnd };
}

let source = readFileSync(new URL("../reviews.ts", import.meta.url), "utf8");
const report: string[] = [];

function applyFixes(
  sourceText: string,
  marker: string,
  fixes: Record<string, string>,
  label: string,
): string {
  const arrayStart = sourceText.indexOf(marker);
  if (arrayStart < 0) {
    report.push(`НЕ НАЙДЕН МАССИВ: ${label}`);
    return sourceText;
  }
  const assign = sourceText.indexOf("=", arrayStart);
  const bracket = assign < 0 ? -1 : sourceText.indexOf("[", assign);
  if (bracket < 0) {
    report.push(`НЕ НАЙДЕНА ОТКРЫВАЮЩАЯ СКОБКА: ${label}`);
    return sourceText;
  }
  const { entries } = splitEntries(sourceText, bracket);
  report.push(`── ${label}: записей ${entries.length} ──`);

  let result = sourceText;
  let applied = 0;
  for (const [key, sku] of Object.entries(fixes)) {
    const [authorName, fragment] = key.split("|");
    const target = indexBySku.get(sku);
    if (target === undefined) {
      report.push(`  НЕИЗВЕСТНЫЙ SKU: ${sku}`);
      continue;
    }
    const matches = entries.filter(
      (entry) => entry.authorName === authorName && entry.label.includes(fragment),
    );
    if (matches.length !== 1) {
      report.push(`  ${matches.length === 0 ? "НЕ НАЙДЕНО" : "НЕОДНОЗНАЧНО"} (${matches.length}): ${key}`);
      continue;
    }
    const entry = matches[0];
    const indexMatch = entry.raw.match(/productIndex: (\d+),/);
    if (!indexMatch || indexMatch.index === undefined) {
      report.push(`  НЕТ productIndex: ${key}`);
      continue;
    }
    const oldIndex = Number(indexMatch[1]);
    if (oldIndex === target) {
      report.push(`  OK   ${sku}: ${oldIndex}`);
      continue;
    }
    const absolute = entry.start + indexMatch.index;
    result = `${result.slice(0, absolute)}productIndex: ${target},${result.slice(absolute + indexMatch[0].length)}`;
    report.push(`  FIX  ${sku}: ${oldIndex} → ${target}  (${authorName})`);
    applied += 1;
  }
  report.push(`  применено правок: ${applied}`);
  return result;
}

source = applyFixes(source, "export const REVIEWS", REVIEW_FIXES, "Отзывы");
source = applyFixes(source, "export const QUESTIONS", QUESTION_FIXES, "Вопросы");

writeFileSync(new URL("../reviews.ts", import.meta.url), source, "utf8");
for (const line of report) console.log(line);
