import { NextResponse } from "next/server";
import {
  listBrandModels,
  listCarBrands,
  listGenerationModifications,
  listModelGenerations,
  type CascadeOption,
} from "@/lib/garage";

/**
 * GET /api/garage/cascade?level=brands|models|generations|modifications&...
 *  • level=brands        → все активные марки (или поиск: &search=toyota)
 *  • level=models        &brandId=...
 *  • level=generations   &modelId=...
 *  • level=modifications &generationId=...
 *
 * Отдаёт только данные справочника — используется каскадом «Гаража».
 */

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const level = (searchParams.get("level") ?? "brands").trim();

  let items: CascadeOption[] = [];
  let error: string | null = null;

  try {
    switch (level) {
      case "brands":
        items = await listCarBrands(searchParams.get("search")?.trim() || undefined);
        break;
      case "models":
        items = await listBrandModels(searchParams.get("brandId")?.trim() ?? "");
        break;
      case "generations":
        items = await listModelGenerations(searchParams.get("modelId")?.trim() ?? "");
        break;
      case "modifications":
        items = await listGenerationModifications(searchParams.get("generationId")?.trim() ?? "");
        break;
      default:
        return NextResponse.json({ error: "Неизвестный уровень каскада" }, { status: 422 });
    }
  } catch (dbError) {
    console.error("[garage] cascade failed", dbError);
    error = "Справочник автомобилей недоступен";
  }

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ level, items });
}
