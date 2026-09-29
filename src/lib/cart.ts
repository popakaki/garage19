import "server-only";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { PRODUCT_CARD_SELECT, type ProductCard } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";

/**
 * Корзина.
 * — Гость: состав хранится в cookie `g19_cart` (JSON [{productId, qty}]).
 * — Авторизованный: состав хранится в БД (CartItem), cookie не используется.
 * При входе гостя корзина сливается в БД (mergeGuestCart).
 * Запись cookie возможна только из Server Action / Route Handler.
 */

export const CART_COOKIE = "g19_cart";
const CART_TTL_DAYS = 60;
const MAX_QTY_PER_ITEM = 99;

export type CartCookieItem = { productId: string; qty: number };

export type CartLine = {
  product: ProductCard;
  qty: number;
  total: number;
};

export type CartSummary = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  weight: number;
  inStock: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Чтение
// ─────────────────────────────────────────────────────────────────────────────

export async function readCookieCart(): Promise<CartCookieItem[]> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(CART_COOKIE)?.value;
    if (!raw) return [];
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is CartCookieItem => Boolean(item?.productId))
      .map((item) => ({ productId: String(item.productId), qty: clampQty(Number(item.qty) || 1) }));
  } catch {
    return [];
  }
}

export async function writeCookieCart(items: CartCookieItem[]): Promise<void> {
  const cookieStore = await cookies();
  const value = encodeURIComponent(JSON.stringify(items));
  cookieStore.set(CART_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_TTL_DAYS * 24 * 60 * 60,
  });
}

function clampQty(qty: number): number {
  if (!Number.isFinite(qty) || qty < 1) return 1;
  return Math.min(MAX_QTY_PER_ITEM, Math.floor(qty));
}

/** Сводка корзины с данными товаров — для страниц, шапки и оформления заказа. */
export async function getCart(): Promise<CartSummary> {
  const user = await getCurrentUser();

  let entries: CartCookieItem[] = [];
  if (user) {
    const items = await prisma.cartItem.findMany({
      where: { userId: user.id },
      select: { productId: true, qty: true },
      orderBy: { createdAt: "asc" },
    });
    entries = items.map((item) => ({ productId: item.productId, qty: item.qty }));
  } else {
    entries = await readCookieCart();
  }

  if (entries.length === 0) {
    return { lines: [], count: 0, subtotal: 0, weight: 0, inStock: true };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: entries.map((entry) => entry.productId) }, isActive: true },
    select: { ...PRODUCT_CARD_SELECT, weight: true },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  const lines: CartLine[] = [];
  for (const entry of entries) {
    const product = byId.get(entry.productId);
    if (!product) continue;
    lines.push({
      product,
      qty: entry.qty,
      total: product.price * entry.qty,
    });
  }

  return {
    lines,
    count: lines.reduce((sum, line) => sum + line.qty, 0),
    subtotal: lines.reduce((sum, line) => sum + line.total, 0),
    weight: lines.reduce((sum, line) => sum + (line.product.weight ?? 0) * line.qty, 0),
    inStock: lines.every((line) => line.product.stock >= line.qty),
  };
}

/** Только количество позиций — для иконки в шапке (дешёвый запрос). */
export async function getCartCount(): Promise<number> {
  const user = await getCurrentUser();
  if (user) {
    const result = await prisma.cartItem.aggregate({ where: { userId: user.id }, _sum: { qty: true } });
    return result._sum.qty ?? 0;
  }
  const items = await readCookieCart();
  return items.reduce((sum, item) => sum + item.qty, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Изменение
// ─────────────────────────────────────────────────────────────────────────────

export async function addToCart(productId: string, qty = 1): Promise<void> {
  const user = await getCurrentUser();
  const quantity = clampQty(qty);

  if (user) {
    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId: user.id, productId } },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { qty: clampQty(existing.qty + quantity) },
      });
    } else {
      await prisma.cartItem.create({ data: { userId: user.id, productId, qty: quantity } });
    }
    return;
  }

  const items = await readCookieCart();
  const existing = items.find((item) => item.productId === productId);
  if (existing) {
    existing.qty = clampQty(existing.qty + quantity);
  } else {
    items.push({ productId, qty: quantity });
  }
  await writeCookieCart(items);
}

export async function setCartQty(productId: string, qty: number): Promise<void> {
  const user = await getCurrentUser();

  if (user) {
    if (qty <= 0) {
      await prisma.cartItem.deleteMany({ where: { userId: user.id, productId } });
      return;
    }
    await prisma.cartItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      create: { userId: user.id, productId, qty: clampQty(qty) },
      update: { qty: clampQty(qty) },
    });
    return;
  }

  const items = (await readCookieCart()).filter((item) => item.productId !== productId);
  if (qty > 0) items.push({ productId, qty: clampQty(qty) });
  await writeCookieCart(items);
}

export async function removeFromCart(productId: string): Promise<void> {
  await setCartQty(productId, 0);
}

export async function clearCart(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  }
  await writeCookieCart([]);
}

/** Переносит корзину гостя в БД после входа/регистрации. */
export async function mergeGuestCart(userId: string): Promise<void> {
  const items = await readCookieCart();
  if (items.length === 0) return;

  for (const item of items) {
    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId: item.productId } },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { qty: clampQty(existing.qty + item.qty) },
      });
    } else {
      const productExists = await prisma.product.count({ where: { id: item.productId } });
      if (productExists) {
        await prisma.cartItem.create({ data: { userId, productId: item.productId, qty: item.qty } });
      }
    }
  }
  await writeCookieCart([]);
}

/** Итоговая стоимость доставки: бесплатно от порога (в копейках). */
export function deliveryCost(subtotal: number, tariffPrice: number, freeFrom?: number | null): number {
  if (freeFrom && subtotal >= freeFrom) return 0;
  return tariffPrice;
}
