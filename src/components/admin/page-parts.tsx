import Link from "next/link";
import type { ReactNode } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Заголовок страницы админки, кнопка подтверждения удаления и вспомогательные
 * элементы. Всё работает без JavaScript: подтверждение — <details>,
 * удаление — обычная форма с POST.
 */

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 lg:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminCard({
  title,
  description,
  actions,
  children,
  padded = true,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("g19-card overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-bold text-ink-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && "px-5 py-4")}>{children}</div>
    </section>
  );
}

/**
 * Подтверждение удаления. Показывает кнопку, по клику раскрывает
 * подтверждение с реальной кнопкой отправки формы.
 */
export function ConfirmButton({
  action,
  id,
  idName = "id",
  label = "Удалить",
  confirmLabel = "Подтвердить",
  title = "Удалить запись?",
  description = "Действие необратимо.",
  hiddenFields,
  variant = "icon",
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  idName?: string;
  label?: string;
  confirmLabel?: string;
  title?: string;
  description?: string;
  hiddenFields?: Record<string, string>;
  variant?: "icon" | "button";
  className?: string;
}) {
  const formAction = action.bind(null);
  return (
    <details className="group relative inline-block text-left">
      <summary
        className={cn(
          "inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg font-semibold transition-colors",
          variant === "icon"
            ? "p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
            : "border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50",
          className,
        )}
        title={label}
      >
        <Trash2 className="size-4" aria-hidden />
        {variant === "button" && <span>{label}</span>}
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-ink-200 bg-white p-3 shadow-lg">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
          <TriangleAlert className="size-4 text-red-500" aria-hidden />
          {title}
        </p>
        <p className="mt-1 text-xs text-ink-500">{description}</p>
        <form action={formAction} className="mt-3 flex items-center justify-end gap-2">
          <input type="hidden" name={idName} value={id} />
          {hiddenFields &&
            Object.entries(hiddenFields).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
          <button
            type="submit"
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500"
          >
            {confirmLabel}
          </button>
        </form>
      </div>
    </details>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  name,
  value,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "danger" | "success";
  size?: "xs" | "sm" | "md";
  className?: string;
  name?: string;
  value?: string;
}) {
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-ink-900 text-white hover:bg-ink-800",
    outline: "border border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
    danger: "bg-red-600 text-white hover:bg-red-500",
    success: "bg-emerald-600 text-white hover:bg-emerald-500",
  } as const;
  const sizes = {
    xs: "px-2.5 py-1.5 text-xs",
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
  } as const;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function InlineLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("font-semibold text-brand-700 hover:text-brand-800", className)}>
      {children}
    </Link>
  );
}

/** Простая CSS-диаграмма (без сторонних библиотек). */
export function BarChart({
  data,
  height = 140,
  valueFormatter,
  className,
  emptyText = "Нет данных за период",
}: {
  data: { label: string; value: number; hint?: string; highlight?: boolean }[];
  height?: number;
  valueFormatter?: (value: number) => string;
  className?: string;
  emptyText?: string;
}) {
  const max = Math.max(1, ...data.map((point) => point.value));
  if (data.length === 0 || data.every((point) => point.value === 0)) {
    return <p className={cn("py-6 text-center text-sm text-ink-400", className)}>{emptyText}</p>;
  }
  return (
    <div className={className}>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((point, index) => {
          const percent = Math.max(point.value > 0 ? 4 : 0, Math.round((point.value / max) * 100));
          return (
            <div key={`${point.label}-${index}`} className="group relative flex h-full flex-1 items-end">
              <div
                className={cn(
                  "w-full rounded-t transition-colors",
                  point.highlight ? "bg-brand-600" : "bg-brand-300 group-hover:bg-brand-500",
                )}
                style={{ height: `${percent}%` }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2 py-1 text-[11px] font-medium text-white group-hover:block">
                {point.label}: {valueFormatter ? valueFormatter(point.value) : point.value}
                {point.hint ? ` · ${point.hint}` : ""}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-400">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** Горизонтальные полосы: распределение заказов по статусам и т.п. */
export function BarList({
  items,
  valueFormatter,
  className,
}: {
  items: { label: string; value: number; href?: string; tone?: string }[];
  valueFormatter?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-ink-700">{item.label}</span>
            <span className="font-semibold text-ink-900">
              {valueFormatter ? valueFormatter(item.value) : item.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn("h-full rounded-full", item.tone ?? "bg-brand-500")}
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
