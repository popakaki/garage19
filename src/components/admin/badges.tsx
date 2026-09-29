import type { ReactNode } from "react";
import {
  CALLBACK_STATUSES,
  IMPORT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  REVIEW_STATUSES,
  USER_ROLES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Статус-бейджи на основе словарей из @/lib/constants
 * (в БД может оказаться неизвестное значение — показываем его как есть).
 */

export type BadgeTone = "default" | "brand" | "success" | "warning" | "danger" | "info" | "dark" | "outline";

const TONES: Record<BadgeTone, string> = {
  default: "bg-ink-100 text-ink-700",
  brand: "bg-brand-100 text-brand-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  dark: "bg-ink-900 text-white",
  outline: "border border-ink-200 text-ink-600",
};

export function StatusBadge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const ORDER_TONES: Record<string, BadgeTone> = {
  new: "brand",
  confirmed: "info",
  assembling: "warning",
  shipped: "info",
  done: "success",
  canceled: "default",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES] ?? status;
  return <StatusBadge tone={ORDER_TONES[status] ?? "default"}>{label}</StatusBadge>;
}

const PAYMENT_TONES: Record<string, BadgeTone> = {
  pending: "warning",
  paid: "success",
  refunded: "info",
  failed: "danger",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const label = PAYMENT_STATUSES[status as keyof typeof PAYMENT_STATUSES] ?? status;
  return <StatusBadge tone={PAYMENT_TONES[status] ?? "default"}>{label}</StatusBadge>;
}

const REVIEW_TONES: Record<string, BadgeTone> = {
  pending: "warning",
  published: "success",
  rejected: "danger",
};

export function ReviewStatusBadge({ status }: { status: string }) {
  const label = REVIEW_STATUSES[status as keyof typeof REVIEW_STATUSES] ?? status;
  return <StatusBadge tone={REVIEW_TONES[status] ?? "default"}>{label}</StatusBadge>;
}

const CALLBACK_TONES: Record<string, BadgeTone> = {
  new: "brand",
  in_progress: "warning",
  done: "success",
  spam: "default",
};

export function CallbackStatusBadge({ status }: { status: string }) {
  const label = CALLBACK_STATUSES[status as keyof typeof CALLBACK_STATUSES] ?? status;
  return <StatusBadge tone={CALLBACK_TONES[status] ?? "default"}>{label}</StatusBadge>;
}

const IMPORT_TONES: Record<string, BadgeTone> = {
  pending: "warning",
  running: "info",
  done: "success",
  failed: "danger",
};

export function ImportStatusBadge({ status }: { status: string }) {
  const label = IMPORT_STATUSES[status as keyof typeof IMPORT_STATUSES] ?? status;
  return <StatusBadge tone={IMPORT_TONES[status] ?? "default"}>{label}</StatusBadge>;
}

const ROLE_TONES: Record<string, BadgeTone> = {
  admin: "dark",
  manager: "info",
  customer: "default",
};

export function RoleBadge({ role }: { role: string }) {
  const label = USER_ROLES[role as keyof typeof USER_ROLES] ?? role;
  return <StatusBadge tone={ROLE_TONES[role] ?? "default"}>{label}</StatusBadge>;
}

export function ActiveBadge({ active, activeText = "Активен", inactiveText = "Отключён" }: { active: boolean; activeText?: string; inactiveText?: string }) {
  return <StatusBadge tone={active ? "success" : "default"}>{active ? activeText : inactiveText}</StatusBadge>;
}

export function StockCell({ stock, reserved = 0 }: { stock: number; reserved?: number }) {
  const available = stock - reserved;
  if (stock <= 0) return <StatusBadge tone="danger">Нет: 0</StatusBadge>;
  if (available <= 3) return <StatusBadge tone="warning">Мало: {stock}</StatusBadge>;
  return <StatusBadge tone="success">{stock}</StatusBadge>;
}

/** Простой «звёздный» рейтинг для списков. */
export function MiniRating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink-600">
      <span className="text-amber-500" aria-hidden>
        ★
      </span>
      <span className="font-semibold">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-ink-400">({count})</span>}
    </span>
  );
}
