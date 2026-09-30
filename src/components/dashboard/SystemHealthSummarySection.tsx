import Link from "next/link";
import { SystemHealthBadge } from "@/components/status/SystemHealthBadge";
import { overallStatusLabel } from "@/lib/systemHealth";
import type { SystemHealthSummary } from "@/types/systemHealth";

interface SystemHealthSummarySectionProps {
  health: SystemHealthSummary;
}

export function SystemHealthSummarySection({ health }: SystemHealthSummarySectionProps) {
  const counts = [
    { label: "Operational", value: health.counts.operational },
    { label: "Degraded", value: health.counts.degraded },
    { label: "Down", value: health.counts.down },
    { label: "Not Configured", value: health.counts.notConfigured },
  ];

  return (
    <section aria-labelledby="health-summary-heading" data-testid="health-summary">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="health-summary-heading"
          className="text-sm font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]"
        >
          System Health
        </h2>
        <Link
          href="/system-health"
          className="text-sm font-medium text-[var(--bw-brand)] hover:underline"
          data-testid="health-summary-link"
        >
          View details
        </Link>
      </div>

      <Link
        href="/system-health"
        className="block rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4 transition-colors hover:bg-[var(--bw-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
      >
        <div className="flex flex-wrap items-center gap-3">
          <SystemHealthBadge status={health.overall} />
          <span className="text-sm text-[var(--bw-text-secondary)]">
            {overallStatusLabel(health.overall)}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {counts.map((item) => (
            <div key={item.label}>
              <dt className="text-xs text-[var(--bw-text-muted)]">{item.label}</dt>
              <dd className="text-lg font-semibold tabular-nums text-[var(--bw-text-primary)]">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </Link>
    </section>
  );
}
