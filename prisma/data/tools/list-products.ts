/** Печатает индекс и наименование каждого товара — для проверки ссылок в отзывах. */
import { PRODUCTS } from "../products";

PRODUCTS.forEach((product, index) => {
  console.log(`${String(index).padStart(3)} | ${product.sku.padEnd(26)} | ${product.category.padEnd(30)} | ${product.name}`);
});
console.log(`\nВсего: ${PRODUCTS.length}`);
