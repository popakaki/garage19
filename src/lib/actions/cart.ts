"use server";

import { revalidatePath } from "next/cache";
import { addToCart, clearCart, removeFromCart, setCartQty } from "@/lib/cart";

/**
 * Server Actions корзины.
 * Используются формами в карточке товара, в каталоге и на странице корзины,
 * поэтому работают и без JavaScript (progressive enhancement).
 */

export async function addToCartAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const qty = Number(formData.get("qty") ?? 1);
  const redirectTo = String(formData.get("redirectTo") ?? "");
  if (!productId) return;

  await addToCart(productId, Number.isFinite(qty) ? qty : 1);

  revalidatePath("/cart");
  revalidatePath("/");
  if (redirectTo) {
    revalidatePath(redirectTo);
  }
}

export async function updateCartQtyAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const qty = Number(formData.get("qty") ?? 1);
  if (!productId) return;

  await setCartQty(productId, Number.isFinite(qty) ? qty : 1);
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function removeFromCartAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return;

  await removeFromCart(productId);
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function clearCartAction(): Promise<void> {
  await clearCart();
  revalidatePath("/cart");
  revalidatePath("/checkout");
}
