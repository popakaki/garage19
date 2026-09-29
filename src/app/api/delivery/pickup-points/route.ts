import { NextResponse } from "next/server";
import { getCityBySlug, getPickupPoints } from "@/lib/queries";
import prisma from "@/lib/prisma";
import { DELIVERY_PROVIDERS } from "@/lib/constants";

/**
 * GET /api/delivery/pickup-points?city=<slug|id>&provider=<cdek|boxberry|post|own>
 * Отдаёт пункты выдачи из БД (`PickupPoint`) для выбранного города.
 */

const PROVIDER_VALUES = Object.keys(DELIVERY_PROVIDERS);

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const cityParam = (searchParams.get("city") ?? "").trim();
  const providerParam = (searchParams.get("provider") ?? "").trim();

  if (!cityParam) {
    return NextResponse.json({ error: "Не указан город" }, { status: 422 });
  }
  if (providerParam && !PROVIDER_VALUES.includes(providerParam)) {
    return NextResponse.json({ error: "Неизвестный перевозчик" }, { status: 422 });
  }

  const city = cityParam.startsWith("c") && cityParam.length > 20
    ? await prisma.city.findFirst({ where: { id: cityParam, isActive: true } })
    : await getCityBySlug(cityParam);

  if (!city) {
    return NextResponse.json({ error: "Город не найден" }, { status: 404 });
  }

  const points = await getPickupPoints(city.id, providerParam || undefined);

  return NextResponse.json({
    city: { id: city.id, name: city.name, slug: city.slug },
    provider: providerParam || null,
    points: points.map((point) => ({
      id: point.id,
      provider: point.provider,
      code: point.code,
      name: point.name,
      address: point.address,
      workTime: point.workTime,
      phone: point.phone,
      lat: point.lat,
      lng: point.lng,
    })),
  });
}
