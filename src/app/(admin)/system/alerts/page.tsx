"use client";

import { useMemo, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PriorityBadge } from "@/components/status/PriorityBadge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useOps } from "@/providers/OpsProvider";
import type { OpsAlert } from "@/types/alert";

function SystemAlertsWorkspace() {
  const { alerts, loading, error, refresh, acknowledgeAlert, resolveAlert } = useOps();
  const [showAll, setShowAll] = useState(false);
  const [pending, setPending] = useState<{
    id: string;
    action: "ack" | "resolve";
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const list = showAll
      ? alerts
      : alerts.filter((a) => a.source === "system_health");
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [alerts, showAll]);

  async function confirmAction() {
    if (!pending) return;
    setActionError(null);
    try {
      if (pending.action === "ack") await acknowledgeAlert(pending.id);
      else await resolveAlert(pending.id);
      setPending(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed.");
      setPending(null);
    }
  }

  if (loading && alerts.length === 0) {
    return <LoadingState label="Loading system alerts…" />;
  }

  if (error && alerts.length === 0) {
    return (
      <div className="max-w-xl space-y-3">
        <ErrorState title="System alerts unavailable" message={error} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="system-alerts-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">System alerts</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Alerts from the shared ops alert store. Defaults to{" "}
          <code className="text-xs">system_health</code> source.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--bw-border)]"
          />
          Show all alert sources
        </label>
        <Button variant="secondary" size="sm" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      {visible.length === 0 ? (
        <EmptyState
          title="No system alerts"
          description={
            showAll
              ? "No alerts in the ops store."
              : "No system_health alerts. Toggle to show all sources."
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((alert: OpsAlert) => (
            <li
              key={alert.id}
              className={cn(
                "rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4",
                alert.priority === "critical" &&
                  alert.status !== "resolved" &&
                  "border-l-4 border-l-[var(--bw-danger)]",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={alert.priority} />
                <span className="text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
                  {alert.status}
                </span>
                <span className="text-xs text-[var(--bw-text-muted)]">{alert.source}</span>
              </div>
              <h3 className="mt-2 text-sm font-semibold">{alert.title}</h3>
              <p className="mt-1 text-sm text-[var(--bw-text-secondary)]">{alert.description}</p>
              <p className="mt-2 text-xs text-[var(--bw-text-muted)]">
                Service: {alert.relatedServiceId ?? "—"} · Created{" "}
                {formatIstDateTime(new Date(alert.createdAt))} (
                {formatRelativeTime(alert.createdAt)})
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {alert.status === "open" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    data-testid={`alert-ack-${alert.id}`}
                    onClick={() => setPending({ id: alert.id, action: "ack" })}
                  >
                    Acknowledge
                  </Button>
                ) : null}
                {alert.status !== "resolved" ? (
                  <Button
                    variant="primary"
                    size="sm"
                    data-testid={`alert-resolve-${alert.id}`}
                    onClick={() => setPending({ id: alert.id, action: "resolve" })}
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
        open={pending != null}
        title={pending?.action === "ack" ? "Acknowledge alert" : "Resolve alert"}
        description={
          pending?.action === "ack"
            ? "Mark this alert as acknowledged?"
            : "Mark this alert as resolved?"
        }
        confirmLabel={pending?.action === "ack" ? "Acknowledge" : "Resolve"}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmAction()}
      />
    </div>
  );
}

export default function SystemAlertsPage() {
  return (
    <PermissionGuard permission="system.alerts.manage">
      <SystemAlertsWorkspace />
    </PermissionGuard>
  );
}
