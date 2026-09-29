import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { calculateDelivery, isDeliveryType } from "@/lib/delivery";
import { DELIVERY_TYPES } from "@/lib/constants";

/**
 * POST /api/delivery/calculate
 * Тело: { cityId?, deliveryType, weightGrams?, subtotal?, pickupPointCode? }
 * Ответ: { price, daysMin, daysMax, provider, tariffName, free }
 *
 * Используется клиентским калькулятором на странице оформления заказа.
 * Сервер при создании заказа пересчитывает стоимость тем же кодом,
 * поэтому доверять ответу клиента нельзя.
 */

const bodySchema = z.object({
  cityId: z.string().trim().min(1).optional().nullable(),
  deliveryType: z.enum(Object.keys(DELIVERY_TYPES) as [string, ...string[]]),
  weightGrams: z.coerce.number().int().min(0).max(500_000).optional(),
  subtotal: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  pickupPointCode: z.string().trim().max(64).optional().nullable(),
});

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON в запросе" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте параметры расчёта доставки" }, { status: 422 });
  }

  const data = parsed.data;
  if (!isDeliveryType(data.deliveryType)) {
    return NextResponse.json({ error: "Неизвестный способ доставки" }, { status: 422 });
  }

  const cityId = data.cityId ?? undefined;
  if (cityId) {
    const city = await prisma.city.findFirst({ where: { id: cityId, isActive: true }, select: { id: true } });
    if (!city) {
      return NextResponse.json({ error: "Город не найден" }, { status: 404 });
    }
  }

  try {
    const quote = await calculateDelivery({
      cityId,
      deliveryType: data.deliveryType,
      weightGrams: data.weightGrams ?? 0,
      subtotal: data.subtotal ?? 0,
      pickupPointCode: data.pickupPointCode ?? undefined,
    });
    return NextResponse.json(quote);
  } catch (error) {
    console.error("[delivery] calculate failed", error);
    return NextResponse.json({ error: "Не удалось рассчитать доставку" }, { status: 500 });
  }
}
