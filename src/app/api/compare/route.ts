import { NextResponse } from "next/server";
import { getProductsByIds, type ProductCard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export type CompareResponse = { items: ProductCard[] };

/**
 * Данные для страниц сравнения и избранного.
 * Список id товаров хранится в localStorage браузера, поэтому сервер
 * получает его телом POST-запроса и возвращает карточки товаров.
 */
export async function POST(request: Request): Promise<NextResponse<CompareResponse | { error: string }>> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const ids =
    payload && typeof payload === "object" && Array.isArray((payload as { ids?: unknown }).ids)
      ? ((payload as { ids: unknown[] }).ids.filter((id): id is string => typeof id === "string"))
      : [];

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }
  if (ids.length > 50) {
    return NextResponse.json({ error: "Слишком много товаров для сравнения" }, { status: 400 });
  }

  try {
    const items = await getProductsByIds(ids);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Не удалось получить товары" }, { status: 500 });
  }
}

/** Тот же набор полей используется и в GET ?ids=a,b,c — удобно для отладки. */
export async function GET(request: Request): Promise<NextResponse<CompareResponse | { error: string }>> {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  try {
    const items = await getProductsByIds(ids);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Не удалось получить товары" }, { status: 500 });
  }
}
