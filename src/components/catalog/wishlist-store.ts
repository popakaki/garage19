"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Хранилище «Избранное» и «Сравнение» на localStorage.
 * Список id товаров; события синхронизируют все компоненты на странице
 * и другие открытые вкладки (через ключ «storage»).
 *
 * Внимание: при первом рендере список всегда пустой (SSR), реальные значения
 * подтягиваются в useEffect — так разметка сервера и клиента совпадает.
 */

export type StoreKind = "compare" | "wishlist";

export const STORE_KEYS: Record<StoreKind, string> = {
  compare: "g19_compare",
  wishlist: "g19_wishlist",
};

export const MAX_COMPARE = 4;

function readStore(kind: StoreKind): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEYS[kind]);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

function writeStore(kind: StoreKind, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEYS[kind], JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent("g19-store-change", { detail: { kind } }));
  } catch {
    // localStorage недоступен (приватный режим) — молча игнорируем
  }
}

export function useProductStore(kind: StoreKind, max = Number.POSITIVE_INFINITY) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(readStore(kind));
    setReady(true);

    const sync = () => setIds(readStore(kind));
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORE_KEYS[kind]) sync();
    };
    window.addEventListener("g19-store-change", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("g19-store-change", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [kind]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      const current = readStore(kind);
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id].slice(-max);
      writeStore(kind, next);
      setIds(next);
      return next.includes(id);
    },
    [kind, max],
  );

  const remove = useCallback(
    (id: string) => {
      const next = readStore(kind).filter((item) => item !== id);
      writeStore(kind, next);
      setIds(next);
    },
    [kind],
  );

  const clear = useCallback(() => {
    writeStore(kind, []);
    setIds([]);
  }, [kind]);

  return { ids, count: ids.length, ready, has, toggle, remove, clear };
}
