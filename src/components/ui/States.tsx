import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border border-dashed border-[var(--bw-border)] bg-[var(--bw-surface)] p-8",
        className,
      )}
      data-testid="empty-state"
    >
      <h2 className="text-base font-semibold text-[var(--bw-text-primary)]">{title}</h2>
      {description ? (
        <p className="max-w-md text-sm text-[var(--bw-text-secondary)]">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Loading…", className }: LoadingStateProps) {
  return (
    <div
      className={cn("flex items-center gap-3 p-6 text-sm text-[var(--bw-text-secondary)]", className)}
      role="status"
      data-testid="loading-state"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--bw-brand)]" aria-hidden />
      {label}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] p-6",
        className,
      )}
      role="alert"
      data-testid="error-state"
    >
      <h2 className="text-sm font-semibold text-[var(--bw-danger)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--bw-text-secondary)]">{message}</p>
    </div>
  );
}
