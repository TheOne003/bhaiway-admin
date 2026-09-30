"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AutomationStatusBadge,
  NotificationChannelBadge,
  NotificationPriorityBadge,
} from "@/components/status/CommsBadges";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import { notificationAutomationsService } from "@/services/notificationAutomations";
import type { AutomationStatus, NotificationAutomation } from "@/types/communication";

type StatusAction = { status: AutomationStatus; label: string; testId?: string };

export default function AutomationsPage() {
  const { session } = useAuth();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Renuka Ops";

  const [automations, setAutomations] = useState<NotificationAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<StatusAction | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAutomations(await notificationAutomationsService.getAutomations());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load automations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => automations.find((a) => a.id === selectedId) ?? null,
    [automations, selectedId],
  );

  function actionsFor(a: NotificationAutomation): StatusAction[] {
    if (a.status === "ACTIVE") {
      return [{ status: "PAUSED", label: "Pause", testId: "automation-pause" }];
    }
    if (a.status === "PAUSED" || a.status === "DRAFT") {
      return [{ status: "ACTIVE", label: "Activate" }];
    }
    return [];
  }

  async function applyStatus(reason: string) {
    if (!selected || !pending) return;
    setBusy(true);
    try {
      await notificationAutomationsService.setStatus(selected.id, pending.status, {
        adminId,
        adminName,
        reason,
      });
      setPending(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Automation update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && automations.length === 0 && !error) {
    return <LoadingState label="Loading automations…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="automations-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notification automations</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Event-driven rules — pause or activate with reason.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load automations." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {automations.length === 0 ? (
        <EmptyState title="No automations." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="automations-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {automations.map((a) => (
                <tr key={a.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2.5 font-medium">{a.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{a.eventType}</td>
                  <td className="px-3 py-2.5">
                    <NotificationPriorityBadge priority={a.priority} />
                  </td>
                  <td className="px-3 py-2.5">
                    <AutomationStatusBadge status={a.status} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(a.updatedAt))}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelectedId(a.id)}
                      data-testid={`automation-open-${a.id}`}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDrawer
        open={Boolean(selected)}
        title={selected ? selected.name : "Automation"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="space-y-4" data-testid="automation-detail">
            <AutomationStatusBadge status={selected.status} />
            <dl className="grid gap-2 text-sm">
              <Row label="ID" value={selected.id} mono />
              <Row label="Description" value={selected.description} />
              <Row label="Event type" value={selected.eventType} />
              <Row label="Template" value={selected.templateId} mono />
              <Row label="Audience" value={selected.audience.type} />
              <Row label="Cooldown (s)" value={String(selected.cooldownSeconds)} />
            </dl>
            <div className="flex flex-wrap gap-1">
              {selected.channels.map((ch) => (
                <NotificationChannelBadge key={ch} channel={ch} />
              ))}
            </div>
            {selected.conditions.length > 0 ? (
              <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-elevated)] p-3 text-xs">
                <h3 className="font-semibold uppercase text-[var(--bw-text-muted)]">Conditions</h3>
                <ul className="mt-1 list-disc pl-4">
                  {selected.conditions.map((c, i) => (
                    <li key={i}>
                      {c.field} {c.op} {Array.isArray(c.value) ? c.value.join(", ") : c.value}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {actionsFor(selected).map((action) => (
                <Button
                  key={action.status}
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  data-testid={action.testId}
                  onClick={() => setPending(action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ReasonConfirmDialog
        open={Boolean(pending)}
        title={pending ? `${pending.label} automation` : "Automation action"}
        description="Automation status changes are audited."
        confirmLabel={pending?.label ?? "Confirm"}
        onCancel={() => setPending(null)}
        onConfirm={(reason) => void applyStatus(reason)}
      />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-[var(--bw-text-muted)]">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : undefined}>{value}</dd>
    </div>
  );
}
