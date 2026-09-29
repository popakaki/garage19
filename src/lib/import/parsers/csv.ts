/**
 * Парсер CSV-прайсов с гибким сопоставлением заголовков.
 *
 * Поддерживает русские и английские названия колонок, разделители `,` `;` `\t`,
 * кодировку UTF-8 (файл должен быть передан текстом) и BOM.
 * Колонки совместимости: `fitment` («Toyota Camry XV70;Kia Sportage QL»)
 * либо отдельные `brand` / `model` / `generation`.
 *
 * Не обращается к БД: возвращает «сырые» офферы (см. types.ts).
 */

import { parse as parseCsvSync } from "csv-parse/sync";
import type { ParseResult, RawOffer } from "../types";

/** Синонимы заголовков → внутреннее поле. */
const HEADER_ALIASES: Record<string, string[]> = {
  sku: ["sku", "артикул", "код", "code", "vendorcode", "vendor_code", "partnumber", "part_number", "номер"],
  externalId: ["id", "externalid", "external_id", "offerid", "offer_id", "кодтовара", "guid"],
  name: ["name", "название", "наименование", "товар", "title", "product", "номенклатура"],
  price: ["price", "цена", "стоимость", "ценаруб", "цена_руб", "розница", "ценапродажи"],
  oldPrice: ["oldprice", "old_price", "ценадо", "стараяцена", "старая_цена", "ценабезскидки"],
  purchasePrice: ["purchaseprice", "purchase_price", "закупка", "закупочнаяцена", "ценазакупки", "закуп"],
  category: ["category", "категория", "раздел", "группа", "тип", "categoryname", "категориятовара"],
  brand: ["brand", "бренд", "производитель", "vendor", "маркапроизводителя", "manufacturer"],
  carBrand: ["carbrand", "car_brand", "маркаавто", "марка", "make", "маркамашины"],
  carModel: ["carmodel", "car_model", "модельавто", "модель", "model"],
  carGeneration: ["cargeneration", "car_generation", "поколение", "generation", "кузов"],
  carYearFrom: ["yearfrom", "year_from", "годот", "год_от", "годс"],
  carYearTo: ["yearto", "year_to", "годдо", "год_до", "годпо"],
  fitment: ["fitment", "совместимость", "применимость", "подходитдля", "автомобили"],
  stock: ["stock", "склад", "наличие", "количество", "остаток", "qty", "quantity", "count"],
  description: ["description", "описание", "аннотация", "текст", "комментарий"],
  image: ["image", "images", "picture", "pictures", "изображение", "фото", "картинка", "ссылканафото"],
  weight: ["weight", "вес", "вескг", "вес_кг"],
  length: ["length", "длина", "длинамм", "длина_мм"],
  width: ["width", "ширина", "ширинамм", "ширина_мм"],
  height: ["height", "высота", "высотамм", "высота_мм"],
  warranty: ["warranty", "warrantymonths", "гарантия", "гарантиямес", "гарантия_мес"],
  capacity: ["capacity", "capacitykg", "грузоподъемность", "грузоподъёмность", "нагрузка", "тяговаянагрузка"],
  verticalLoad: ["verticalload", "vertical_load", "вертикальнаянагрузка", "вертикальная_нагрузка"],
  volume: ["volume", "volumel", "объем", "объём", "объемл", "литры"],
  material: ["material", "материал"],
  mountPlace: ["mountplace", "mount_place", "местоустановки", "установка", "крепление"],
  profile: ["profile", "профиль"],
  hookType: ["hooktype", "hook_type", "типкрюка", "крюк"],
  lock: ["lock", "lockincluded", "замок", "замоквкомплекте"],
  electric: ["electric", "electricincluded", "электрика", "электрикавкомплекте"],
  bumperCut: ["bumpercut", "bumper_cut", "вырезбампера", "вырез"],
  doors: ["doors", "doorscount", "количестводверей", "двери"],
  plug: ["plug", "plugtype", "разъем", "разъём", "типразъема"],
  warranty2: ["срокгарантии"],
  active: ["active", "активен", "публиковать", "isactive"],
};

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s.\-_/()]+/g, "");
}

