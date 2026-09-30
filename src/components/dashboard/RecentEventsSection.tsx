import Link from "next/link";
import { EmptyState } from "@/components/ui/States";
import { formatIstTime } from "@/lib/format";
import type { OpsTimelineEvent } from "@/types/dashboard";

interface RecentEventsSectionProps {
  events: OpsTimelineEvent[];
}

export function RecentEventsSection({ events }: RecentEventsSectionProps) {
  return (
    <section aria-labelledby="recent-events-heading" data-testid="recent-events">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="recent-events-heading"
          className="text-sm font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]"
        >
          Recent Operational Events
        </h2>
        <Link href="/alerts" className="text-sm font-medium text-[var(--bw-brand)] hover:underline">
          View all alerts
        </Link>
      </div>

      {events.length === 0 ? (
        <EmptyState title="No recent events" description="Operational timeline is empty." />
      ) : (
        <ol className="space-y-3 border-l border-[var(--bw-border)] pl-4">
          {events.map((event) => (
            <li key={event.id} className="relative" data-testid="timeline-event">
              <span
                className="absolute -left-[1.28rem] top-1.5 h-2 w-2 rounded-full bg-[var(--bw-brand)]"
                aria-hidden
              />
              <p className="text-xs tabular-nums text-[var(--bw-text-muted)]">
                {formatIstTime(new Date(event.timestamp))}
              </p>
              {event.href ? (
                <Link
                  href={event.href}
                  className="text-sm text-[var(--bw-text-primary)] hover:underline"
                >
                  {event.title}
                </Link>
              ) : (
                <p className="text-sm text-[var(--bw-text-primary)]">{event.title}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
