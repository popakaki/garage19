/**
 * Публичный API модуля импорта прайсов.
 *
 * Админ-страница должна использовать ровно эти два экспорта:
 *   • `runImport`        — из `@/lib/import` (серверный вызов движка);
 *   • `runImportAction`  — из `@/lib/import/actions` (Server Action для формы).
 *
 * Подробное описание контракта — в docs/IMPORT.md.
 */

export { runImport } from "./engine";
export type {
  ImportInput,
  ImportMode,
  ImportResult,
  ImportSourceType,
  ProductDraft,
  RawOffer,
} from "./types";
export { parseCsv, CSV_KNOWN_COLUMNS } from "./parsers/csv";
export { parseYml } from "./parsers/yml";
export {
  applyMargin,
  buildProductSlug,
  parseBool,
  parseLength,
  parsePrice,
  parseStock,
  parseVolume,
  parseWarrantyMonths,
  parseWeight,
} from "./normalize";
