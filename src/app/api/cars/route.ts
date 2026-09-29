import { NextResponse } from "next/server";
import { getGenerations, getModelsByBrand, getModifications } from "@/lib/queries";

/**
 * Каскад для конфигуратора подбора автомобиля.
 * GET /api/cars?level=models&brand=toyota
 * GET /api/cars?level=generations&brand=toyota&model=camry
 * GET /api/cars?level=modifications&brand=toyota&model=camry&generation=xv70
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level") ?? "models";
  const brand = searchParams.get("brand") ?? "";
  const model = searchParams.get("model") ?? "";
  const generation = searchParams.get("generation") ?? "";

  try {
    if (level === "models" && brand) {
      const models = await getModelsByBrand(brand);
      return NextResponse.json({
        items: models.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          yearFrom: item.yearFrom,
          yearTo: item.yearTo,
          bodyType: item.bodyType,
        })),
      });
    }

    if (level === "generations" && brand && model) {
      const generations = await getGenerations(brand, model);
      return NextResponse.json({
        items: generations.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          yearFrom: item.yearFrom,
          yearTo: item.yearTo,
          bodyType: item.bodyType,
          modificationsCount: item._count.modifications,
        })),
      });
    }

    if (level === "modifications" && brand && model && generation) {
      const modifications = await getModifications(brand, model, generation);
      return NextResponse.json({
        items: modifications.map((item) => ({
          id: item.id,
          name: item.name,
          engine: item.engine,
          volume: item.volume,
          power: item.power,
          fuel: item.fuel,
          drive: item.drive,
          transmission: item.transmission,
          yearFrom: item.yearFrom,
          yearTo: item.yearTo,
        })),
      });
    }

    return NextResponse.json({ items: [] });
  } catch (error) {
    console.error("[api/cars] ошибка каскада", error);
    return NextResponse.json({ items: [], error: "Не удалось загрузить данные" }, { status: 500 });
  }
}
