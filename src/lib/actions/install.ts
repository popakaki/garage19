"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { getInstallPrice } from "@/lib/delivery";
import { isValidPhone } from "@/lib/utils";

/**
 * Онлайн-запись на установку (`InstallBooking`).
 *
 * Слоты простые: дата (из ближайших рабочих дней) + время из фиксированного списка
 * (`@/lib/install-slots`). Товары можно взять из корзины или перечислить вручную.
 * Уведомления — в лог сервера с меткой `[install]`.
 */

export type InstallActionState = { error?: string; success?: string };

const installSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(120),
  phone: z
    .string()
    .trim()
    .min(1, "Укажите телефон")
    .refine((value) => isValidPhone(value), "Телефон в формате +7 (999) 123-45-67"),
  email: z.string().trim().max(160).optional().default(""),
  cityId: z.string().trim().min(1, "Выберите город"),
  carInfo: z.string().trim().min(2, "Укажите автомобиль (марка и модель)").max(200),
  productIds: z.array(z.string().trim().min(1)).optional().default([]),
  productText: z.string().trim().max(300).optional().default(""),
  slotDate: z.string().trim().min(1, "Выберите дату").max(40),
  slotTime: z.string().trim().min(1, "Выберите время").max(40),
  comment: z.string().trim().max(1000).optional().default(""),
  agreement: z.coerce.boolean().refine((value) => value, "Нужно согласие на обработку персональных данных"),
});

export async function createInstallBookingAction(
  _prevState: InstallActionState,
  formData: FormData,
): Promise<InstallActionState> {
  const rawDate = String(formData.get("slotDate") ?? "").trim();
  const parsed = installSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    cityId: String(formData.get("cityId") ?? "").trim(),
    carInfo: String(formData.get("carInfo") ?? "").trim(),
    productIds: formData.getAll("productIds").map((item) => String(item)).filter(Boolean),
    productText: String(formData.get("productText") ?? "").trim(),
    slotDate: rawDate,
    slotTime: String(formData.get("slotTime") ?? "").trim(),
    comment: String(formData.get("comment") ?? "").trim(),
    agreement: String(formData.get("agreement") ?? "") !== "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте заполнение формы" };
  }
  const data = parsed.data;

  const city = await prisma.city.findFirst({ where: { id: data.cityId, isActive: true }, select: { id: true, name: true } });
  if (!city) return { error: "Выберите город из списка" };

  const slotDate = new Date(`${data.slotDate}T00:00:00`);
  if (Number.isNaN(slotDate.getTime())) return { error: "Некорректная дата записи" };
  if (slotDate.getTime() < new Date().setHours(0, 0, 0, 0)) {
    return { error: "Дата записи уже прошла — выберите другой день" };
  }

  const user = await getCurrentUser();
  const cart = user ? await getCart() : { lines: [] as { product: { id: string } }[] };
  const cartProductIds = cart.lines.map((line) => line.product.id);
  const productIds = data.productIds.length > 0 ? data.productIds : cartProductIds;

  const validProducts = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true, name: true },
      })
    : [];

  const price = await getInstallPrice();

  const booking = await prisma.installBooking.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || user?.email || null,
      cityId: city.id,
      carInfo: data.carInfo,
      productIds: validProducts.map((product) => product.id).join(",") || null,
      comment: [data.comment, data.productText ? `Товары: ${data.productText}` : ""].filter(Boolean).join("\n") || null,
      slotDate,
      slotTime: data.slotTime,
      price,
      status: "new",
    },
    select: { id: true },
  });

  console.log(
    `[install] booking created ${booking.id} city=${city.name} date=${data.slotDate} slot=${data.slotTime} ` +
      `items=${validProducts.length} price=${price}${user ? ` user=${user.id}` : " guest=yes"}`,
  );

  revalidatePath("/install");
  redirect(`/install?booked=${booking.id}`);
}

/**
 * Совместимая подпись «(formData) => Promise<void>» для форм без состояния
 * (например, короткая запись на установку из шапки сайта или карточки товара).
 */
export async function submitInstallBookingAction(formData: FormData): Promise<void> {
  const result = await createInstallBookingAction({}, formData);
  if (result.error) {
    const city = String(formData.get("cityId") ?? "");
    const params = new URLSearchParams({ installError: result.error });
    if (city) params.set("city", city);
    redirect(`/install?${params.toString()}`);
  }
}

/**
 * Запись на установку прямо из заказа (галочка «нужна установка» на оформлении).
 * Создаёт `InstallBooking`, связанный с номером заказа.
 */
export async function createBookingForOrder(
  orderId: string,
  payload: { name: string; phone: string; email?: string | null; cityId?: string | null; carInfo: string; productIds: string[]; orderNumber: string },
): Promise<void> {
  const price = await getInstallPrice();
  const booking = await prisma.installBooking.create({
    data: {
      name: payload.name,
      phone: payload.phone,
      email: payload.email ?? null,
      cityId: payload.cityId ?? null,
      carInfo: payload.carInfo,
      productIds: payload.productIds.join(",") || null,
      price,
      status: "new",
      orderId,
      comment: `Установка по заказу ${payload.orderNumber}`,
    },
    select: { id: true },
  });
  console.log(`[install] booking ${booking.id} linked to order ${payload.orderNumber}`);
}
