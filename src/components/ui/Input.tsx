import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--bw-text-primary)]">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "h-10 w-full rounded-md border bg-[var(--bw-surface)] px-3 text-sm text-[var(--bw-text-primary)]",
          "placeholder:text-[var(--bw-text-muted)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bw-bg)]",
          error ? "border-[var(--bw-danger)]" : "border-[var(--bw-border)]",
          className,
        )}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="text-xs text-[var(--bw-text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-[var(--bw-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
