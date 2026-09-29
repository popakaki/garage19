"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin } from "lucide-react";

export type CityOption = { id: string; name: string; slug: string };

/**
 * Выбор города. Город хранится в обычной cookie `g19_city` (имя/слаг),
 * серверные компоненты читают её через `getCurrentCity()`.
 */
export function CitySelect({
  cities,
  currentName,
  className,
}: {
  cities: CityOption[];
  currentName: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const choose = (name: string, slug: string) => {
    document.cookie = `g19_city=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setOpen(false);
    router.refresh();
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-200 hover:text-white"
        aria-expanded={open}
      >
        <MapPin className="size-3.5 text-brand-400" />
        {currentName}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-ink-100 bg-white p-1.5 shadow-pop">
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Ваш город</p>
          <ul className="max-h-72 overflow-y-auto">
            {cities.map((city) => (
              <li key={city.id}>
                <button
                  type="button"
                  onClick={() => choose(city.name, city.slug)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-brand-50 hover:text-brand-700 ${
                    city.name === currentName ? "font-semibold text-brand-700" : "text-ink-700"
                  }`}
                >
                  {city.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
