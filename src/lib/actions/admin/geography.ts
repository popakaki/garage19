"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { DELIVERY_PROVIDERS } from "@/lib/constants";
import {
  audit,
  fail,
  getFormBoolStrict,
  getFormFloat,
  getFormInt,
  getFormOptional,
  getFormString,
  guardAction,
  isId,
  redirectWith,
  type ActionState,
} from "@/lib/admin/actions";

/**
 * География и доставка: города, тарифы доставки, пункты выдачи.
 * Деньги — копейки, вес — граммы.
 */

const PROVIDER_KEYS = Object.keys(DELIVERY_PROVIDERS);
const TARIFF_PROVIDERS = ["cdek", "boxberry", "post", "own", "pickup"];

function priceToKopecks(raw: string): number | null {
  const normalized = raw.replace(/\s|₽|руб\.?/gi, "").replace(",", ".");
  if (normalized === "") return null;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

function revalidateGeography(): void {
  revalidatePath("/admin/cities");
  revalidatePath("/admin");
}

// ─────────────────────────────────────────────────────────────────────────────
// Города
// ─────────────────────────────────────────────────────────────────────────────

export async function createCityAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cities", async (user) => {
    const name = getFormString(formData, "name");
    if (!name) return fail("Укажите название города");

    const slug = slugify(getFormString(formData, "slug") || name);
    const busy = await prisma.city.findUnique({ where: { slug }, select: { id: true } });
    if (busy) return fail(`Город со slug «${slug}» уже есть`);

    const city = await prisma.city.create({
      data: {
        name,
        slug,
        region: getFormOptional(formData, "region") ?? null,
        phone: getFormOptional(formData, "phone") ?? null,
        address: getFormOptional(formData, "address") ?? null,
        workTime: getFormOptional(formData, "workTime") ?? null,
        deliveryDays: getFormInt(formData, "deliveryDays") ?? 3,
        freeDeliveryFrom: priceToKopecks(getFormString(formData, "freeDeliveryFrom")),
        pickupAvailable: getFormBoolStrict(formData, "pickupAvailable") ?? false,
        deliveryAvailable: getFormBoolStrict(formData, "deliveryAvailable") ?? false,
        isDefault: getFormBoolStrict(formData, "isDefault") ?? false,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        seoTitle: getFormOptional(formData, "seoTitle") ?? null,
        seoDescription: getFormOptional(formData, "seoDescription") ?? null,
      },
    });

    if (city.isDefault) {
      await prisma.city.updateMany({ where: { id: { not: city.id } }, data: { isDefault: false } });
    }

    await audit(user, "create", "city", city.id, { name, slug });
    revalidateGeography();
    redirectWith("/admin/cities", "city.created");
  });
}

export async function updateCityAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cities", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Город не найден");

    const name = getFormString(formData, "name");
    if (!name) return fail("Укажите название города");

    const slug = slugify(getFormString(formData, "slug") || name);
    const current = await prisma.city.findUnique({ where: { id }, select: { slug: true } });
    if (!current) return fail("Город не найден");
    if (slug !== current.slug) {
      const busy = await prisma.city.findUnique({ where: { slug }, select: { id: true } });
      if (busy) return fail(`Город со slug «${slug}» уже есть`);
    }

    const isDefault = getFormBoolStrict(formData, "isDefault") ?? false;

    await prisma.city.update({
      where: { id },
      data: {
        name,
        slug,
        region: getFormOptional(formData, "region") ?? null,
        phone: getFormOptional(formData, "phone") ?? null,
        address: getFormOptional(formData, "address") ?? null,
        workTime: getFormOptional(formData, "workTime") ?? null,
        deliveryDays: getFormInt(formData, "deliveryDays") ?? 3,
        freeDeliveryFrom: priceToKopecks(getFormString(formData, "freeDeliveryFrom")),
        pickupAvailable: getFormBoolStrict(formData, "pickupAvailable") ?? false,
        deliveryAvailable: getFormBoolStrict(formData, "deliveryAvailable") ?? false,
        isDefault,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
        seoTitle: getFormOptional(formData, "seoTitle") ?? null,
        seoDescription: getFormOptional(formData, "seoDescription") ?? null,
      },
    });

    if (isDefault) {
      await prisma.city.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
    }

    await audit(user, "update", "city", id, { name, slug, isDefault });
    revalidateGeography();
    return { ok: true };
  });
}

