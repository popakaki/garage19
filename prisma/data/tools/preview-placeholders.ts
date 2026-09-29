/** Собирает HTML-превью плейсхолдеров, чтобы визуально проверить SVG. */
import { writeFileSync } from "node:fs";

const products = [
  "bagazhnik-1.svg",
  "avtoboks-2.svg",
  "velokreplenie-1.svg",
  "lyzhnoe-kreplenie-1.svg",
  "farkop-1.svg",
  "korzina-1.svg",
  "voda-1.svg",
  "aksessuar-1.svg",
  "elektrika-1.svg",
];
const banners = ["hero-1.svg", "hero-2.svg", "hero-3.svg", "promo-1.svg"];

const cells = products
  .map(
    (file) =>
      `<figure style="margin:0;border:1px solid #d5d9e0;border-radius:8px;overflow:hidden"><img src="../../../public/images/products/${file}" style="width:100%;display:block"><figcaption style="font:12px sans-serif;padding:4px 6px;color:#555">${file}</figcaption></figure>`,
  )
  .join("");

const bannerCells = banners
  .map(
    (file) =>
      `<figure style="margin:0 0 10px;border:1px solid #d5d9e0;border-radius:8px;overflow:hidden"><img src="../../../public/images/banners/${file}" style="width:100%;display:block"><figcaption style="font:12px sans-serif;padding:4px 6px;color:#555">${file}</figcaption></figure>`,
  )
  .join("");

const html = `<!doctype html><meta charset="utf-8"><title>Garage19 placeholder preview</title>
<style>body{margin:0;padding:12px;background:#fff;font-family:system-ui,sans-serif}
h2{font:600 15px system-ui;margin:6px 0}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
</style>
<h2>Товарные плейсхолдеры (800×600)</h2><div class="grid">${cells}</div>
<h2>Баннеры (1600×600)</h2>${bannerCells}`;

writeFileSync(new URL("./preview-placeholders.html", import.meta.url), html, "utf8");
console.log("preview-placeholders.html записан");
