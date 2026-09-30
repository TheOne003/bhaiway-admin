import Link from "next/link";
import { PriorityBadge } from "@/components/status/PriorityBadge";
import { EmptyState } from "@/components/ui/States";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AttentionItem } from "@/types/dashboard";

interface NeedsAttentionSectionProps {
  items: AttentionItem[];
}

export function NeedsAttentionSection({ items }: NeedsAttentionSectionProps) {
  return (
    <section aria-labelledby="needs-attention-heading" data-testid="needs-attention">
      <h2
        id="needs-attention-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]"
      >
        Needs Attention
      </h2>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing needs attention"
          description="No critical or warning items right now."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4",
                item.priority === "critical" &&
                  "border-[var(--bw-danger)] border-l-4 bg-[var(--bw-danger-soft)] shadow-sm",
                item.priority === "warning" &&
                  "border-[var(--bw-warning)]/50 border-l-4 bg-[var(--bw-warning-soft)] shadow-sm",
                item.priority === "info" &&
                  "border-[var(--bw-brand)]/40 border-l-4 bg-[var(--bw-brand-soft)] shadow-sm",
              )}
              data-testid="attention-item"
              data-priority={item.priority}
            >
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={item.priority} />
                <span className="text-xs text-[var(--bw-text-muted)]">{item.source}</span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-[var(--bw-text-primary)]">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--bw-text-secondary)]">{item.description}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[var(--bw-text-muted)]">
                  {formatRelativeTime(item.timestamp)}
                </span>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-[var(--bw-brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
                >
                  {item.actionLabel}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
