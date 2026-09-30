import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** Default operational width; use "wide" for dense tables */
  width?: "default" | "wide" | "narrow";
  testId?: string;
}

/** Controlled content width so pages do not stretch edge-to-edge. */
export function PageContainer({
  children,
  className,
  width = "default",
  testId,
}: PageContainerProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "mx-auto w-full space-y-4",
        width === "narrow" && "max-w-3xl",
        width === "default" && "max-w-5xl",
        width === "wide" && "max-w-6xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--bw-border)] bg-[var(--bw-surface)] px-4 py-3 shadow-sm">
      <div className="min-w-0 space-y-0.5 border-l-4 border-[var(--bw-brand)] pl-3">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--bw-text-primary)]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[var(--bw-text-secondary)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">{children}</dl>
  );
}

export type KpiTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

const KPI_TONE: Record<KpiTone, string> = {
  brand:
    "border-[var(--bw-brand)]/35 bg-[var(--bw-brand-soft)] shadow-[inset_3px_0_0_0_var(--bw-brand)]",
  success:
    "border-[var(--bw-success)]/35 bg-[var(--bw-success-soft)] shadow-[inset_3px_0_0_0_var(--bw-success)]",
  warning:
    "border-[var(--bw-warning)]/35 bg-[var(--bw-warning-soft)] shadow-[inset_3px_0_0_0_var(--bw-warning)]",
  danger:
    "border-[var(--bw-danger)]/35 bg-[var(--bw-danger-soft)] shadow-[inset_3px_0_0_0_var(--bw-danger)]",
  info: "border-[var(--bw-info)]/35 bg-[var(--bw-info-soft)] shadow-[inset_3px_0_0_0_var(--bw-info)]",
  neutral: "border-[var(--bw-border)] bg-[var(--bw-surface)] shadow-[inset_3px_0_0_0_var(--bw-brand-muted)]",
};

const KPI_VALUE_TONE: Record<KpiTone, string> = {
  brand: "text-[var(--bw-brand)]",
  success: "text-[var(--bw-success)]",
  warning: "text-[var(--bw-warning)]",
  danger: "text-[var(--bw-danger)]",
  info: "text-[var(--bw-info)]",
  neutral: "text-[var(--bw-text-primary)]",
};

export function KpiCard({
  label,
  value,
  hint,
  testId,
  tone = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  testId?: string;
  tone?: KpiTone;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 transition-shadow hover:shadow-md",
        KPI_TONE[tone],
      )}
      data-testid={testId}
    >
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
        {label}
      </dt>
      <dd className={cn("mt-0.5 text-lg font-bold tabular-nums tracking-tight", KPI_VALUE_TONE[tone])}>
        {value}
      </dd>
      {hint ? <p className="text-[11px] text-[var(--bw-text-muted)]">{hint}</p> : null}
    </div>
  );
}
