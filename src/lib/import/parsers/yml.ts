/**
 * Парсер YML (Яндекс.Маркет) и произвольного XML-прайса.
 *
 * Понимает:
 *  * YML-фиды: yml_catalog/shop/offers/offer + shop/categories/category;
 *  * произвольный XML: ищет любые узлы offer/item/product с полями name/price;
 *  * одиночный корневой узел (<offer>...</offer>) — прайс из одной позиции.
 *
 * Не обращается к БД: возвращает «сырые» офферы (см. types.ts).
 */

import { XMLParser } from "fast-xml-parser";
import type { ParseResult, RawOffer } from "../types";

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: () => false,
  textNodeName: "#text",
});

/** Текст узла: строка, число, {#text} или { "@_attr": ... } → строка. */
function textOf(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map((item) => textOf(item)).filter((item): item is string => Boolean(item));
    return parts.length ? parts.join("; ") : undefined;
  }
  if (typeof value === "object") {
    const node = value as XmlNode;
    if ("#text" in node) return textOf(node["#text"]);
    // Узел без текста, но с вложенными значениями — склеиваем
    const parts = Object.entries(node)
      .filter(([key]) => !key.startsWith("@_"))
      .map(([, item]) => textOf(item))
      .filter((item): item is string => Boolean(item));
    return parts.length ? parts.join("; ") : undefined;
  }
  return undefined;
}

