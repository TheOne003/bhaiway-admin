import { cn } from "@/lib/utils";

export function MapLegend({
  className,
  showSafety = false,
}: {
  className?: string;
  showSafety?: boolean;
}) {
  const items = [
    { key: "office", label: "Office", shape: "▣", color: "text-[var(--bw-office)]" },
    { key: "outstation", label: "Outstation", shape: "◇", color: "text-[var(--bw-outstation)]" },
    { key: "active", label: "Active", shape: "●", color: "text-[var(--bw-success)]" },
    { key: "delayed", label: "Delayed", shape: "▲", color: "text-[var(--bw-warning)]" },
    { key: "risk", label: "At Risk", shape: "!", color: "text-[var(--bw-danger)]" },
    ...(showSafety
      ? [
          {
            key: "sos",
            label: "SOS / Critical",
            shape: "■",
            color: "text-[var(--bw-danger)]",
          },
        ]
      : []),
  ];

  return (
    <div
      className={cn(
        "rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]/95 p-2 text-xs shadow-sm backdrop-blur",
        className,
      )}
      data-testid="map-legend"
      aria-label="Map legend"
    >
      <p className="mb-1.5 font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
        Legend
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-[var(--bw-text-secondary)]">
            <span className={cn("w-4 text-center font-semibold", item.color)} aria-hidden>
              {item.shape}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
