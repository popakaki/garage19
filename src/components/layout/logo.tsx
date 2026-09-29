import Link from "next/link";
import { cn } from "@/lib/utils";

/** Логотип Garage19. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="Garage19 — на главную">
      <span className="relative flex size-10 items-center justify-center rounded-xl bg-ink-950 text-base font-black text-white shadow-sm transition-transform group-hover:scale-105">
        G
        <span className="absolute -bottom-1 -right-1 size-4 rounded-md bg-brand-500 ring-2 ring-white" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-lg font-black tracking-tight text-ink-950">
            GARAGE<span className="text-brand-600">19</span>
          </span>
          <span className="mt-0.5 block text-[11px] font-medium text-ink-500">багажники · фаркопы · крепления</span>
        </span>
      )}
    </Link>
  );
}
