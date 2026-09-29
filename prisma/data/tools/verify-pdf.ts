/**
 * Структурная проверка PDF-плейсхолдеров: xref-смещения, длины потоков,
 * наличие встроенного FontFile2, корректность Identity-H и восстановление текста
 * через ToUnicode CMap.
 *
 * Запуск: npx tsx prisma/data/tools/verify-pdf.ts
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TrueTypeFont } from "./pdf-font";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DOCS_DIR = join(ROOT, "public", "docs");

type Report = { file: string; ok: boolean; notes: string[]; text: string[] };

function verify(file: string): Report {
  const notes: string[] = [];
  const raw = readFileSync(join(DOCS_DIR, file));
  const text = raw.toString("latin1");
  let failed = false;

  const fail = (note: string) => {
    failed = true;
    notes.push(note);
  };

  if (!text.startsWith("%PDF-1.4")) fail("нет заголовка %PDF-1.4");

  const startxrefMatch = text.match(/startxref\s+(\d+)\s+%%EOF\s*$/);
  if (!startxrefMatch) {
    fail("не найден startxref/%%EOF в конце файла");
    return { file, ok: false, notes, text: [] };
  }
  const xrefOffset = Number(startxrefMatch[1]);
  if (text.slice(xrefOffset, xrefOffset + 4) !== "xref") {
    fail(`startxref указывает на ${xrefOffset}, там не «xref»`);
  }

  const header = text.slice(xrefOffset).match(/^xref\s+0 (\d+)\s+([\s\S]*?)trailer/);
  if (!header) {
    fail("не разобран блок xref");
    return { file, ok: false, notes, text: [] };
  }
  const entries = header[2]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    // первая строка после «xref» — заголовок «0 15», вторая — free-запись объекта 0
    .slice(1);
  const count = Number(header[1]);
  if (entries.length !== count - 1) fail(`записей xref ${entries.length}, ожидалось ${count - 1}`);

  const offsets = entries.map((line) => Number(line.split(/\s+/)[0]));
  for (let i = 0; i < offsets.length; i += 1) {
    const expected = `${i + 1} 0 obj`;
    const actual = text.slice(offsets[i], offsets[i] + expected.length);
    if (actual !== expected) fail(`объект ${i + 1}: по смещению ${offsets[i]} найдено «${actual}»`);
  }

  // Проверяем /Length у потоков
  const streamRegex = /<<([^>]*?)>>\s*stream\r?\n/g;
  let match: RegExpExecArray | null;
  let streams = 0;
  while ((match = streamRegex.exec(text)) !== null) {
    const dict = match[1];
    streams += 1;
    const lengthMatch = dict.match(/\/Length\s+(\d+)/);
    if (!lengthMatch) {
      fail("поток без /Length");
      continue;
    }
    const declared = Number(lengthMatch[1]);
    const dataStart = match.index + match[0].length;
    const after = text.slice(dataStart + declared, dataStart + declared + 12);
    if (!after.startsWith("\nendstream")) fail(`после потока нет endstream: «${after.slice(0, 12)}»`);
  }
  if (streams === 0) fail("не найдено ни одного потока");

  if (!text.includes("/Subtype /CIDFontType2")) fail("нет CIDFontType2 (шрифт не встроен)");
  if (!text.includes("/FontFile2")) fail("нет /FontFile2");
  if (!text.includes("/Identity-H")) fail("нет /Identity-H");

  // Проверка встроенного TTF
  const fontStreamMatch = text.match(/\/Length1 (\d+) >>\s*stream\r?\n/);
  if (!fontStreamMatch || fontStreamMatch.index === undefined) {
    fail("не найден TTF-поток (/Length1)");
  } else {
    const declared = Number(fontStreamMatch[1]);
    const start = fontStreamMatch.index + fontStreamMatch[0].length;
    const fontData = raw.subarray(start, start + declared);
    try {
      const font = new TrueTypeFont(fontData);
      notes.push(`TF-поток ${declared} байт, unitsPerEm=${font.emUnits}, глиф 'А'=${font.glyphIdFor(0x0410)}`);
    } catch (error) {
      fail(`встроенный TTF не парсится: ${(error as Error).message}`);
    }
  }

  // Восстанавливаем текст через ToUnicode
  const toUnicodeBlocks = [...text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)];
  const mapping = new Map<number, number>();
  for (const block of toUnicodeBlocks) {
    const pairs = block[1].matchAll(/<([0-9a-fA-F]{4})>\s*<([0-9a-fA-F]{4,6})>/g);
    for (const pair of pairs) {
      mapping.set(Number.parseInt(pair[1], 16), Number.parseInt(pair[2], 16));
    }
  }
  if (mapping.size === 0) fail("ToUnicode CMap пуст — текст не извлекается");

  const lines: string[] = [];
  for (const item of text.matchAll(/<([0-9a-fA-F]+)>\s*Tj/g)) {
    const hex = item[1];
    let line = "";
    let unknown = 0;
    for (let i = 0; i < hex.length; i += 4) {
      const glyphId = Number.parseInt(hex.slice(i, i + 4), 16);
      const codePoint = mapping.get(glyphId);
      if (codePoint === undefined) {
        unknown += 1;
        line += "\uFFFD";
      } else {
        line += String.fromCodePoint(codePoint);
      }
    }
    if (unknown > 0) fail(`в строке «${line}» ${unknown} глифов без ToUnicode`);
    lines.push(line);
  }
  if (lines.length === 0) fail("в контенте нет ни одной строки текста");

  return { file, ok: !failed, notes, text: lines };
}

let allOk = true;
for (const file of readdirSync(DOCS_DIR).filter((name) => name.endsWith(".pdf"))) {
  const report = verify(file);
  allOk = allOk && report.ok;
  console.log(`${report.ok ? "OK  " : "FAIL"} ${report.file}`);
  for (const note of report.notes) console.log(`     · ${note}`);
  console.log(`     текст (${report.text.length} строк):`);
  for (const line of report.text.slice(0, 4)) console.log(`       | ${line}`);
}

console.log(allOk ? "\nВсе PDF валидны." : "\nЕсть проблемы с PDF.");
process.exitCode = allOk ? 0 : 1;
