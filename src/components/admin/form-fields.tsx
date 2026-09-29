import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Поля форм админки. Оборачивают примитивы из @/components/ui и добавляют
 * единый заголовок секции и сетку. Все элементы — обычные input/select/textarea,
 * поэтому формы работают без JavaScript.
 */

export function FormSection({
  title,
  description,
  columns = 2,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}) {
  const grid = columns === 1 ? "grid-cols-1" : columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2";
  return (
    <section className={cn("border-b border-ink-100 px-5 py-5 last:border-0", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-ink-900">{title}</h3>
        {description && <p className="mt-1 text-xs text-ink-500">{description}</p>}
      </div>
      <div className={cn("grid gap-4", grid)}>{children}</div>
    </section>
  );
}

export function AdminField({
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

const INPUT_CLASS = "g19-input";
const INVALID_CLASS = "border-danger-500 focus:border-danger-500";

export function TextField({
  label,
  hint,
  error,
  id,
  name,
  wrapperClassName,
  invalid,
  ...rest
}: ComponentProps<"input"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
  invalid?: boolean;
}) {
  const inputId = id ?? name;
  return (
    <AdminField label={label} hint={hint} error={error} required={rest.required} htmlFor={inputId} className={wrapperClassName}>
      <input id={inputId} name={name} className={cn(INPUT_CLASS, invalid && INVALID_CLASS)} {...rest} />
    </AdminField>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  id,
  name,
  wrapperClassName,
  rows = 4,
  ...rest
}: ComponentProps<"textarea"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}) {
  const inputId = id ?? name;
  return (
    <AdminField label={label} hint={hint} error={error} required={rest.required} htmlFor={inputId} className={wrapperClassName}>
      <textarea id={inputId} name={name} rows={rows} className={cn(INPUT_CLASS, "min-h-24 leading-relaxed")} {...rest} />
    </AdminField>
  );
}

export function SelectField({
  label,
  hint,
  error,
  id,
  name,
  wrapperClassName,
  placeholder,
  options,
  children,
  ...rest
}: ComponentProps<"select"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
}) {
  const inputId = id ?? name;
  return (
    <AdminField label={label} hint={hint} error={error} required={rest.required} htmlFor={inputId} className={wrapperClassName}>
      <select id={inputId} name={name} className={cn(INPUT_CLASS, "cursor-pointer")} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    </AdminField>
  );
}

/**
 * Чекбокс с hidden-полем: значение всегда отправляется ("1" или ""),
 * поэтому снятая галочка корректно сохраняется как false.
 */
export function CheckboxField({
  label,
  hint,
  name,
  defaultChecked,
  value = "on",
  wrapperClassName,
  checkboxClassName,
}: {
  label: ReactNode;
  hint?: ReactNode;
  name: string;
  defaultChecked?: boolean;
  value?: string;
  wrapperClassName?: string;
  checkboxClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-end gap-1", wrapperClassName)}>
      <input type="hidden" name={name} value="" />
      <label className={cn("flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-700", checkboxClassName)}>
        <input
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={defaultChecked}
          className="size-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
        />
        {label}
      </label>
      {hint && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function PriceField({
  label = "Цена, ₽",
  name,
  value,
  hint,
  error,
  required,
  wrapperClassName,
}: {
  label?: ReactNode;
  name: string;
  value: string | number | null | undefined;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  wrapperClassName?: string;
}) {
  return (
    <AdminField label={label} hint={hint ?? "В рублях, например 4990 или 4990,50"} error={error} required={required} htmlFor={name} className={wrapperClassName}>
      <input
        id={name}
        name={name}
        type="text"
        inputMode="decimal"
        defaultValue={value ?? ""}
        className={cn(INPUT_CLASS, error && INVALID_CLASS)}
      />
    </AdminField>
  );
}

export function NumberField(props: ComponentProps<"input"> & { label?: ReactNode; hint?: ReactNode; error?: ReactNode; wrapperClassName?: string }) {
  const { type = "number", ...rest } = props;
  return <TextField type={type} inputMode="numeric" {...rest} />;
}

export function FormGrid({ columns = 2, children }: { columns?: 1 | 2 | 3; children: ReactNode }) {
  const grid = columns === 1 ? "grid-cols-1" : columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2";
  return <div className={cn("grid gap-4", grid)}>{children}</div>;
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4", className)}>
      {children}
    </div>
  );
}

export function HiddenId({ name = "id", value }: { name?: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}
