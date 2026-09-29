"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { addToCart, clearCart, getCart } from "@/lib/cart";
import { calculateDelivery, getInstallPrice } from "@/lib/delivery";
import { checkoutSchema } from "@/lib/checkout-schema";
import { PROMO_COOKIE, normalizePromoCode, resolvePromo } from "@/lib/promo";
import { ORDER_STATUSES, type DeliveryType, type PaymentType } from "@/lib/constants";
import { formatOrderNumber, isValidPhone } from "@/lib/utils";

/**
 * Server Actions заказа.
 *
 *  • `createOrderAction` — единственное место, где создаётся заказ.
 *    Цены, вес и стоимость доставки считаются ТОЛЬКО по данным БД,
 *    данные формы используются как контактные/логистические.
 *  • `applyPromoAction` / `removePromoAction` — промокод в cookie, скидка применяется на сервере.
 *  • `verifyGuestOrderAction` — доступ гостя к заказу по номеру + телефону.
 *  • `repeatOrderAction` — повтор заказа: товары возвращаются в корзину.
 *
 * Действия, показывающие ошибку рядом с формой (`createOrderAction`,
 * `applyPromoAction`, `verifyGuestOrderAction`), принимают `(prevState, formData)` —
 * это подпись React `useActionState`, поэтому в браузере они работают без перезагрузки,
 * а без JavaScript — как обычные submit-обработчики формы.
 *
 * Уведомления: SMTP не настроен, события пишутся в лог сервера с меткой `[order]`.
 */

export type OrderActionState = { error?: string; success?: string };

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательное
// ─────────────────────────────────────────────────────────────────────────────

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return value === null ? "" : String(value).trim();
}

