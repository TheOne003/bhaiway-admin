import { cn } from "@/lib/utils";
import type { OverallSystemStatus } from "@/types/systemHealth";

const LABELS: Record<OverallSystemStatus, string> = {
  all_operational: "All Systems Operational",
  degraded: "Systems Degraded",
  critical: "Critical System Issue",
};

interface SystemHealthBadgeProps {
  status: OverallSystemStatus;
  className?: string;
}

export function SystemHealthBadge({ status, className }: SystemHealthBadgeProps) {
  const isCritical = status === "critical";
  const isDegraded = status === "degraded";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium",
        isCritical &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        isDegraded &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        !isCritical &&
          !isDegraded &&
          "border-[var(--bw-border)] bg-[var(--bw-surface)] text-[var(--bw-text-secondary)]",
        className,
      )}
      role="status"
      data-testid="system-health-badge"
      data-status={status}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isCritical && "bg-[var(--bw-danger)]",
          isDegraded && "bg-[var(--bw-warning)]",
          !isCritical && !isDegraded && "bg-[var(--bw-success)]",
        )}
        aria-hidden
      />
      <span>
        {isCritical ? "Critical" : isDegraded ? "Degraded" : "Operational"}
        <span className="sr-only">: {LABELS[status]}</span>
      </span>
      <span className="hidden sm:inline" aria-hidden>
        {LABELS[status]}
      </span>
    </div>
  );
}
