"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  createSession,
  destroySession,
  generateToken,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { mergeGuestCart } from "@/lib/cart";
import { isValidEmail, isValidPhone } from "@/lib/utils";

/**
 * Server Actions личного кабинета: вход/регистрация, восстановление пароля,
 * профиль, адреса, «Гараж» (сохранённые автомобили), выход.
 *
 * Письма не отправляются (SMTP не настроен): ссылка сброса пароля
 * возвращается прямо в интерфейс, а события пишутся в лог сервера.
 */

export type ActionResult = { error?: string; success?: string; resetUrl?: string };

const RESET_TOKEN_TTL_MINUTES = 120;

// ─────────────────────────────────────────────────────────────────────────────
// Валидация
// ─────────────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().trim().min(1, "Укажите e-mail").refine((value) => isValidEmail(value), "Проверьте e-mail"),
  password: z.string().min(1, "Введите пароль"),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Укажите имя").max(120),
    email: z.string().trim().min(1, "Укажите e-mail").refine((value) => isValidEmail(value), "Проверьте e-mail"),
    phone: z
      .string()
      .trim()
      .optional()
      .default("")
      .refine((value) => value === "" || isValidPhone(value), "Телефон в формате +7 (999) 123-45-67"),
    password: z.string().min(6, "Пароль не короче 6 символов").max(100),
    passwordRepeat: z.string().min(6, "Повторите пароль"),
    agreement: z.coerce.boolean().refine((value) => value, "Нужно согласие с правилами"),
  })
  .refine((value) => value.password === value.passwordRepeat, {
    path: ["passwordRepeat"],
    message: "Пароли не совпадают",
  });

const profileSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(120),
  email: z.string().trim().refine((value) => isValidEmail(value), "Проверьте e-mail"),
  phone: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || isValidPhone(value), "Телефон в формате +7 (999) 123-45-67"),
  cityId: z.string().trim().optional().default(""),
});

const addressSchema = z.object({
  id: z.string().trim().optional().default(""),
  title: z.string().trim().max(80).optional().default("Адрес"),
  cityId: z.string().trim().optional().default(""),
  street: z.string().trim().min(5, "Укажите улицу, дом, квартиру").max(300),
  comment: z.string().trim().max(300).optional().default(""),
  isDefault: z.coerce.boolean().default(false),
});

const carSchema = z.object({
  id: z.string().trim().optional().default(""),
  brandId: z.string().trim().min(1, "Выберите марку"),
  modelId: z.string().trim().optional().default(""),
  generationId: z.string().trim().optional().default(""),
  modificationId: z.string().trim().optional().default(""),
  label: z.string().trim().max(80).optional().default(""),
  isPrimary: z.coerce.boolean().default(false),
});

function value(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return raw === null ? "" : String(raw).trim();
}

function checked(formData: FormData, key: string): boolean {
  const raw = formData.get(key);
  return raw === "on" || raw === "true" || raw === "1";
}

// ─────────────────────────────────────────────────────────────────────────────
// Вход, регистрация, выход
// ─────────────────────────────────────────────────────────────────────────────

export async function loginAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: value(formData, "email").toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.isActive || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Неверный e-mail или пароль" };
  }

  // Корзину гостя переносим в БД до создания сессии (cookie гостя ещё доступна).
  await mergeGuestCart(user.id);
  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  console.log(`[account] login ${user.email}`);
  revalidatePath("/account");
  redirect("/account");
}

export async function registerAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: value(formData, "name"),
    email: value(formData, "email").toLowerCase(),
    phone: value(formData, "phone"),
    password: String(formData.get("password") ?? ""),
    passwordRepeat: String(formData.get("passwordRepeat") ?? ""),
    agreement: checked(formData, "agreement"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "Пользователь с таким e-mail уже зарегистрирован — войдите в аккаунт" };
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      passwordHash: await hashPassword(parsed.data.password),
      role: "customer",
      lastLoginAt: new Date(),
    },
  });

  await mergeGuestCart(user.id);
  await createSession(user.id);

  console.log(`[account] registered ${user.email}`);
  revalidatePath("/account");
  redirect("/account?registered=1");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  await destroySession();
  if (user) console.log(`[account] logout ${user.email}`);
  revalidatePath("/");
  redirect("/account/login?logout=1");
}

// ─────────────────────────────────────────────────────────────────────────────
// Восстановление пароля
// ─────────────────────────────────────────────────────────────────────────────

const resetRequestSchema = z.object({
  email: z.string().trim().refine((value) => isValidEmail(value), "Проверьте e-mail"),
});

/**
 * Запрос на восстановление пароля. Почта не настроена, поэтому ссылка
 * возвращается прямо в ответе Server Action и показывается в интерфейсе.
 */
