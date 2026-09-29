"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Car, Factory } from "lucide-react";
import { cn } from "@/lib/utils";

export type BrandsTab = "manufacturers" | "cars";

/**
 * Переключатель вкладок на странице /brands: производители товаров / марки авто.
 * Активная вкладка хранится в query (tab=...), поэтому ссылку можно отправить.
 * Содержимое вкладок рендерится на сервере и передаётся как children.
 */
export function BrandsView({
  defaultTab = "manufacturers",
  manufacturers,
  cars,
}: {
  defaultTab?: BrandsTab;
  manufacturers: ReactNode;
  cars: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const param = searchParams.get("tab");
  const [tab, setTab] = useState<BrandsTab>(defaultTab);

  useEffect(() => {
    if (param === "cars" || param === "manufacturers") setTab(param);
  }, [param]);

  const switchTab = (next: BrandsTab) => {
    setTab(next);
    const search = new URLSearchParams(searchParams.toString());
    search.set("tab", next);
    router.replace(`/brands?${search.toString()}`, { scroll: false });
  };

  const tabs: { value: BrandsTab; label: string; icon: ReactNode }[] = [
    { value: "manufacturers", label: "Производители товаров", icon: <Factory className="size-4" aria-hidden /> },
    { value: "cars", label: "Марки автомобилей", icon: <Car className="size-4" aria-hidden /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Разделы брендов">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => switchTab(item.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === item.value
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" hidden={tab !== "manufacturers"}>
        {manufacturers}
      </div>
      <div role="tabpanel" hidden={tab !== "cars"}>
        {cars}
      </div>
    </div>
  );
}
