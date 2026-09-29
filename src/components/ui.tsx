import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn, discountPercent, formatPrice, productWord } from "@/lib/utils";

/**
 * Базовые UI-примитивы проекта.
 * Файл не содержит "use client" — компоненты одинаково работают
 * и в серверных, и в клиентских деревьях.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Раскладка
// ─────────────────────────────────────────────────────────────────────────────

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("g19-container", className)}>{children}</div>;
}

export function Section({
  children,
  title,
  subtitle,
  action,
  className,
  headerClassName,
  id,
}: {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  headerClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-10 lg:py-14", className)}>
      <Container>
        {(title || action) && (
          <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", headerClassName)}>
            <div>
              {title && <h2 className="text-2xl font-bold text-ink-900 lg:text-3xl">{title}</h2>}
              {subtitle && <p className="mt-2 max-w-3xl text-sm text-ink-500 lg:text-base">{subtitle}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}

export function Card({ children, className, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cn("g19-card", className)} {...rest}>
      {children}
    </div>
  );
}

export function PanelCard({
  children,
  title,
  description,
  footer,
  className,
  id,
}: {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <Card id={id} className={cn("scroll-mt-28 overflow-hidden", className)}>
      {(title || description) && (
        <div className="border-b border-ink-100 px-5 py-4">
          {title && <h3 className="text-base font-semibold text-ink-900">{title}</h3>}
          {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-3">{footer}</div>}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Кнопки
// ─────────────────────────────────────────────────────────────────────────────

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2";

const BUTTON_VARIANTS = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
  secondary: "bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950",
  outline: "border border-ink-200 bg-white text-ink-800 hover:border-ink-300 hover:bg-ink-50",
  ghost: "text-ink-700 hover:bg-ink-100",
  danger: "bg-danger-600 text-white hover:bg-danger-500",
  success: "bg-success-600 text-white hover:bg-success-500",
  link: "text-brand-700 hover:text-brand-800 underline px-0",
} as const;

const BUTTON_SIZES = {
  xs: "px-2.5 py-1.5 text-xs",
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
  xl: "px-7 py-3.5 text-base",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof BUTTON_SIZES }) {
  return (
    <button className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  prefetch,
  target,
  rel,
}: {
  variant?: ButtonVariant;
  size?: keyof typeof BUTTON_SIZES;
  className?: string;
  href: string;
  children: ReactNode;
  prefetch?: boolean;
  target?: string;
  rel?: string;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      target={target}
      rel={rel}
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
    >
      {children}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Формы
// ─────────────────────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="g19-label" htmlFor={htmlFor}>
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-danger-600">{error}</p>}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn("g19-input", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn("g19-input min-h-24", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cn("g19-input cursor-pointer pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({ label, className, ...rest }: ComponentProps<"input"> & { label?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2 text-sm text-ink-700", className)}>
      <input
        type="checkbox"
        className="size-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
        {...rest}
      />
      {label}
    </label>
  );
}

export function Switch({ label, className, checked, ...rest }: ComponentProps<"input"> & { label?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-3 text-sm text-ink-700", className)}>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} {...rest} />
        <span className="block h-6 w-11 rounded-full bg-ink-200 transition-colors peer-checked:bg-brand-600" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      {label}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Отображение данных
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_VARIANTS = {
  default: "bg-ink-100 text-ink-700",
  brand: "bg-brand-100 text-brand-800",
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-500",
  danger: "bg-danger-50 text-danger-600",
  info: "bg-blue-50 text-blue-700",
  dark: "bg-ink-900 text-white",
  outline: "border border-ink-200 text-ink-600",
} as const;

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof BADGE_VARIANTS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold",
        BADGE_VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Price({
  price,
  oldPrice,
  size = "md",
  from,
  className,
}: {
  price: number;
  oldPrice?: number | null;
  size?: "sm" | "md" | "lg" | "xl";
  from?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-3xl",
  } as const;
  const percent = discountPercent(price, oldPrice);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("font-bold text-ink-900", sizes[size])}>{formatPrice(price, { from })}</span>
      {percent > 0 && (
        <>
          <span className="text-sm text-ink-400 line-through">{formatPrice(oldPrice)}</span>
          <Badge variant="danger">−{percent}%</Badge>
        </>
      )}
    </div>
  );
}

export function Rating({
  value,
  count,
  size = "md",
  showValue = true,
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}) {
  const starSize = size === "sm" ? "text-xs" : "text-sm";
  const rounded = Math.round(value * 2) / 2;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className={cn("tracking-tight text-amber-500", starSize)} aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>{rounded >= star ? "★" : rounded >= star - 0.5 ? "⯪" : "☆"}</span>
        ))}
      </span>
      {showValue && <span className={cn("font-semibold text-ink-700", starSize)}>{value.toFixed(1)}</span>}
      {count !== undefined && count > 0 && (
        <span className={cn("text-ink-400", starSize)}>({count})</span>
      )}
    </div>
  );
}

export function StockBadge({ stock, unit = "шт" }: { stock: number; unit?: string }) {
  if (stock > 10) return <Badge variant="success">В наличии: {stock} {unit}</Badge>;
  if (stock > 0) return <Badge variant="warning">Мало: {stock} {unit}</Badge>;
  return <Badge variant="default">Под заказ</Badge>;
}

export function CountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function ProductCountLabel({ count }: { count: number }) {
  return (
    <span className="text-sm text-ink-500">
      {count} {productWord(count)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Навигация
// ─────────────────────────────────────────────────────────────────────────────

export type Crumb = { name: string; href?: string };

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Хлебные крошки" className={cn("flex flex-wrap items-center gap-1.5 text-xs text-ink-500", className)}>
      <Link href="/" className="hover:text-brand-700">
        Главная
      </Link>
      {items.map((item, index) => (
        <span key={`${item.name}-${index}`} className="flex items-center gap-1.5">
          <span className="text-ink-300">/</span>
          {item.href && index < items.length - 1 ? (
            <Link href={item.href} className="hover:text-brand-700">
              {item.name}
            </Link>
          ) : (
            <span className="text-ink-700">{item.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Pagination({
  page,
  totalPages,
  buildHref,
  className,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  const push = (value: number | "…") => pages.push(value);
  const window = 1;
  for (let current = 1; current <= totalPages; current += 1) {
    if (current === 1 || current === totalPages || Math.abs(current - page) <= window) {
      push(current);
    } else if (pages[pages.length - 1] !== "…") {
      push("…");
    }
  }

  return (
    <nav className={cn("flex flex-wrap items-center justify-center gap-1.5", className)} aria-label="Пагинация">
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
        >
          ← Назад
        </Link>
      )}
      {pages.map((item, index) =>
        item === "…" ? (
          <span key={`gap-${index}`} className="px-2 text-ink-400">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "min-w-10 rounded-lg border px-3 py-2 text-center text-sm font-semibold",
              item === page
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700",
            )}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link
          href={buildHref(page + 1)}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
        >
          Вперёд →
        </Link>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Состояния
// ─────────────────────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center",
        className,
      )}
    >
      {icon && <div className="mb-3 text-ink-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const ALERT_VARIANTS = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
} as const;

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: keyof typeof ALERT_VARIANTS;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", ALERT_VARIANTS[variant], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-1")}>{children}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600",
        className,
      )}
      role="status"
      aria-label="Загрузка"
    />
  );
}

export function Progress({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-ink-100", className)}>
      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Текстовый блок со стилями для HTML-контента из админки. */
export function Prose({ html, className }: { html: string; className?: string }) {
  return <div className={cn("g19-prose", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Заголовок страницы-«героя» для внутренних разделов. */
export function PageHero({
  title,
  description,
  breadcrumbs,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-ink-100 bg-white">
      <Container className="py-6 lg:py-8">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-3" />}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink-900 lg:text-3xl">{title}</h1>
            {description && <p className="mt-2 max-w-3xl text-sm text-ink-500 lg:text-base">{description}</p>}
          </div>
          {children}
        </div>
      </Container>
    </div>
  );
}