export async function deleteCityAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirectWith("/admin/cities", "error.forbidden");
  }
  if (!isId(id)) redirectWith("/admin/cities", "error.notfound");

  try {
    const city = await prisma.city.findUnique({
      where: { id },
      select: { name: true, _count: { select: { orders: true, pickupPoints: true, tariffs: true } } },
    });
    if (!city) redirectWith("/admin/cities", "error.notfound");
    if (city._count.orders > 0) redirectWith("/admin/cities", "error.relation", { orders: city._count.orders });
    await prisma.city.delete({ where: { id } });
    await audit(user, "delete", "city", id, { name: city.name });
  } catch {
    redirectWith("/admin/cities", "error.failed");
  }

  revalidateGeography();
  redirectWith("/admin/cities", "city.deleted");
}

// ─────────────────────────────────────────────────────────────────────────────
// Тарифы доставки
// ─────────────────────────────────────────────────────────────────────────────

export async function createTariffAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cities", async (user) => {
    const cityId = getFormString(formData, "cityId");
    const name = getFormString(formData, "name");
    const provider = getFormString(formData, "provider");
    const price = priceToKopecks(getFormString(formData, "price"));

    if (!isId(cityId)) return fail("Город не найден");
    if (!name) return fail("Укажите название тарифа");
    if (!TARIFF_PROVIDERS.includes(provider)) return fail("Выберите службу доставки");
    if (price === null || price < 0) return fail("Укажите стоимость доставки");

    const tariff = await prisma.deliveryTariff.create({
      data: {
        cityId,
        provider,
        name,
        price,
        minDays: getFormInt(formData, "minDays") ?? 1,
        maxDays: getFormInt(formData, "maxDays") ?? 5,
        minOrderTotal: priceToKopecks(getFormString(formData, "minOrderTotal")),
        maxWeight: getFormInt(formData, "maxWeight"),
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
      },
    });

    await audit(user, "create", "deliveryTariff", tariff.id, { cityId, provider, price });
    revalidateGeography();
    redirectWith(`/admin/cities/${cityId}`, "tariff.created");
  });
}

export async function updateTariffAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cities", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Тариф не найден");

    const name = getFormString(formData, "name");
    const provider = getFormString(formData, "provider");
    const price = priceToKopecks(getFormString(formData, "price"));
    if (!name) return fail("Укажите название тарифа");
    if (!TARIFF_PROVIDERS.includes(provider)) return fail("Выберите службу доставки");
    if (price === null || price < 0) return fail("Укажите стоимость доставки");

    await prisma.deliveryTariff.update({
      where: { id },
      data: {
        provider,
        name,
        price,
        minDays: getFormInt(formData, "minDays") ?? 1,
        maxDays: getFormInt(formData, "maxDays") ?? 5,
        minOrderTotal: priceToKopecks(getFormString(formData, "minOrderTotal")),
        maxWeight: getFormInt(formData, "maxWeight"),
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
        sortOrder: getFormInt(formData, "sortOrder") ?? 100,
      },
    });

    await audit(user, "update", "deliveryTariff", id, { name, price });
    revalidateGeography();
    return { ok: true };
  });
}

export async function deleteTariffAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const cityId = getFormString(formData, "cityId");

  await guardAction("cities", async (user) => {
    if (!isId(id)) return fail("Тариф не найден");
    await prisma.deliveryTariff.delete({ where: { id } });
    await audit(user, "delete", "deliveryTariff", id, { cityId });
    revalidateGeography();
    return { ok: true };
  });

  redirectWith(isId(cityId) ? `/admin/cities/${cityId}` : "/admin/cities", "tariff.deleted");
}

