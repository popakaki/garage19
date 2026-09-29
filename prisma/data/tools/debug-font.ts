/** Отладка разбора arial.ttf: cmap, глифы, сабсет. */
import { readFileSync, writeFileSync } from "node:fs";
import { TrueTypeFont, subsetFont } from "./pdf-font";

const font = new TrueTypeFont(readFileSync("C:/Windows/Fonts/arial.ttf"));
const samples = ["А", "Б", "a", "1", "№", "—", "«", "»"];
for (const char of samples) {
  const code = char.codePointAt(0)!;
  console.log(`${char} U+${code.toString(16)} → glyph ${font.glyphIdFor(code)} advance ${font.advance(font.glyphIdFor(code))}`);
}

const text = "ПАСПОРТ ТСУ Garage19 — образец 123";
const subset = subsetFont(font, [...text].map((c) => c.codePointAt(0)!));
console.log("subset numGlyphs", subset.numGlyphs, "glyphIds size", subset.glyphIds.size);
for (const char of "ПАСG1") {
  const code = char.codePointAt(0)!;
  console.log(`subset ${char} → ${subset.glyphIds.get(code)} advance ${subset.advances.get(code)}`);
}

writeFileSync("tmp-subset.ttf", subset.data);
const reread = new TrueTypeFont(subset.data);
console.log("reread numGlyphs", reread.glyphIdFor(0x0410), reread.emUnits);