/** Строит карту «индекс колонки → внутреннее поле». */
function buildHeaderMap(headers: string[]): { map: Map<number, string>; unknown: string[] } {
  const aliasToField = new Map<string, string>();
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) aliasToField.set(normalizeHeader(alias), field);
  }

  const map = new Map<number, string>();
  const unknown: string[] = [];

  headers.forEach((header, index) => {
    const field = aliasToField.get(normalizeHeader(header));
    if (field && ![...map.values()].includes(field)) {
      map.set(index, field);
    } else {
      unknown.push(header.trim());
    }
  });

  return { map, unknown };
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[;|,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Определяет разделитель по первой строке файла. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [";", "\t", ",", "|"];
  let best = ";";
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

export function parseCsv(text: string): ParseResult {
  const errors: string[] = [];
  const notes: string[] = [];

  let rows: string[][];
  try {
    const parsed = parseCsvSync(text, {
      delimiter: detectDelimiter(text),
      bom: true,
      relaxColumnCount: true,
      relaxQuotes: true,
      skipEmptyLines: true,
      trim: true,
    }) as unknown;
    rows = (parsed as string[][]).map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : []));
  } catch (error) {
    return { offers: [], errors: [`Не удалось разобрать CSV: ${(error as Error).message}`], notes: [] };
  }

  if (rows.length === 0) {
    return { offers: [], errors: ["CSV-файл пуст"], notes: [] };
  }

  const headers = rows[0].map((header) => String(header ?? ""));
  const { map, unknown } = buildHeaderMap(headers);
  const fields = new Set(map.values());

  if (!fields.has("name")) {
    return {
      offers: [],
      errors: [
        `Не найдена колонка с названием товара. Заголовки: ${headers.join(", ")}. ` +
          "Ожидается name/название/наименование.",
      ],
      notes: [],
    };
  }

  notes.push(`Колонок распознано: ${map.size} из ${headers.length}`);
  if (unknown.length) notes.push(`Не распознаны колонки: ${unknown.join(", ")} (попадут в характеристики)`);

  const offers: RawOffer[] = [];

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row || row.every((cell) => String(cell ?? "").trim() === "")) continue;

    const record: Record<string, string> = {};
    const extra: Record<string, string> = {};

    row.forEach((cell, columnIndex) => {
      const value = String(cell ?? "").trim();
      if (value === "") return;
      const field = map.get(columnIndex);
      if (field) record[field] = value;
      else if (headers[columnIndex]) extra[headers[columnIndex].trim()] = value;
    });

    const name = record.name;
    if (!name) {
      errors.push(`Строка ${index + 1}: не заполнено название — позиция пропущена`);
      continue;
    }

    const params: Record<string, string> = { ...extra };

    offers.push({
      row: index + 1,
      externalId: record.externalId,
      sku: record.sku,
      name,
      price: record.price,
      oldPrice: record.oldPrice,
      categoryName: record.category,
      description: record.description,
      vendor: record.brand,
      vendorCode: record.sku,
      pictures: splitList(record.image).filter((url) => /^(https?:)?\/\//.test(url) || url.startsWith("/")),
      stock: record.stock,
      weight: record.weight,
      params: {
        ...params,
        ...(record.purchasePrice ? { __purchasePrice: record.purchasePrice } : {}),
        ...(record.length ? { __lengthMm: record.length } : {}),
        ...(record.width ? { __widthMm: record.width } : {}),
        ...(record.height ? { __heightMm: record.height } : {}),
        ...(record.warranty ? { __warranty: record.warranty } : {}),
        ...(record.capacity ? { __capacityKg: record.capacity } : {}),
        ...(record.verticalLoad ? { __verticalLoadKg: record.verticalLoad } : {}),
        ...(record.volume ? { __volumeL: record.volume } : {}),
        ...(record.material ? { __material: record.material } : {}),
        ...(record.mountPlace ? { __mountPlace: record.mountPlace } : {}),
        ...(record.profile ? { __profile: record.profile } : {}),
        ...(record.hookType ? { __hookType: record.hookType } : {}),
        ...(record.lock ? { __lockIncluded: record.lock } : {}),
        ...(record.electric ? { __electricIncluded: record.electric } : {}),
        ...(record.bumperCut ? { __bumperCut: record.bumperCut } : {}),
        ...(record.doors ? { __doorsCount: record.doors } : {}),
        ...(record.plug ? { __plugType: record.plug } : {}),
        ...(record.active ? { __isActive: record.active } : {}),
      },
      fitment: record.fitment,
      carBrand: record.carBrand,
      carModel: record.carModel,
      carGeneration: record.carGeneration,
      carYearFrom: record.carYearFrom,
      carYearTo: record.carYearTo,
      extra,
    });
  }

  notes.push(`Распознано товаров: ${offers.length}`);
  const withoutPrice = offers.filter((offer) => !offer.price).length;
  if (withoutPrice > 0) notes.push(`Без цены: ${withoutPrice} — будут пропущены`);

  return { offers, errors, notes };
}

/** Список известных колонок — показывается в админке как подсказка. */
export const CSV_KNOWN_COLUMNS = Object.keys(HEADER_ALIASES);
