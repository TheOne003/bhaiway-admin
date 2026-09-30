import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--bw-brand)] text-white hover:bg-[var(--bw-brand-hover)] disabled:bg-[var(--bw-brand)]/50",
  secondary:
    "border border-[var(--bw-border)] bg-[var(--bw-surface)] text-[var(--bw-text-primary)] hover:bg-[var(--bw-elevated)]",
  ghost: "text-[var(--bw-text-secondary)] hover:bg-[var(--bw-elevated)] hover:text-[var(--bw-text-primary)]",
  danger: "bg-[var(--bw-danger)] text-white hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bw-bg)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="text-xs">Working…</span> : children}
    </button>
  );
}
