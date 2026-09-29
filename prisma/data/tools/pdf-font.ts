/**
 * Минимальный сабсеттер TrueType + сборка PDF с встроенным шрифтом.
 *
 * Зачем: стандартные PDF-шрифты (Helvetica/Times) не содержат кириллицы, поэтому
 * для русскоязычных документов нужен встроенный TTF-сабсет. Сабсеттер намеренно
 * компактный: берём только нужные глифы, разворачиваем составные глифы в простые
 * контуры, отбрасываем hinting и лишние таблицы.
 *
 * Зависимостей нет — только node:fs.
 */

import { readFileSync } from "node:fs";

// ─────────────────────────────────────────────────────────────────────────────
// Разбор TrueType
// ─────────────────────────────────────────────────────────────────────────────

type TableHeader = { tag: string; offset: number; length: number };

type GlyfPoint = { x: number; y: number; onCurve: boolean; endOfContour: boolean };

type SimpleGlyph = { contours: number; points: GlyfPoint[] };

export class TrueTypeFont {
  private readonly buffer: Buffer;
  private readonly tables = new Map<string, TableHeader>();
  private readonly numGlyphs: number;
  private readonly unitsPerEm: number;
  private readonly indexToLocFormat: number;
  private readonly loca: number[] = [];
  private readonly glyphOffsets: { start: number; length: number }[] = [];
  private readonly advanceWidths: number[] = [];
  private readonly leftSideBearings: number[] = [];
  private readonly cmap = new Map<number, number>();
  readonly postScriptName: string;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    const numTables = buffer.readUInt16BE(4);
    for (let i = 0; i < numTables; i += 1) {
      const entry = 12 + i * 16;
      const tag = buffer.toString("latin1", entry, entry + 4);
      const offset = buffer.readUInt32BE(entry + 8);
      const length = buffer.readUInt32BE(entry + 12);
      this.tables.set(tag, { tag, offset, length });
    }

    const head = this.table("head");
    this.unitsPerEm = buffer.readUInt16BE(head.offset + 18);
    this.indexToLocFormat = buffer.readInt16BE(head.offset + 50);

    const maxp = this.table("maxp");
    this.numGlyphs = buffer.readUInt16BE(maxp.offset + 4);

