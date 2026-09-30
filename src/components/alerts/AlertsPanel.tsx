"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PriorityBadge } from "@/components/status/PriorityBadge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/States";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { filterAlerts } from "@/services/alerts";
import type { AlertFilter, OpsAlert } from "@/types/alert";

const FILTERS: { id: AlertFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "warning", label: "Warning" },
  { id: "info", label: "Info" },
  { id: "unread", label: "Unread" },
  { id: "resolved", label: "Resolved" },
];

interface AlertsPanelProps {
  alerts: OpsAlert[];
  onAcknowledge: (id: string) => Promise<void>;
  onResolve: (id: string) => Promise<void>;
}

export function AlertsPanel({ alerts, onAcknowledge, onResolve }: AlertsPanelProps) {
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [pending, setPending] = useState<{ id: string; action: "ack" | "resolve" } | null>(
    null,
  );

  const visible = useMemo(() => filterAlerts(alerts, filter), [alerts, filter]);

  return (
    <div data-testid="alerts-panel">
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Alert filters"
        data-testid="alert-filters"
      >
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              filter === item.id
                ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
                : "border-[var(--bw-border)] text-[var(--bw-text-secondary)] hover:bg-[var(--bw-elevated)]",
            )}
            data-testid={`alert-filter-${item.id}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No alerts" description="No alerts match this filter." />
      ) : (
        <ul className="space-y-3">
          {visible.map((alert) => (
            <li
              key={alert.id}
              className={cn(
                "rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4",
                alert.priority === "critical" &&
                  alert.status !== "resolved" &&
                  "border-l-4 border-l-[var(--bw-danger)]",
              )}
              data-testid="alert-row"
              data-alert-id={alert.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={alert.priority} />
                <span className="text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
                  {alert.status}
                </span>
                {!alert.read ? (
                  <span className="rounded bg-[var(--bw-brand-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--bw-brand)]">
                    Unread
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 text-sm font-semibold text-[var(--bw-text-primary)]">
                {alert.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--bw-text-secondary)]">{alert.description}</p>
              <p className="mt-2 text-xs text-[var(--bw-text-muted)]">
                {alert.source} · {formatRelativeTime(alert.createdAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {alert.href ? (
                  <Link href={alert.href}>
                    <Button variant="secondary" size="sm">
                      Open
                    </Button>
                  </Link>
                ) : null}
                {alert.status === "open" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPending({ id: alert.id, action: "ack" })}
                    data-testid={`ack-${alert.id}`}
                  >
                    Acknowledge
                  </Button>
                ) : null}
                {alert.status !== "resolved" ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setPending({ id: alert.id, action: "resolve" })}
                    data-testid={`resolve-${alert.id}`}
                  >
                    Resolve
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.action === "resolve" ? "Resolve alert?" : "Acknowledge alert?"}
        description={
          pending?.action === "resolve"
            ? "This marks the alert as resolved. Continue?"
            : "This marks the alert as acknowledged. Continue?"
        }
        confirmLabel={pending?.action === "resolve" ? "Resolve" : "Acknowledge"}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          if (pending.action === "ack") await onAcknowledge(pending.id);
          else await onResolve(pending.id);
          setPending(null);
        }}
      />
    </div>
  );
}
