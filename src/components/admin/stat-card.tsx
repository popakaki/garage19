import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Показатели сводки: простая сетка карточек без зависимостей. */

export function StatGrid({ children, columns = 4 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  const grid =
    columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4";
  return <div className={cn("grid grid-cols-1 gap-3", grid)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "default",
  icon,
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: "default" | "brand" | "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const tones = {
    default: "border-ink-100",
    brand: "border-brand-200",
    success: "border-emerald-200",
    warning: "border-amber-200",
    danger: "border-red-200",
    info: "border-blue-200",
  } as const;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        {icon && <span className="text-ink-300">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "g19-card block px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md",
          tones[tone],
        )}
      >
        {body}
      </Link>
    );
  }

  return <div className={cn("g19-card px-4 py-4", tones[tone])}>{body}</div>;
}

export function StatRow({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink-100 py-2 text-sm last:border-0">
      <span className="text-ink-600">{label}</span>
      <span className="text-right font-semibold text-ink-900">
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-ink-400">{hint}</span>}
      </span>
    </div>
  );
}