    this.readLoca();
    this.readHmtx();
    this.readCmap();
    this.postScriptName = this.readPostScriptName();
  }

  private table(tag: string): TableHeader {
    const header = this.tables.get(tag);
    if (!header) throw new Error(`TrueType: отсутствует обязательная таблица ${tag}`);
    return header;
  }

  private readLoca(): void {
    const loca = this.table("loca");
    const { offset } = loca;
    for (let i = 0; i < this.numGlyphs + 1; i += 1) {
      this.loca.push(
        this.indexToLocFormat === 0
          ? this.buffer.readUInt16BE(offset + i * 2) * 2
          : this.buffer.readUInt32BE(offset + i * 4),
      );
    }
    const glyf = this.table("glyf");
    for (let i = 0; i < this.numGlyphs; i += 1) {
      const start = glyf.offset + this.loca[i];
      const length = this.loca[i + 1] - this.loca[i];
      this.glyphOffsets.push({ start, length });
    }
  }

  private readHmtx(): void {
    const hhea = this.table("hhea");
    const numberOfHMetrics = this.buffer.readUInt16BE(hhea.offset + 34);
    const hmtx = this.table("hmtx");
    let lastWidth = this.unitsPerEm;
    for (let i = 0; i < this.numGlyphs; i += 1) {
      const index = Math.min(i, numberOfHMetrics - 1);
      const width = this.buffer.readUInt16BE(hmtx.offset + index * 4);
      const lsb = this.buffer.readInt16BE(hmtx.offset + index * 4 + 2);
      if (i < numberOfHMetrics) lastWidth = width;
      this.advanceWidths.push(i < numberOfHMetrics ? width : lastWidth);
      this.leftSideBearings.push(lsb);
    }
  }

  private readCmap(): void {
    const cmap = this.table("cmap");
    const { offset } = cmap;
    const count = this.buffer.readUInt16BE(offset + 2);
    let best: number | null = null;
    let bestScore = -1;
    for (let i = 0; i < count; i += 1) {
      const record = offset + 4 + i * 8;
      const platformId = this.buffer.readUInt16BE(record);
      const encodingId = this.buffer.readUInt16BE(record + 2);
      const subOffset = this.buffer.readUInt32BE(record + 4);
      const score =
        platformId === 3 && encodingId === 1
          ? 3
          : platformId === 0
            ? 2
            : platformId === 3 && encodingId === 10
              ? 1
              : 0;
      if (score > bestScore) {
        bestScore = score;
        best = offset + subOffset;
      }
    }
    if (best === null) return;
    const format = this.buffer.readUInt16BE(best);
    if (format === 4) this.readCmapFormat4(best);
    else if (format === 12) this.readCmapFormat12(best);
  }

  private readCmapFormat4(tableOffset: number): void {
    const segCountX2 = this.buffer.readUInt16BE(tableOffset + 6);
    const segCount = segCountX2 / 2;
    const endBase = tableOffset + 14;
    const startBase = endBase + segCountX2 + 2;
    const deltaBase = startBase + segCountX2;
    const rangeBase = deltaBase + segCountX2;
    for (let segment = 0; segment < segCount; segment += 1) {
      const end = this.buffer.readUInt16BE(endBase + segment * 2);
      const start = this.buffer.readUInt16BE(startBase + segment * 2);
      const delta = this.buffer.readInt16BE(deltaBase + segment * 2);
      const rangeOffset = this.buffer.readUInt16BE(rangeBase + segment * 2);
      if (start === 0xffff) continue;
      for (let code = start; code <= end; code += 1) {
        let glyphId: number;
        if (rangeOffset === 0) {
          glyphId = (code + delta) & 0xffff;
        } else {
          const glyphIndexAddress = rangeBase + segment * 2 + rangeOffset + (code - start) * 2;
          if (glyphIndexAddress + 1 >= this.buffer.length) continue;
          glyphId = this.buffer.readUInt16BE(glyphIndexAddress);
          if (glyphId !== 0) glyphId = (glyphId + delta) & 0xffff;
        }
        if (glyphId !== 0) this.cmap.set(code, glyphId);
      }
    }
  }

  private readCmapFormat12(tableOffset: number): void {
    const groupCount = this.buffer.readUInt32BE(tableOffset + 12);
    for (let group = 0; group < groupCount; group += 1) {
      const base = tableOffset + 16 + group * 12;
      const start = this.buffer.readUInt32BE(base);
      const end = this.buffer.readUInt32BE(base + 4);
      const startGlyph = this.buffer.readUInt32BE(base + 8);
      if (end - start > 0x10000) continue;
      for (let code = start; code <= end; code += 1) {
        const glyphId = startGlyph + (code - start);
        if (glyphId !== 0) this.cmap.set(code, glyphId);
      }
    }
  }

  private readPostScriptName(): string {
    const post = this.tables.get("post");
    if (!post) return "EmbeddedFont";
    const { offset } = post;
    const nameIndex = this.buffer.readUInt32BE(offset + 16);
    if (nameIndex === 0x00010000) return "EmbeddedFont";
    // Pascal-строка внутри таблицы name ищем нестрого — достаточно стабильного имени
    const name = this.tables.get("name");
    if (name) {
      const count = this.buffer.readUInt16BE(name.offset + 2);
      const stringOffset = this.buffer.readUInt16BE(name.offset + 4);
      for (let i = 0; i < count; i += 1) {
        const record = name.offset + 6 + i * 12;
        const platformId = this.buffer.readUInt16BE(record);
        const nameId = this.buffer.readUInt16BE(record + 6);
        const length = this.buffer.readUInt16BE(record + 8);
        const offsetInStorage = this.buffer.readUInt16BE(record + 10);
        if (nameId !== 6) continue;
        const start = name.offset + stringOffset + offsetInStorage;
        const raw = this.buffer.subarray(start, start + length);
        return platformId === 3 ? raw.swap16().toString("latin1") : raw.toString("latin1");
      }
    }
    return "EmbeddedFont";
  }

  glyphIdFor(codePoint: number): number {
    return this.cmap.get(codePoint) ?? 0;
  }

  advance(glyphId: number): number {
    return this.advanceWidths[glyphId] ?? this.unitsPerEm;
  }

  get emUnits(): number {
    return this.unitsPerEm;
  }

  /** Читает глиф как набор простых контуров; составные глифы разворачиваются. */
  readSimpleGlyph(glyphId: number, depth = 0): SimpleGlyph | null {
    if (glyphId < 0 || glyphId >= this.numGlyphs || depth > 5) return null;
    const { start, length } = this.glyphOffsets[glyphId];
    if (length <= 0) return null;

    const numberOfContours = this.buffer.readInt16BE(start);
    let cursor = start + 10;

    if (numberOfContours < 0) {
      // Составной глиф
      const merged: SimpleGlyph = { contours: 0, points: [] };
      let guard = 0;
      for (;;) {
        if (guard > 64) break;
        guard += 1;
        const flags = this.buffer.readUInt16BE(cursor);
        const componentGlyphIndex = this.buffer.readUInt16BE(cursor + 2);
        cursor += 4;

        let dx = 0;
        let dy = 0;
        if (flags & 0x0001) {
          dx = this.buffer.readInt16BE(cursor);
          dy = this.buffer.readInt16BE(cursor + 2);
          cursor += 4;
        } else {
          dx = this.buffer.readInt8(cursor);
          dy = this.buffer.readInt8(cursor + 1);
          cursor += 2;
        }

        let a = 1;
        let b = 0;
        let c = 0;
        let d = 1;
        if (flags & 0x0008) {
          a = d = this.buffer.readInt16BE(cursor) / 16384;
          cursor += 2;
        } else if (flags & 0x0040) {
          a = this.buffer.readInt16BE(cursor) / 16384;
          d = this.buffer.readInt16BE(cursor + 2) / 16384;
          cursor += 4;
        } else if (flags & 0x0080) {
          a = this.buffer.readInt16BE(cursor) / 16384;
          b = this.buffer.readInt16BE(cursor + 2) / 16384;
          c = this.buffer.readInt16BE(cursor + 4) / 16384;
          d = this.buffer.readInt16BE(cursor + 6) / 16384;
          cursor += 8;
        }

        const component = this.readSimpleGlyph(componentGlyphIndex, depth + 1);
        if (component) {
          for (const point of component.points) {
            const x = a * point.x + c * point.y + dx;
            const y = b * point.x + d * point.y + dy;
            merged.points.push({
              x: Math.round(x),
              y: Math.round(y),
              onCurve: point.onCurve,
              endOfContour: point.endOfContour,
            });
          }
          merged.contours += component.contours;
        }

        if (!(flags & 0x0020)) break; // MORE_COMPONENTS
      }
      return merged.contours > 0 ? merged : null;
    }

    if (numberOfContours === 0) return null;

    const endPtsOfContours: number[] = [];
    for (let i = 0; i < numberOfContours; i += 1) {
      endPtsOfContours.push(this.buffer.readUInt16BE(cursor));
      cursor += 2;
    }
    const pointCount = endPtsOfContours[endPtsOfContours.length - 1] + 1;
    const instructionLength = this.buffer.readUInt16BE(cursor);
    cursor += 2 + instructionLength;

    const flags: number[] = [];
    while (flags.length < pointCount) {
      const flag = this.buffer.readUInt8(cursor);
      cursor += 1;
      flags.push(flag);
      if (flag & 0x08) {
        const repeat = this.buffer.readUInt8(cursor);
        cursor += 1;
        for (let r = 0; r < repeat && flags.length < pointCount; r += 1) flags.push(flag);
      }
    }

    const xs: number[] = [];
    let x = 0;
    for (const flag of flags) {
      if (flag & 0x02) {
        const value = this.buffer.readUInt8(cursor);
        cursor += 1;
        x += flag & 0x10 ? value : -value;
      } else if (!(flag & 0x10)) {
        x += this.buffer.readInt16BE(cursor);
        cursor += 2;
      }
      xs.push(x);
    }

    const ys: number[] = [];
    let y = 0;
    for (const flag of flags) {
      if (flag & 0x04) {
        const value = this.buffer.readUInt8(cursor);
        cursor += 1;
        y += flag & 0x20 ? value : -value;
      } else if (!(flag & 0x20)) {
        y += this.buffer.readInt16BE(cursor);
        cursor += 2;
      }
      ys.push(y);
    }

    const points: GlyfPoint[] = [];
    for (let i = 0; i < pointCount; i += 1) {
      points.push({
        x: xs[i],
        y: ys[i],
        onCurve: (flags[i] & 0x01) !== 0,
        endOfContour: endPtsOfContours.includes(i),
      });
    }
    return { contours: numberOfContours, points };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Сборка TTF-сабсета
// ─────────────────────────────────────────────────────────────────────────────

export type SubsetResult = {
  /** Байты TTF-файла для встраивания в PDF (FontFile2). */
  data: Buffer;
  /** code point → glyph id в сабсете (для Identity-H). */
  glyphIds: Map<number, number>;
  /** advance в единицах em (unitsPerEm=1000 после нормализации). */
  advances: Map<number, number>;
  numGlyphs: number;
  unitsPerEm: number;
  postScriptName: string;
};

function encodeSimpleGlyph(glyph: SimpleGlyph): Buffer {
  const pointCount = glyph.points.length;
  const endPts: number[] = [];
  let counter = 0;
  for (const point of glyph.points) {
    if (point.endOfContour) endPts.push(counter);
    counter += 1;
  }
  while (endPts.length < glyph.contours) endPts.push(pointCount - 1);

  const flags: number[] = [];
  const xData: number[] = [];
  const yData: number[] = [];

  let prevX = 0;
  for (const point of glyph.points) {
    let flag = point.onCurve ? 0x01 : 0x00;
    const dx = point.x - prevX;
    prevX = point.x;
    if (dx === 0) {
      flag |= 0x10;
    } else if (dx >= -255 && dx <= 255) {
      flag |= 0x02;
      flag |= dx > 0 ? 0x10 : 0x00;
      xData.push(Math.abs(dx));
    } else {
      const value = Buffer.alloc(2);
      value.writeInt16BE(dx);
      xData.push(value[0], value[1]);
    }
    flags.push(flag);
  }

  let prevY = 0;
  for (let i = 0; i < pointCount; i += 1) {
    const dy = glyph.points[i].y - prevY;
    prevY = glyph.points[i].y;
    if (dy === 0) {
      flags[i] |= 0x20;
    } else if (dy >= -255 && dy <= 255) {
      flags[i] |= 0x04;
      if (dy > 0) flags[i] |= 0x20;
      yData.push(Math.abs(dy));
    } else {
      const value = Buffer.alloc(2);
      value.writeInt16BE(dy);
      yData.push(value[0], value[1]);
    }
  }

  const header = Buffer.alloc(10);
  header.writeInt16BE(glyph.contours, 0);
  header.writeInt16BE(0, 2);
  header.writeInt16BE(0, 4);
  header.writeInt16BE(0, 6);
  header.writeInt16BE(0, 8);

  const endPtsBuffer = Buffer.alloc(endPts.length * 2);
  endPts.forEach((value, index) => endPtsBuffer.writeUInt16BE(value, index * 2));

  const instructionLength = Buffer.alloc(2);

  return Buffer.concat([
    header,
    endPtsBuffer,
    instructionLength,
    Buffer.from(flags),
    Buffer.from(xData),
    Buffer.from(yData),
  ]);
}

function buildCmapFormat4(mapping: Map<number, number>): Buffer {
  const entries = [...mapping.entries()].filter(([code]) => code <= 0xffff).sort((a, b) => a[0] - b[0]);
  const segments: { start: number; end: number; delta: number }[] = [];
  for (const [code, glyphId] of entries) {
    const last = segments[segments.length - 1];
    if (last && code === last.end + 1 && ((code - glyphId) & 0xffff) === last.delta) {
      last.end = code;
    } else {
      segments.push({ start: code, end: code, delta: (code - glyphId) & 0xffff });
    }
  }
  segments.push({ start: 0xffff, end: 0xffff, delta: 1 });

  const segCount = segments.length;
  const length = 16 + segCount * 8;
  const subtable = Buffer.alloc(length);
  subtable.writeUInt16BE(4, 0);
  subtable.writeUInt16BE(length, 2);
  subtable.writeUInt16BE(0, 4);
  subtable.writeUInt16BE(segCount * 2, 6);
  subtable.writeUInt16BE(0, 8); // searchRange (не критично)
  subtable.writeUInt16BE(0, 10); // entrySelector
  subtable.writeUInt16BE(0, 12); // rangeShift

  const endBase = 14;
  const startBase = endBase + segCount * 2 + 2;
  const deltaBase = startBase + segCount * 2;
  const rangeBase = deltaBase + segCount * 2;

  segments.forEach((segment, index) => {
    subtable.writeUInt16BE(segment.end, endBase + index * 2);
    subtable.writeUInt16BE(segment.start, startBase + index * 2);
    subtable.writeInt16BE(segment.delta > 0x7fff ? segment.delta - 0x10000 : segment.delta, deltaBase + index * 2);
    subtable.writeUInt16BE(0, rangeBase + index * 2);
  });

  const header = Buffer.alloc(4 + 8);
  header.writeUInt16BE(0, 0); // version
  header.writeUInt16BE(1, 2); // numTables

  const encodingRecord = Buffer.alloc(8);
  encodingRecord.writeUInt16BE(3, 0);
  encodingRecord.writeUInt16BE(1, 2);
  encodingRecord.writeUInt32BE(12, 4);

  return Buffer.concat([header, encodingRecord, subtable]);
}

function pad4(buffer: Buffer): Buffer {
  const remainder = buffer.length % 4;
  if (remainder === 0) return buffer;
  return Buffer.concat([buffer, Buffer.alloc(4 - remainder)]);
}

/** Собирает минимальный TTF с выбранными код-поинтами. */
export function subsetFont(font: TrueTypeFont, codePoints: number[]): SubsetResult {
  const unique = [...new Set([0x20, ...codePoints])].filter((code) => font.glyphIdFor(code) !== 0);

  // Итоговый порядок глифов: 0 = .notdef (пустой), дальше в порядке code points
  const glyphOrder: number[] = [0];
  const codeToSubsetGlyph = new Map<number, number>();
  const originalToSubset = new Map<number, number>([[0, 0]]);

  for (const code of unique) {
    const originalGlyphId = font.glyphIdFor(code);
    let subsetGlyphId = originalToSubset.get(originalGlyphId);
    if (subsetGlyphId === undefined) {
      subsetGlyphId = glyphOrder.length;
      glyphOrder.push(originalGlyphId);
      originalToSubset.set(originalGlyphId, subsetGlyphId);
    }
    codeToSubsetGlyph.set(code, subsetGlyphId);
  }

  // glyf + loca (long format)
  const glyphBuffers: Buffer[] = [Buffer.alloc(0)]; // .notdef пустой
  for (let i = 1; i < glyphOrder.length; i += 1) {
    const simple = font.readSimpleGlyph(glyphOrder[i]);
    glyphBuffers.push(simple ? pad4(encodeSimpleGlyph(simple)) : Buffer.alloc(0));
  }
  const glyf = Buffer.concat(glyphBuffers);
  const loca = Buffer.alloc((glyphOrder.length + 1) * 4);
  let offset = 0;
  for (let i = 0; i < glyphBuffers.length; i += 1) {
    loca.writeUInt32BE(offset, i * 4);
    offset += glyphBuffers[i].length;
  }
  loca.writeUInt32BE(offset, glyphBuffers.length * 4);

  const numGlyphs = glyphOrder.length;
  const scale = 1000 / font.emUnits;
  const advances = new Map<number, number>();
  const hmtx = Buffer.alloc(numGlyphs * 4);
  for (let i = 0; i < numGlyphs; i += 1) {
    const advance = Math.round(font.advance(glyphOrder[i]) * scale);
    hmtx.writeUInt16BE(Math.min(advance, 0xffff), i * 4);
    hmtx.writeInt16BE(0, i * 4 + 2);
  }
  for (const [code, subsetGlyphId] of codeToSubsetGlyph) {
    advances.set(code, hmtx.readUInt16BE(subsetGlyphId * 4));
  }

  const cmap = buildCmapFormat4(codeToSubsetGlyph);

  const head = Buffer.alloc(54);
  head.writeUInt32BE(0x00010000, 0);
  head.writeUInt32BE(0x00010000, 4);
  head.writeUInt32BE(0, 8);
  head.writeUInt32BE(0x5f0f3cf5, 12);
  head.writeUInt16BE(0x000b, 16);
  head.writeUInt16BE(1000, 18); // unitsPerEm
  head.writeBigInt64BE(0n, 20);
  head.writeBigInt64BE(0n, 28);
  head.writeInt16BE(0, 36);
  head.writeInt16BE(0, 38);
  head.writeInt16BE(0, 40);
  head.writeInt16BE(0, 42);
  head.writeInt16BE(0, 44);
  head.writeInt16BE(0, 46);
  head.writeInt16BE(0, 48);
  head.writeInt16BE(0, 50);
  head.writeInt16BE(1, 50); // indexToLocFormat = long
  head.writeInt16BE(0, 52);

  const hhea = Buffer.alloc(36);
  hhea.writeUInt32BE(0x00010000, 0);
  hhea.writeInt16BE(800, 4);
  hhea.writeInt16BE(-200, 6);
  hhea.writeInt16BE(0, 8);
  hhea.writeUInt16BE(1000, 10);
  hhea.writeInt16BE(0, 12);
  hhea.writeInt16BE(0, 14);
  hhea.writeInt16BE(1000, 16);
  hhea.writeInt16BE(1, 18);
  hhea.writeInt16BE(0, 20);
  hhea.writeInt16BE(0, 22);
  hhea.writeInt16BE(0, 24);
  hhea.writeInt16BE(0, 26);
  hhea.writeInt16BE(0, 28);
  hhea.writeInt16BE(0, 30);
  hhea.writeInt16BE(0, 32);
  hhea.writeUInt16BE(numGlyphs, 34);

  const maxp = Buffer.alloc(32);
  maxp.writeUInt32BE(0x00010000, 0);
  maxp.writeUInt16BE(numGlyphs, 4);
  maxp.writeUInt16BE(8, 6);
  maxp.writeUInt16BE(0xffff, 8);
  maxp.writeUInt16BE(0xffff, 10);
  maxp.writeUInt16BE(2, 12);
  maxp.writeUInt16BE(0, 14);

  const name = Buffer.alloc(6 + 12 + 0);
  name.writeUInt16BE(0, 0);
  name.writeUInt16BE(0, 2);
  name.writeUInt16BE(6, 4);

  const post = Buffer.alloc(32);
  post.writeUInt32BE(0x00030000, 0);

  const os2 = Buffer.alloc(96);
  os2.writeUInt16BE(4, 0);
  os2.writeInt16BE(500, 4);
  os2.writeUInt16BE(400, 6);
  os2.writeUInt16BE(5, 8);
  os2.writeInt16BE(0, 10);
  os2.writeInt16BE(0, 12);
  os2.writeInt16BE(0, 14);
  os2.writeBigInt64BE(0n, 16);
  os2.writeBigInt64BE(0n, 24);
  os2.writeBigInt64BE(0n, 32);
  os2.writeBigInt64BE(0n, 40);
  os2.writeUInt16BE(0x0020, 64);
  os2.writeUInt16BE(0x04ff, 66);
  os2.writeUInt16BE(3, 68);
  os2.writeUInt16BE(1, 70);
  os2.writeUInt32BE(1, 72);
  os2.writeInt16BE(800, 86);
  os2.writeUInt16BE(0x0020, 90);
  os2.writeUInt16BE(0x04ff, 92);
  os2.writeInt16BE(0, 94);

  const tables: { tag: string; data: Buffer }[] = [
    { tag: "OS/2", data: os2 },
    { tag: "cmap", data: cmap },
    { tag: "glyf", data: glyf },
    { tag: "head", data: head },
    { tag: "hhea", data: hhea },
    { tag: "hmtx", data: hmtx },
    { tag: "loca", data: loca },
    { tag: "maxp", data: maxp },
    { tag: "name", data: name },
    { tag: "post", data: post },
  ].sort((a, b) => (a.tag < b.tag ? -1 : 1));

  const numTables = tables.length;
  let searchRange = 1;
  let entrySelector = 0;
  while (searchRange * 2 <= numTables) {
    searchRange *= 2;
    entrySelector += 1;
  }
  searchRange *= 16;

  const directorySize = 12 + numTables * 16;
  let tableOffset = directorySize;
  const records: Buffer[] = [];
  const chunks: Buffer[] = [];

  for (const table of tables) {
    const padded = pad4(table.data);
    const record = Buffer.alloc(16);
    record.write(table.tag, 0, 4, "latin1");
    // checksum
    let sum = 0;
    for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
    record.writeUInt32BE(sum, 4);
    record.writeUInt32BE(tableOffset, 8);
    record.writeUInt32BE(table.data.length, 12);
    records.push(record);
    chunks.push(padded);
    tableOffset += padded.length;
  }

  const header = Buffer.alloc(12);
  header.writeUInt32BE(0x00010000, 0);
  header.writeUInt16BE(numTables, 4);
  header.writeUInt16BE(searchRange, 6);
  header.writeUInt16BE(entrySelector, 8);
  header.writeUInt16BE(numTables * 16 - searchRange, 10);

  const data = Buffer.concat([header, ...records, ...chunks]);

  return {
    data,
    glyphIds: codeToSubsetGlyph,
    advances,
    numGlyphs,
    unitsPerEm: 1000,
    postScriptName: `${font.postScriptName.replace(/[^A-Za-z0-9]/g, "") || "EmbeddedFont"}+Subset`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF с встроенным сабсетом
// ─────────────────────────────────────────────────────────────────────────────

export type PdfTextLine = { text: string; size: number; bold?: boolean };

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_X = 56;
const TOP_Y = 780;

export type PdfOptions = {
  regular: Buffer;
  bold?: Buffer;
  lines: PdfTextLine[];
  title: string;
};

function escapePdfString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Собирает валидный PDF 1.4 с одной страницей A4, кириллицей и акцентной линией. */
export function buildPdfWithFont(options: PdfOptions): { pdf: Buffer; embeddedGlyphs: number } {
  const codePoints: number[] = [];
  for (const line of options.lines) {
    for (const char of line.text) codePoints.push(char.codePointAt(0) as number);
  }
  codePoints.push("№".codePointAt(0) as number);

  const regularFont = new TrueTypeFont(options.regular);
  const regularSubset = subsetFont(regularFont, codePoints);
  const boldFont = options.bold ? new TrueTypeFont(options.bold) : null;
  const boldSubset = boldFont ? subsetFont(boldFont, codePoints) : null;

  const encodeText = (line: PdfTextLine) => {
    const subset = line.bold && boldSubset ? boldSubset : regularSubset;
    let hex = "";
    for (const char of line.text) {
      const code = char.codePointAt(0) as number;
      const glyphId = subset.glyphIds.get(code) ?? 0;
      hex += glyphId.toString(16).padStart(4, "0");
    }
    return hex;
  };

  const content: string[] = [];
  let y = TOP_Y;
  let currentSize = options.lines[0]?.size ?? 11;
  for (const line of options.lines) {
    if (line.size !== currentSize) {
      y -= Math.round(currentSize * 0.5);
      currentSize = line.size;
    }
    if (line.text.trim() !== "") {
      content.push(
        `BT /${line.bold && boldSubset ? "F2" : "F1"} ${line.size} Tf 1 0 0 1 ${MARGIN_X} ${y} Tm <${encodeText(line)}> Tj ET`,
      );
    }
    y -= Math.round(line.size * 1.75);
    if (y < 60) break;
  }
  content.push(`0.968 0.451 0.086 RG 2.5 w ${MARGIN_X} 762 m ${PAGE_W - MARGIN_X} 762 l S`);
  const stream = content.join("\n");

  const objects: string[] = [];
  const push = (body: string): number => {
    objects.push(body);
    return objects.length; // 1-based номер объекта
  };

  // Порядок объектов фиксирован в начале: 1 Catalog, 2 Pages, 3 Page, 4 Contents, 5 F1,
  // далее FontFile2/Descriptor/CIDFont и ToUnicode — их номера вычисляются динамически.
  const cidWidths = (subset: SubsetResult) => {
    const entries = [...subset.advances.entries()]
      .map(([code, advance]) => ({ glyphId: subset.glyphIds.get(code) ?? 0, advance }))
      .sort((a, b) => a.glyphId - b.glyphId);
    const parts: string[] = [];
    for (const entry of entries) {
      parts.push(`${entry.glyphId} [${entry.advance}]`);
    }
    return `[${parts.join(" ")}]`;
  };

  const toUnicode = (subset: SubsetResult) => {
    const entries = [...subset.glyphIds.entries()].sort((a, b) => a[1] - b[1]);
    let body = "";
    for (let i = 0; i < entries.length; i += 100) {
      const chunk = entries.slice(i, i + 100);
      body += `${chunk.length} beginbfchar\n`;
      for (const [code, glyphId] of chunk) {
        body += `<${glyphId.toString(16).padStart(4, "0")}> <${code.toString(16).padStart(4, "0")}>\n`;
      }
      body += "endbfchar\n";
    }
    return `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CMapName /G19-Identity-H def
/CMapType 2 def
1 begincodespacerange
<0000> <ffff>
endcodespacerange
${body}endcmap
CMapName currentdict /CMap defineresource pop
end
end`;
  };

  // 1 Catalog
  push("<< /Type /Catalog /Pages 2 0 R >>");
  // 2 Pages
  push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  // 3 Page
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 5 0 R${boldSubset ? " /F2 6 0 R" : ""} >> >> /Contents 4 0 R >>`,
  );
  // 4 Contents
  push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  // 5 F1 (ссылки на CIDFont/ToUnicode подставляются после сборки всех объектов)
  push("<< >>");

  // Нумерация ниже пересчитывается динамически, чтобы не зависеть от наличия жирного шрифта.
  const regularFontFileId = objects.length + 1;
  push(`<< /Length ${regularSubset.data.length} /Length1 ${regularSubset.data.length} >>\nstream\n${regularSubset.data.toString("latin1")}\nendstream`);
  const regularDescriptorId = objects.length + 1;
  push(
    `<< /Type /FontDescriptor /FontName /${regularSubset.postScriptName} /Flags 32 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 /FontFile2 ${regularFontFileId} 0 R >>`,
  );
  const regularCidFontId = objects.length + 1;
  push(
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${regularSubset.postScriptName} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${regularDescriptorId} 0 R /DW 1000 /W ${cidWidths(regularSubset)} /CIDToGIDMap /Identity >>`,
  );

  let boldFontFileId = 0;
  let boldDescriptorId = 0;
  let boldCidFontId = 0;
  if (boldSubset) {
    boldFontFileId = objects.length + 1;
    push(`<< /Length ${boldSubset.data.length} /Length1 ${boldSubset.data.length} >>\nstream\n${boldSubset.data.toString("latin1")}\nendstream`);
    boldDescriptorId = objects.length + 1;
    push(
      `<< /Type /FontDescriptor /FontName /${boldSubset.postScriptName} /Flags 32 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 120 /FontFile2 ${boldFontFileId} 0 R >>`,
    );
    boldCidFontId = objects.length + 1;
    push(
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${boldSubset.postScriptName} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${boldDescriptorId} 0 R /DW 1000 /W ${cidWidths(boldSubset)} /CIDToGIDMap /Identity >>`,
    );
  }

  const regularToUnicodeId = objects.length + 1;
  const regularToUnicodeStream = toUnicode(regularSubset);
  push(`<< /Length ${Buffer.byteLength(regularToUnicodeStream, "latin1")} >>\nstream\n${regularToUnicodeStream}\nendstream`);

  let boldToUnicodeId = 0;
  if (boldSubset) {
    boldToUnicodeId = objects.length + 1;
    const streamData = toUnicode(boldSubset);
    push(`<< /Length ${Buffer.byteLength(streamData, "latin1")} >>\nstream\n${streamData}\nendstream`);
  }

  const infoId = objects.length + 1;
  push(`<< /Title (${escapePdfString(options.title)}) /Producer (Garage19 demo generator) /Creator (Garage19) >>`);

  // Переписываем ссылки в объектах 5 и 6 на фактические номера CIDFont/ToUnicode
  objects[4] = `<< /Type /Font /Subtype /Type0 /BaseFont /${regularSubset.postScriptName} /Encoding /Identity-H /DescendantFonts [${regularCidFontId} 0 R] /ToUnicode ${regularToUnicodeId} 0 R >>`;
  if (boldSubset) {
    objects[5] = `<< /Type /Font /Subtype /Type0 /BaseFont /${boldSubset.postScriptName} /Encoding /Identity-H /DescendantFonts [${boldCidFontId} 0 R] /ToUnicode ${boldToUnicodeId} 0 R >>`;
  }

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return { pdf: Buffer.from(pdf, "latin1"), embeddedGlyphs: regularSubset.numGlyphs };
}

export function readFontFile(path: string): Buffer {
  return readFileSync(path);
}