function formChecked(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

/** Последовательный номер заказа: ищем максимальный G19-NNNNNN в БД. */
async function nextOrderNumber(): Promise<string> {
  const last = await prisma.order.findFirst({
    where: { number: { startsWith: "G19-" } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const parsed = last ? Number.parseInt(last.number.slice(4), 10) : 0;
  const sequence = Number.isFinite(parsed) ? parsed + 1 : 1;
  return formatOrderNumber(sequence);
}

type StatusHistoryEntry = { status: string; at: string; comment?: string };

function appendHistory(existing: unknown, entry: StatusHistoryEntry): StatusHistoryEntry[] {
  const list = Array.isArray(existing) ? (existing as StatusHistoryEntry[]) : [];
  return [...list, entry];
}

// ─────────────────────────────────────────────────────────────────────────────
// Создание заказа
// ─────────────────────────────────────────────────────────────────────────────

export async function createOrderAction(_prevState: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const raw = {
    customerName: formValue(formData, "customerName"),
    customerPhone: formValue(formData, "customerPhone"),
    customerEmail: formValue(formData, "customerEmail"),
    cityId: formValue(formData, "cityId"),
    deliveryType: formValue(formData, "deliveryType"),
    pickupPointCode: formValue(formData, "pickupPointCode"),
    pickupPointAddress: formValue(formData, "pickupPointAddress"),
    deliveryAddress: formValue(formData, "deliveryAddress"),
    deliveryComment: formValue(formData, "deliveryComment"),
    paymentType: formValue(formData, "paymentType"),
    companyName: formValue(formData, "companyName"),
    companyInn: formValue(formData, "companyInn"),
    companyKpp: formValue(formData, "companyKpp"),
    companyAddress: formValue(formData, "companyAddress"),
    installRequested: formChecked(formData, "installRequested"),
    installAddress: formValue(formData, "installAddress"),
    carInfo: formValue(formData, "carInfo"),
    comment: formValue(formData, "comment"),
    promoCode: formValue(formData, "promoCode"),
    agreement: formChecked(formData, "agreement"),
  };

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Проверьте заполнение формы" };
  }
  const data = parsed.data;

  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  const cart = await getCart();
  if (cart.lines.length === 0) {
    return { error: "Корзина пуста — добавьте товары и попробуйте снова" };
  }

  const city = await prisma.city.findFirst({ where: { id: data.cityId, isActive: true } });
  if (!city) {
    return { error: "Выбранный город недоступен. Обновите страницу и выберите город снова" };
  }
  if (data.deliveryType === "pickup" && !city.pickupAvailable) {
    return { error: `Самовывоз в городе ${city.name} недоступен — выберите доставку` };
  }
  if (data.deliveryType !== "pickup" && !city.deliveryAvailable) {
    return { error: `Доставка в город ${city.name} временно недоступна` };
  }

  // Пункт выдачи проверяем по БД: код и адрес берём из справочника, а не из формы.
  let pickupPoint: { code: string; address: string; provider: string } | null = null;
  if (data.pickupPointCode) {
    const point = await prisma.pickupPoint.findFirst({
      where: { cityId: city.id, code: data.pickupPointCode, isActive: true },
      select: { code: true, address: true, provider: true },
    });
    if (!point) {
      return { error: "Пункт выдачи не найден в выбранном городе — выберите другой" };
    }
    pickupPoint = point;
  }

  // Свежие цены и остатки — из БД, значениям формы не доверяем.
  const productIds = cart.lines.map((line) => line.product.id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true, name: true, sku: true, slug: true, price: true, stock: true, weight: true, images: { select: { url: true, isPrimary: true, sortOrder: true }, orderBy: { sortOrder: "asc" } } },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  const itemRows = cart.lines
    .map((line) => {
      const product = productById.get(line.product.id);
      if (!product) return null;
      const image = product.images.find((img) => img.isPrimary)?.url ?? product.images[0]?.url ?? null;
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        slug: product.slug,
        image,
        price: product.price,
        qty: line.qty,
        total: product.price * line.qty,
        stock: product.stock,
        weight: product.weight ?? 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (itemRows.length === 0) {
    return { error: "Товары из корзины больше не продаются — обновите корзину" };
  }

  const soldOut = itemRows.filter((row) => row.stock <= 0);
  if (soldOut.length > 0) {
    return {
      error: `Нет в наличии: ${soldOut.map((row) => row.name).join(", ")}. Удалите эти позиции из корзины.`,
    };
  }

  const itemsTotal = itemRows.reduce((sum, row) => sum + row.total, 0);
  const weightGrams = itemRows.reduce((sum, row) => sum + row.weight * row.qty, 0);

  // Промокод: из формы или из cookie (со страницы корзины). Проверка — на сервере.
  let promoCode = normalizePromoCode(data.promoCode);
  if (!promoCode) {
    const cookieStore = await cookies();
    promoCode = normalizePromoCode(cookieStore.get(PROMO_COOKIE)?.value ?? "");
  }
  let discount = 0;
  let appliedPromo: string | null = null;
  if (promoCode) {
    const promo = await resolvePromo(promoCode, itemsTotal);
    if (promo.ok) {
      discount = Math.min(promo.discount, itemsTotal);
      appliedPromo = promo.code;
    }
  }

  const quote = await calculateDelivery({
    cityId: city.id,
    deliveryType: data.deliveryType as DeliveryType,
    weightGrams,
    subtotal: itemsTotal,
    pickupPointCode: pickupPoint?.code ?? undefined,
  });

  const installRequested = data.installRequested;
  const installPrice = installRequested ? await getInstallPrice() : 0;

  const total = Math.max(0, itemsTotal - discount) + quote.price + installPrice;

  let ip: string | undefined;
  try {
    const headerList = await headers();
    ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? undefined;
  } catch {
    ip = undefined;
  }

  const now = new Date();
  const history: StatusHistoryEntry[] = [{ status: "new", at: now.toISOString(), comment: "Заказ оформлен на сайте" }];

  const commentParts: string[] = [];
  if (data.comment) commentParts.push(data.comment);
  if (data.deliveryComment) commentParts.push(`Доставка: ${data.deliveryComment}`);
  if (data.paymentType === "invoice") {
    commentParts.push(
      `Счёт для юрлица: ${data.companyName}, ИНН ${data.companyInn}` +
        `${data.companyKpp ? `, КПП ${data.companyKpp}` : ""}` +
        `${data.companyAddress ? `, ${data.companyAddress}` : ""}`,
    );
  }

  const order = await prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber();

    const created = await tx.order.create({
      data: {
        number,
        userId: user?.id ?? null,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || user?.email || null,
        cityId: city.id,
        cityName: city.name,
        deliveryType: data.deliveryType,
        deliveryProvider: quote.provider,
        deliveryAddress: data.deliveryType === "pickup" ? city.address : data.deliveryAddress || null,
        pickupPointCode: pickupPoint?.code ?? null,
        pickupPointAddress: pickupPoint?.address ?? null,
        deliveryPrice: quote.price,
        deliveryDaysMin: quote.daysMin,
        deliveryDaysMax: quote.daysMax,
        deliveryComment: data.deliveryComment || null,
        paymentType: data.paymentType as PaymentType,
        status: "new",
        paymentStatus: "pending",
        installRequested,
        installPrice: installRequested ? installPrice : null,
        installAddress: installRequested ? data.installAddress || null : null,
        itemsTotal,
        discount,
        total,
        promoCode: appliedPromo,
        comment: commentParts.length ? commentParts.join("\n") : null,
        source: "site",
        carInfo: data.carInfo || null,
        statusHistory: history,
        ip: ip ?? null,
        items: {
          create: itemRows.map((row) => ({
            productId: row.productId,
            name: row.name,
            sku: row.sku,
            slug: row.slug,
            image: row.image,
            price: row.price,
            qty: row.qty,
            total: row.total,
          })),
        },
      },
      select: { id: true, number: true },
    });

    // Резервируем товар на складе: reserved растёт на количество в заказе.
    for (const row of itemRows) {
      await tx.product.update({
        where: { id: row.productId },
        data: { reserved: { increment: row.qty } },
      });
    }

    return created;
  });

  await clearCart();

  try {
    const cookieStore = await cookies();
    cookieStore.delete(PROMO_COOKIE);
  } catch {
    // вне контекста запроса — не критично
  }

  const shortItems = itemRows.reduce((sum, row) => sum + row.qty, 0);
  console.log(
    `[order] created ${order.number} total=${total} items=${shortItems} ` +
      `delivery=${data.deliveryType}/${quote.provider} price=${quote.price} ` +
      `discount=${discount}${installRequested ? " install=yes" : ""}${user ? ` user=${user.id}` : " guest=yes"}`,
  );

  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/account");
  revalidatePath("/account/orders");
  revalidatePath(`/order/${order.number}`);

  redirect(`/order/${order.number}?created=1`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Промокод
// ─────────────────────────────────────────────────────────────────────────────

export async function applyPromoAction(_prevState: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const code = formValue(formData, "promoCode");
  const cart = await getCart();
  const promo = await resolvePromo(code, cart.subtotal);

  if (!promo.ok) {
    return { error: promo.error };
  }

  const cookieStore = await cookies();
  cookieStore.set(PROMO_COOKIE, promo.code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  console.log(`[promo] applied ${promo.code} (-${promo.percent}%)`);
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { success: `Промокод ${promo.code} применён: −${promo.percent}%` };
}

export async function removePromoAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PROMO_COOKIE);
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

/** Текущий промокод из cookie (для страниц корзины и оформления). */
export async function currentPromo(subtotal: number): Promise<{ code: string; percent: number; discount: number } | null> {
  const cookieStore = await cookies();
  const code = normalizePromoCode(cookieStore.get(PROMO_COOKIE)?.value ?? "");
  if (!code) return null;
  const promo = await resolvePromo(code, subtotal);
  if (!promo.ok) return null;
  return { code: promo.code, percent: promo.percent, discount: promo.discount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Доступ гостя к заказу
// ─────────────────────────────────────────────────────────────────────────────

const guestAccessSchema = z.object({
  number: z.string().trim().min(4, "Укажите номер заказа"),
  phone: z.string().trim().refine((value) => isValidPhone(value), "Телефон в формате +7 (999) 123-45-67"),
});

export async function verifyGuestOrderAction(_prevState: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const parsed = guestAccessSchema.safeParse({
    number: formValue(formData, "number").toUpperCase(),
    phone: formValue(formData, "phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const order = await prisma.order.findFirst({
    where: { number: parsed.data.number },
    select: { id: true, number: true, customerPhone: true },
  });

  const digits = (value: string) => value.replace(/\D/g, "").slice(-10);
  if (!order || digits(order.customerPhone) !== digits(parsed.data.phone)) {
    return { error: "Заказ с таким номером и телефоном не найден" };
  }

  const cookieStore = await cookies();
  cookieStore.set(`g19_order_${order.number}`, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/order/${order.number}`,
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(`/order/${order.number}`);
}

/** Есть ли у текущего посетителя доступ к гостевому заказу. */
export async function hasGuestOrderAccess(orderNumber: string): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(`g19_order_${orderNumber}`)?.value === "1";
}

// ─────────────────────────────────────────────────────────────────────────────
// Повтор заказа
// ─────────────────────────────────────────────────────────────────────────────

export async function repeatOrderAction(formData: FormData): Promise<void> {
  const orderId = formValue(formData, "orderId");
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { number: true, items: { select: { productId: true, qty: true } } },
  });
  if (!order) return;

  let restored = 0;
  for (const item of order.items) {
    if (!item.productId) continue;
    const exists = await prisma.product.count({ where: { id: item.productId, isActive: true } });
    if (!exists) continue;
    await addToCart(item.productId, item.qty);
    restored += 1;
  }

  console.log(`[order] repeat ${order.number}: restored=${restored}`);

  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/account/orders");
  redirect("/cart?repeated=1");
}
