import type { ActiveNowMetrics } from "@/types/dashboard";
import { formatRelativeTime } from "@/lib/format";

interface ActiveNowSectionProps {
  metrics: ActiveNowMetrics;
}

export function ActiveNowSection({ metrics }: ActiveNowSectionProps) {
  const items = [
    { label: "Active Rides", value: metrics.activeRides, context: "Live now" },
    { label: "Active Drivers", value: metrics.activeDrivers, context: "Online" },
    {
      label: "Active Passengers",
      value: metrics.activePassengers,
      context: "In active rides",
    },
  ];

  return (
    <section aria-labelledby="active-now-heading" data-testid="active-now">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="active-now-heading" className="text-sm font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
          Active Now
        </h2>
        <p className="text-xs text-[var(--bw-text-muted)]">
          Updated {formatRelativeTime(metrics.updatedAt)}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map((item, index) => {
          const tones = [
            "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)]",
            "border-[var(--bw-success)] bg-[var(--bw-success-soft)]",
            "border-[var(--bw-info)] bg-[var(--bw-info-soft)]",
          ] as const;
          const valueTones = [
            "text-[var(--bw-brand)]",
            "text-[var(--bw-success)]",
            "text-[var(--bw-info)]",
          ] as const;
          return (
            <div
              key={item.label}
              className={`rounded-lg border px-3 py-3 shadow-sm ${tones[index % tones.length]}`}
              data-testid={`metric-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
                {item.label}
              </p>
              <p
                className={`mt-1 text-2xl font-bold tabular-nums ${valueTones[index % valueTones.length]}`}
              >
                {item.value}
              </p>
              <p className="text-xs text-[var(--bw-text-secondary)]">{item.context}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