// ─────────────────────────────────────────────────────────────────────────────
// Пункты выдачи
// ─────────────────────────────────────────────────────────────────────────────

export async function createPickupPointAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cities", async (user) => {
    const cityId = getFormString(formData, "cityId");
    const provider = getFormString(formData, "provider");
    const code = getFormString(formData, "code");
    const address = getFormString(formData, "address");

    if (!isId(cityId)) return fail("Город не найден");
    if (!PROVIDER_KEYS.includes(provider)) return fail("Выберите службу доставки");
    if (!code) return fail("Укажите код пункта выдачи");
    if (!address) return fail("Укажите адрес пункта выдачи");

    const busy = await prisma.pickupPoint.findFirst({ where: { provider, code }, select: { id: true } });
    if (busy) return fail(`Пункт ${provider.toUpperCase()}-${code} уже существует`);

    const point = await prisma.pickupPoint.create({
      data: {
        cityId,
        provider,
        code,
        name: getFormOptional(formData, "name") ?? null,
        address,
        workTime: getFormOptional(formData, "workTime") ?? null,
        phone: getFormOptional(formData, "phone") ?? null,
        lat: getFormFloat(formData, "lat") ?? null,
        lng: getFormFloat(formData, "lng") ?? null,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
      },
    });

    await audit(user, "create", "pickupPoint", point.id, { cityId, provider, code });
    revalidateGeography();
    redirectWith(`/admin/cities/${cityId}`, "pickup.created");
  });
}

export async function updatePickupPointAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return guardAction("cities", async (user) => {
    const id = getFormString(formData, "id");
    if (!isId(id)) return fail("Пункт выдачи не найден");

    const provider = getFormString(formData, "provider");
    const code = getFormString(formData, "code");
    const address = getFormString(formData, "address");
    if (!PROVIDER_KEYS.includes(provider)) return fail("Выберите службу доставки");
    if (!code) return fail("Укажите код пункта выдачи");
    if (!address) return fail("Укажите адрес пункта выдачи");

    await prisma.pickupPoint.update({
      where: { id },
      data: {
        provider,
        code,
        name: getFormOptional(formData, "name") ?? null,
        address,
        workTime: getFormOptional(formData, "workTime") ?? null,
        phone: getFormOptional(formData, "phone") ?? null,
        lat: getFormFloat(formData, "lat") ?? null,
        lng: getFormFloat(formData, "lng") ?? null,
        isActive: getFormBoolStrict(formData, "isActive") ?? false,
      },
    });

    await audit(user, "update", "pickupPoint", id, { provider, code });
    revalidateGeography();
    return { ok: true };
  });
}

export async function deletePickupPointAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const cityId = getFormString(formData, "cityId");

  await guardAction("cities", async (user) => {
    if (!isId(id)) return fail("Пункт выдачи не найден");
    await prisma.pickupPoint.delete({ where: { id } });
    await audit(user, "delete", "pickupPoint", id, { cityId });
    revalidateGeography();
    return { ok: true };
  });

  redirectWith(isId(cityId) ? `/admin/cities/${cityId}` : "/admin/cities", "pickup.deleted");
}

export async function togglePickupPointAction(formData: FormData): Promise<void> {
  const id = getFormString(formData, "id");
  const cityId = getFormString(formData, "cityId");

  await guardAction("cities", async (user) => {
    if (!isId(id)) return fail("Пункт выдачи не найден");
    const point = await prisma.pickupPoint.findUnique({ where: { id }, select: { isActive: true } });
    if (!point) return fail("Пункт выдачи не найден");
    await prisma.pickupPoint.update({ where: { id }, data: { isActive: !point.isActive } });
    await audit(user, "update", "pickupPoint", id, { isActive: !point.isActive });
    revalidateGeography();
    return { ok: true };
  });

  redirectWith(isId(cityId) ? `/admin/cities/${cityId}` : "/admin/cities", "pickup.updated");
}
