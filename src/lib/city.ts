import "server-only";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { SITE } from "@/lib/constants";
import { getDefaultCity } from "@/lib/queries";

export const CITY_COOKIE = "g19_city";

export type CurrentCity = {
  id: string | null;
  name: string;
  slug: string | null;
  phone: string | null;
  address: string | null;
  workTime: string | null;
  deliveryDays: number;
  freeDeliveryFrom: number | null;
  pickupAvailable: boolean;
};

const FALLBACK_CITY: CurrentCity = {
  id: null,
  name: SITE.defaultCity,
  slug: null,
  phone: SITE.phone,
  address: SITE.address,
  workTime: SITE.workTime,
  deliveryDays: 3,
  freeDeliveryFrom: SITE.freeDeliveryFrom,
  pickupAvailable: true,
};

/** Город пользователя: cookie → город по умолчанию из БД → фолбэк из констант. */
export async function getCurrentCity(): Promise<CurrentCity> {
  let slug: string | undefined;
  try {
    const cookieStore = await cookies();
    slug = cookieStore.get(CITY_COOKIE)?.value;
  } catch {
    slug = undefined;
  }

  if (slug) {
    const city = await prisma.city.findFirst({ where: { slug, isActive: true } });
    if (city) return toCurrentCity(city);
  }

  const fallback = await getDefaultCity();
  if (fallback) return toCurrentCity(fallback);

  return FALLBACK_CITY;
}

function toCurrentCity(city: {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  workTime: string | null;
  deliveryDays: number;
  freeDeliveryFrom: number | null;
  pickupAvailable: boolean;
}): CurrentCity {
  return {
    id: city.id,
    name: city.name,
    slug: city.slug,
    phone: city.phone ?? SITE.phone,
    address: city.address ?? SITE.address,
    workTime: city.workTime ?? SITE.workTime,
    deliveryDays: city.deliveryDays,
    freeDeliveryFrom: city.freeDeliveryFrom,
    pickupAvailable: city.pickupAvailable,
  };
}