function asArray(value: unknown): unknown[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Достаёт первое найденное значение по списку возможных имён (регистр не важен). */
function pick(node: XmlNode, names: string[]): unknown {
  const lowered = new Map(Object.keys(node).map((key) => [key.toLowerCase(), key]));
  for (const name of names) {
    const key = lowered.get(name.toLowerCase());
    if (key !== undefined) {
      const value = node[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return undefined;
}

function pickText(node: XmlNode, names: string[]): string | undefined {
  return textOf(pick(node, names));
}

/** Рекурсивно собирает узлы, имя которых входит в `tagNames`. */
function collectNodes(value: unknown, tagNames: Set<string>, depth = 0, out: XmlNode[] = []): XmlNode[] {
  if (depth > 12 || value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectNodes(item, tagNames, depth + 1, out);
    return out;
  }
  if (typeof value !== "object") return out;

  for (const [key, item] of Object.entries(value as XmlNode)) {
    if (key.startsWith("@_")) continue;
    const lower = key.toLowerCase();
    if (tagNames.has(lower) && item && typeof item === "object") {
      for (const node of asArray(item)) {
        if (node && typeof node === "object") out.push(node as XmlNode);
      }
    } else {
      collectNodes(item, tagNames, depth + 1, out);
    }
  }
  return out;
}

/** Разбирает <param name="Грузоподъёмность">75</param> или <param>Материал: алюминий</param>. */
function readParams(container: XmlNode): Record<string, string> {
  const params: Record<string, string> = {};
  for (const raw of asArray(pick(container, ["param", "params", "parameter", "parameters"]))) {
    if (!raw || typeof raw !== "object") {
      const plain = textOf(raw);
      if (plain) {
        const [key, ...rest] = plain.split(":");
        if (rest.length) params[key.trim()] = rest.join(":").trim();
      }
      continue;
    }
    const node = raw as XmlNode;
    const name = textOf(node["@_name"]) ?? textOf(node["@_Name"]);
    const value =
      textOf(node["#text"]) ??
      textOf(node["@_value"]) ??
      textOf(Object.entries(node).find(([key]) => !key.startsWith("@_"))?.[1]);
    if (name && value) params[name] = value;
    else if (value) {
      const [key, ...rest] = value.split(":");
      if (rest.length) params[key.trim()] = rest.join(":").trim();
    }
  }
  return params;
}

/** Разбирает <picture>...</picture> (URL) или <image>...</image>. */
function readPictures(container: XmlNode): string[] {
  const urls: string[] = [];
  for (const name of ["picture", "image", "images", "photo"]) {
    for (const raw of asArray(pick(container, [name]))) {
      const url = textOf(raw);
      if (url && /^(https?:)?\/\//.test(url)) urls.push(url);
    }
  }
  return [...new Set(urls)];
}

/** Категории YML: <categories><category id="1">Багажники</category></categories>. */
function readCategories(root: XmlNode): Map<string, string> {
  const map = new Map<string, string>();
  const nodes = collectNodes(root, new Set(["category"]));
  for (const node of nodes) {
    const id = textOf(node["@_id"]) ?? textOf(node["@_Id"]);
    const name = textOf(node["#text"]);
    if (id && name) map.set(id, name);
  }
  return map;
}

/**
 * Парсит XML/YML. Ищет узлы offer/item/product; если их нет — пытается
 * интерпретировать корневой узел как единственный товар.
 */
export function parseYml(text: string): ParseResult {
  const errors: string[] = [];
  const notes: string[] = [];

  let document: unknown;
  try {
    document = parser.parse(text);
  } catch (error) {
    return {
      offers: [],
      errors: [`Не удалось разобрать XML: ${(error as Error).message}`],
      notes: [],
    };
  }

  if (!document || typeof document !== "object") {
    return { offers: [], errors: ["XML пуст или не содержит узлов"], notes: [] };
  }

  const categories = readCategories(document as XmlNode);
  notes.push(`Категорий в фиде: ${categories.size}`);

  const offerNodes = collectNodes(document, new Set(["offer", "item", "product", "entry"]));
  const nodes: XmlNode[] = offerNodes.length > 0 ? offerNodes : [];

  if (nodes.length === 0) {
    // Возможно, это одиночный товар без обёртки <offers>
    const root = document as XmlNode;
    const firstKey = Object.keys(root).find((key) => !key.startsWith("@_") && !key.startsWith("#"));
    const candidate = firstKey ? (root[firstKey] as unknown) : undefined;
    const node = asArray(candidate).find((item) => item && typeof item === "object") as XmlNode | undefined;
    if (node) {
      nodes.push(node);
      notes.push("Узлы offer/item не найдены — корневой элемент обработан как один товар.");
    }
  }

  if (nodes.length === 0) {
    return { offers: [], errors: ["В файле не найдено ни одного товара (offer/item/product)"], notes };
  }

  const offers: RawOffer[] = [];

  nodes.forEach((node, index) => {
    const row = index + 1;
    const name =
      pickText(node, ["name", "title", "model", "наименование"]) ??
      pickText(node, ["#text"]) ??
      "";
    if (!name) {
      errors.push(`Строка ${row}: не указано название товара — позиция пропущена`);
      return;
    }

    const categoryId = pickText(node, ["categoryId", "category_id", "@_categoryId"]);
    const categoryName =
      pickText(node, ["category", "categoryName", "typePrefix"]) ??
      (categoryId ? categories.get(categoryId) : undefined);

    const params = {
      ...readParams(node),
    };

    // YML часто хранит характеристики прямо в тегах, а не в <param>
    for (const key of Object.keys(node)) {
      if (key.startsWith("@_") || key.startsWith("#")) continue;
      if (
        [
          "name", "title", "model", "price", "oldprice", "oldPrice", "currencyId", "category", "categoryId",
          "description", "vendor", "vendorCode", "picture", "image", "images", "photo", "param", "params",
          "count", "stock", "quantity", "weight", "sales_notes", "delivery", "offer", "item", "product", "entry",
        ].includes(key)
      ) {
        continue;
      }
      const value = textOf(node[key]);
      if (value && value.length <= 200) params[key] = value;
    }

    offers.push({
      row,
      externalId: pickText(node, ["@_id", "id", "externalId", "offerId"]),
      sku: pickText(node, ["vendorCode", "article", "sku", "артикул"]),
      name,
      price: pickText(node, ["price", "цена"]),
      oldPrice: pickText(node, ["oldprice", "oldPrice", "old_price"]),
      currencyId: pickText(node, ["currencyId", "currency"]),
      categoryName,
      categoryId,
      description: pickText(node, ["description", "annotation", "описание"]),
      vendor: pickText(node, ["vendor", "brand", "manufacturer", "производитель"]),
      vendorCode: pickText(node, ["vendorCode", "article"]),
      pictures: readPictures(node),
      stock: pickText(node, ["count", "stock", "quantity", "available", "наличие"]),
      weight: pickText(node, ["weight", "вес"]),
      params,
      fitment: pickText(node, ["fitment", "compatibility", "совместимость"]),
      carBrand: pickText(node, ["carBrand", "make", "марка"]),
      carModel: pickText(node, ["carModel", "модель"]),
      carGeneration: pickText(node, ["carGeneration", "generation", "поколение"]),
      carYearFrom: pickText(node, ["yearFrom", "year_from"]),
      carYearTo: pickText(node, ["yearTo", "year_to"]),
      extra: {},
    });
  });

  notes.push(`Распознано товаров: ${offers.length}`);
  const withoutPrice = offers.filter((offer) => !offer.price).length;
  if (withoutPrice > 0) notes.push(`Без цены: ${withoutPrice} — будут пропущены`);

  return { offers, errors, notes };
}
