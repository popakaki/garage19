import Link from "next/link";
import { X } from "lucide-react";
import type { AdminToastType } from "@/lib/admin/toast";

const TOAST_STYLES: Record<AdminToastType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  danger: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

/**
 * Сообщение о результате действия. Приходит из query-параметра `toast`
 * (код из ADMIN_TOASTS), поэтому текст не подставляется из запроса.
 */
export function AdminToastBar({
  toast,
  clearHref,
  className,
}: {
  toast: { type: AdminToastType; text: string } | null;
  clearHref?: string;
  className?: string;
}) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${TOAST_STYLES[toast.type]} ${className ?? ""}`}
    >
      <span>{toast.text}</span>
      {clearHref && (
        <Link href={clearHref} className="shrink-0 opacity-60 transition-opacity hover:opacity-100" aria-label="Скрыть">
          <X className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
