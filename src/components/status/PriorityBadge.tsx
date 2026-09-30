import { cn } from "@/lib/utils";
import type { AlertPriority } from "@/types/alert";
import type { ServiceHealthStatus } from "@/types/systemHealth";
import { formatServiceStatus } from "@/lib/systemHealth";

export function PriorityBadge({ priority }: { priority: AlertPriority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        priority === "critical" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        priority === "warning" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        priority === "info" &&
          "border-[var(--bw-info)] bg-[var(--bw-info-soft)] text-[var(--bw-info)]",
      )}
      data-priority={priority}
    >
      <span aria-hidden>
        {priority === "critical" ? "!" : priority === "warning" ? "▲" : "i"}
      </span>
      {priority}
    </span>
  );
}

export function ServiceStatusBadge({ status }: { status: ServiceHealthStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium",
        status === "operational" &&
          "border-[var(--bw-border)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "degraded" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "down" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        status === "not_configured" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
      )}
      data-status={status}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "operational" && "bg-[var(--bw-success)]",
          status === "degraded" && "bg-[var(--bw-warning)]",
          status === "down" && "bg-[var(--bw-danger)]",
          status === "not_configured" && "bg-[var(--bw-text-muted)]",
        )}
        aria-hidden
      />
      {formatServiceStatus(status)}
    </span>
  );
}