export async function requestPasswordResetAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetRequestSchema.safeParse({ email: value(formData, "email").toLowerCase() });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте e-mail" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (!user) {
    return { error: "Пользователь с таким e-mail не найден" };
  }

  const token = generateToken(24);
  await prisma.passwordReset.create({
    data: {
      email: parsed.data.email,
      token,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  const resetUrl = `/account/reset?token=${token}`;
  console.log(`[account] password reset requested for ${parsed.data.email}: ${resetUrl}`);

  return {
    success: "Ссылка для сброса пароля создана. Почта пока не подключена — скопируйте ссылку ниже.",
    resetUrl,
  };
}

const resetSchema = z
  .object({
    token: z.string().trim().min(10, "Некорректная ссылка сброса"),
    password: z.string().min(6, "Пароль не короче 6 символов").max(100),
    passwordRepeat: z.string().min(6, "Повторите пароль"),
  })
  .refine((value) => value.password === value.passwordRepeat, {
    path: ["passwordRepeat"],
    message: "Пароли не совпадают",
  });

export async function resetPasswordAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    token: value(formData, "token"),
    password: String(formData.get("password") ?? ""),
    passwordRepeat: String(formData.get("passwordRepeat") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const reset = await prisma.passwordReset.findUnique({ where: { token: parsed.data.token } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return { error: "Ссылка сброса недействительна или устарела. Запросите новую." };
  }

  const user = await prisma.user.findUnique({ where: { email: reset.email }, select: { id: true } });
  if (!user) {
    return { error: "Пользователь не найден" };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  console.log(`[account] password reset done for ${reset.email}`);
  return { success: "Пароль изменён. Войдите с новым паролем." };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    newPassword: z.string().min(6, "Новый пароль не короче 6 символов").max(100),
    newPasswordRepeat: z.string().min(6, "Повторите новый пароль"),
  })
  .refine((value) => value.newPassword === value.newPasswordRepeat, {
    path: ["newPasswordRepeat"],
    message: "Пароли не совпадают",
  });

export async function changePasswordAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Требуется вход в аккаунт" };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    newPasswordRepeat: String(formData.get("newPasswordRepeat") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record || !(await verifyPassword(parsed.data.currentPassword, record.passwordHash))) {
    return { error: "Текущий пароль указан неверно" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  console.log(`[account] password changed ${user.email}`);
  revalidatePath("/account/profile");
  return { success: "Пароль обновлён" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Профиль
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProfileAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Требуется вход в аккаунт" };

  const parsed = profileSchema.safeParse({
    name: value(formData, "name"),
    email: value(formData, "email").toLowerCase(),
    phone: value(formData, "phone"),
    cityId: value(formData, "cityId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const taken = await prisma.user.findFirst({
    where: { email: parsed.data.email, id: { not: user.id } },
    select: { id: true },
  });
  if (taken) return { error: "Этот e-mail уже используется другим аккаунтом" };

  let cityId: string | null = null;
  if (parsed.data.cityId) {
    const city = await prisma.city.findFirst({ where: { id: parsed.data.cityId, isActive: true }, select: { id: true } });
    cityId = city?.id ?? null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      cityId,
    },
  });

  console.log(`[account] profile updated ${parsed.data.email}`);
  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { success: "Данные профиля сохранены" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Адреса
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAddressAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Требуется вход в аккаунт" };

  const parsed = addressSchema.safeParse({
    id: value(formData, "id"),
    title: value(formData, "title") || "Адрес",
    cityId: value(formData, "cityId"),
    street: value(formData, "street"),
    comment: value(formData, "comment"),
    isDefault: checked(formData, "isDefault"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте адрес" };
  }

  const data = parsed.data;
  let cityId: string | null = null;
  if (data.cityId) {
    const city = await prisma.city.findFirst({ where: { id: data.cityId, isActive: true }, select: { id: true } });
    cityId = city?.id ?? null;
  }

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  }

  if (data.id) {
    const owned = await prisma.address.findFirst({ where: { id: data.id, userId: user.id }, select: { id: true } });
    if (!owned) return { error: "Адрес не найден" };
    await prisma.address.update({
      where: { id: owned.id },
      data: { title: data.title || "Адрес", cityId, street: data.street, comment: data.comment || null, isDefault: data.isDefault },
    });
  } else {
    const count = await prisma.address.count({ where: { userId: user.id } });
    await prisma.address.create({
      data: {
        userId: user.id,
        title: data.title || "Адрес",
        cityId,
        street: data.street,
        comment: data.comment || null,
        isDefault: data.isDefault || count === 0,
      },
    });
  }

  revalidatePath("/account/profile");
  revalidatePath("/checkout");
  return { success: "Адрес сохранён" };
}

export async function deleteAddressAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Требуется вход в аккаунт" };

  const id = value(formData, "id");
  if (!id) return { error: "Адрес не указан" };

  await prisma.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account/profile");
  revalidatePath("/checkout");
  return { success: "Адрес удалён" };
}

export async function setDefaultAddressAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Требуется вход в аккаунт" };

  const id = value(formData, "id");
  if (!id) return { error: "Адрес не указан" };

  await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  const result = await prisma.address.updateMany({ where: { id, userId: user.id }, data: { isDefault: true } });
  if (result.count === 0) return { error: "Адрес не найден" };

  revalidatePath("/account/profile");
  return { success: "Основной адрес обновлён" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Гараж: сохранённые автомобили
// ─────────────────────────────────────────────────────────────────────────────

export async function saveCarAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Требуется вход в аккаунт" };

  const parsed = carSchema.safeParse({
    id: value(formData, "id"),
    brandId: value(formData, "brandId"),
    modelId: value(formData, "modelId"),
    generationId: value(formData, "generationId"),
    modificationId: value(formData, "modificationId"),
    label: value(formData, "label"),
    isPrimary: checked(formData, "isPrimary"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Выберите автомобиль" };
  }

  const data = parsed.data;
  const brand = await prisma.brand.findFirst({ where: { id: data.brandId, isActive: true }, select: { id: true } });
  if (!brand) return { error: "Марка не найдена" };

  const modelId = data.modelId
    ? (await prisma.carModel.findFirst({ where: { id: data.modelId, brandId: brand.id }, select: { id: true } }))?.id ?? null
    : null;
  const generationId =
    modelId && data.generationId
      ? (await prisma.generation.findFirst({ where: { id: data.generationId, modelId }, select: { id: true } }))?.id ?? null
      : null;
  const modificationId =
    generationId && data.modificationId
      ? (await prisma.modification.findFirst({ where: { id: data.modificationId, generationId }, select: { id: true } }))?.id ?? null
      : null;

  if (data.isPrimary) {
    await prisma.savedCar.updateMany({ where: { userId: user.id }, data: { isPrimary: false } });
  }

  if (data.id) {
    const owned = await prisma.savedCar.findFirst({ where: { id: data.id, userId: user.id }, select: { id: true } });
    if (!owned) return { error: "Автомобиль не найден" };
    await prisma.savedCar.update({
      where: { id: owned.id },
      data: { brandId: brand.id, modelId, generationId, modificationId, label: data.label || null, isPrimary: data.isPrimary },
    });
  } else {
    const duplicate = await prisma.savedCar.findFirst({
      where: { userId: user.id, brandId: brand.id, modelId, generationId, modificationId },
      select: { id: true },
    });
    if (duplicate) {
      return { error: "Такой автомобиль уже есть в гараже" };
    }

    const count = await prisma.savedCar.count({ where: { userId: user.id } });
    await prisma.savedCar.create({
      data: {
        userId: user.id,
        brandId: brand.id,
        modelId,
        generationId,
        modificationId,
        label: data.label || null,
        isPrimary: data.isPrimary || count === 0,
      },
    });
  }

  console.log(`[garage] saved car for ${user.email}`);
  revalidatePath("/account/garage");
  revalidatePath("/account");
  return { success: "Автомобиль сохранён в гараже" };
}

export async function deleteCarAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Требуется вход в аккаунт" };

  const id = value(formData, "id");
  if (!id) return { error: "Автомобиль не указан" };

  const car = await prisma.savedCar.findFirst({ where: { id, userId: user.id }, select: { id: true, isPrimary: true } });
  if (!car) return { error: "Автомобиль не найден" };

  await prisma.savedCar.delete({ where: { id: car.id } });

  if (car.isPrimary) {
    const next = await prisma.savedCar.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (next) await prisma.savedCar.update({ where: { id: next.id }, data: { isPrimary: true } });
  }

  revalidatePath("/account/garage");
  revalidatePath("/account");
  return { success: "Автомобиль удалён из гаража" };
}

export async function setPrimaryCarAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Требуется вход в аккаунт" };

  const id = value(formData, "id");
  if (!id) return { error: "Автомобиль не указан" };

  await prisma.savedCar.updateMany({ where: { userId: user.id }, data: { isPrimary: false } });
  const result = await prisma.savedCar.updateMany({ where: { id, userId: user.id }, data: { isPrimary: true } });
  if (result.count === 0) return { error: "Автомобиль не найден" };

  revalidatePath("/account/garage");
  revalidatePath("/account");
  return { success: "Основной автомобиль обновлён" };
}

/** Заявка на VIN-подбор из «Гаража» (пишется в CallbackRequest). */
export async function vinRequestAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const vin = value(formData, "vin").toUpperCase();
  const carInfo = value(formData, "carInfo");

  if (vin.length > 0 && vin.length < 11) {
    return { error: "VIN состоит из 17 символов — проверьте ввод" };
  }

  const phone = value(formData, "phone") || user?.phone || "";
  const name = value(formData, "name") || user?.name || "";
  if (!isValidPhone(phone)) {
    return { error: "Укажите телефон для ответа менеджера" };
  }

  await prisma.callbackRequest.create({
    data: {
      type: "vin",
      name: name || "Покупатель",
      phone,
      email: user?.email ?? null,
      carInfo: carInfo || null,
      message: vin ? `VIN: ${vin}` : null,
      source: "garage",
    },
  });

  console.log(`[garage] vin request from ${user?.email ?? phone}`);
  return { success: "Заявка на подбор отправлена — менеджер свяжется с вами" };
}

/**
 * Быстрое сохранение автомобиля «в один клик» из карточки товара/конфигуратора.
 * Публичная обёртка: если пользователь не авторизован — понятная ошибка
 * (модуль карточки товара показывает её в форме).
 */
export async function saveCarQuickAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Войдите в аккаунт, чтобы сохранить авто в гараже" };
  return saveCarAction({}, formData);
}
