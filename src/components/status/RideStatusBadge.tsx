import { cn } from "@/lib/utils";
import { mapRideStatusLabel } from "@/services/rides";
import type { RideLifecycleStatus, SafetyStatus } from "@/types/ride";

export function RideStatusBadge({ status }: { status: RideLifecycleStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        status === "active" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "delayed" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "scheduled" &&
          "border-[var(--bw-info)] bg-[var(--bw-info-soft)] text-[var(--bw-info)]",
        status === "completed" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-secondary)]",
        (status === "cancelled" || status === "expired") &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
        status === "disputed" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
      )}
      data-status={status}
      data-testid="ride-status-badge"
    >
      <span aria-hidden>
        {status === "active"
          ? "●"
          : status === "delayed"
            ? "▲"
            : status === "disputed"
              ? "!"
              : "○"}
      </span>
      {mapRideStatusLabel(status)}
    </span>
  );
}

export function SafetyBadge({ status }: { status: SafetyStatus }) {
  const label =
    status === "safe"
      ? "No active safety issue"
      : status === "at_risk"
        ? "Attention required"
        : "SOS";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm",
        status === "safe" && "text-[var(--bw-success)]",
        status === "at_risk" && "text-[var(--bw-warning)]",
        status === "sos" && "text-[var(--bw-danger)]",
      )}
      data-testid="safety-badge"
      data-safety={status}
    >
      <span aria-hidden>{status === "safe" ? "🟢" : status === "at_risk" ? "🟡" : "🔴"}</span>
      {label}
    </span>
  );
}
