"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { IncidentStatusBadge, SeverityBadge } from "@/components/status/SafetyBadges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { auditService } from "@/services/audit";
import { filterIncidents, incidentsService } from "@/services/incidents";
import type { IncidentStatus, IncidentType } from "@/types/incident";
import type { SafetySeverity } from "@/types/safety";

export default function IncidentsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading incidents…" />}>
      <IncidentsInner />
    </Suspense>
  );
}

function IncidentsInner() {
  const { incidents, loading, safetyError, refresh } = useOps();
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const [status, setStatus] = useState<IncidentStatus | "ALL" | "OPENISH">("OPENISH");
  const [severity, setSeverity] = useState<SafetySeverity | "ALL">("ALL");
  const [type, setType] = useState<IncidentType | "ALL">("ALL");
  const [pending, setPending] = useState<"ack" | "assign" | "escalate" | "resolve" | "close" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [noteText, setNoteText] = useState("");

  const visible = useMemo(
    () => filterIncidents(incidents, { status, severity, type }),
    [incidents, status, severity, type],
  );
  const selected = useMemo(
    () => incidents.find((i) => i.id === selectedId) ?? null,
    [incidents, selectedId],
  );
  const adminId = session?.admin.id ?? "adm_001";

  async function run(kind: typeof pending, reason?: string) {
    if (!selected || !kind) return;
    setBusy(true);
    try {
      const previous = selected.status;
      let updated = null;
      if (kind === "ack") updated = await incidentsService.acknowledgeIncident(selected.id, adminId);
      if (kind === "assign") {
        updated = await incidentsService.assignIncident(selected.id, adminId, adminId);
      }
      if (kind === "escalate") {
        updated = await incidentsService.escalateIncident(selected.id, adminId);
      }
      if (kind === "resolve") {
        updated = await incidentsService.resolveIncident(
          selected.id,
          reason || "Resolved by admin",
          adminId,
        );
      }
      if (kind === "close") updated = await incidentsService.closeIncident(selected.id, adminId);
      if (updated) {
        await auditService.record({
          adminId,
          adminName: session?.admin.name ?? "Admin",
          action: `incident.${kind}`,
          targetType: "incident",
          targetId: selected.id,
          oldValue: { status: previous },
          newValue: { status: updated.status },
          reason,
        });
      }
      await refresh();
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  async function addNote() {
    if (!selected || !noteText.trim()) return;
    setBusy(true);
    try {
      const updated = await incidentsService.addIncidentNote(selected.id, noteText.trim(), adminId);
      if (updated) {
        await auditService.record({
          adminId,
          adminName: session?.admin.name ?? "Admin",
          action: "incident.note_added",
          targetType: "incident",
          targetId: selected.id,
          reason: noteText.trim().slice(0, 120),
        });
      }
      setNoteText("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (loading && incidents.length === 0) return <LoadingState label="Loading incidents…" />;
  if (safetyError && incidents.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load incident data." message={safetyError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <PageContainer width="wide" testId="incidents-page">
      <PageHeader
        title="Incidents & Reports"
        description="Operational incident workspace — not analytics."
      />

      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
          data-testid="incidents-status-filter"
        >
          <option value="OPENISH">Open / Active</option>
          <option value="ALL">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="ESCALATED">Escalated</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as typeof severity)}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
          data-testid="incidents-severity-filter"
        >
          <option value="ALL">All severity</option>
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
          data-testid="incidents-type-filter"
        >
          <option value="ALL">All types</option>
          <option value="SOS">SOS</option>
          <option value="ROUTE_DEVIATION">Route deviation</option>
          <option value="ACCIDENT">Accident</option>
          <option value="SAFETY_COMPLAINT">Safety complaint</option>
          <option value="HARASSMENT">Harassment</option>
          <option value="DRIVER_BEHAVIOR">Driver behavior</option>
          <option value="RIDER_BEHAVIOR">Rider behavior</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No incidents match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="incidents-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Incident</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Ride</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Assigned</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--bw-border)] last:border-0"
                  data-testid={`incident-row-${item.id}`}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-[var(--bw-text-muted)]">{item.id}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{item.type.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{item.rideId ?? "—"}</td>
                  <td className="px-3 py-2">
                    <IncidentStatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-2 text-xs">{item.assignedTo ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {formatIstDateTime(new Date(item.updatedAt))}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() =>
                        router.replace(`/safety/incidents?id=${item.id}`, { scroll: false })
                      }
                      data-testid={`incident-open-${item.id}`}
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
        title={selected?.title ?? "Incident"}
        onClose={() => router.replace("/safety/incidents", { scroll: false })}
      >
        {selected ? (
          <div className="space-y-4" data-testid="incident-detail">
            <div className="flex flex-wrap gap-2">
              <IncidentStatusBadge status={selected.status} />
              <SeverityBadge severity={selected.severity} />
              {selected.networkType ? <NetworkBadge network={selected.networkType} /> : null}
            </div>
            <p className="text-sm text-[var(--bw-text-secondary)]">{selected.description}</p>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Ride</dt>
                <dd>
                  {selected.rideId ? (
                    <Link
                      href={`/rides/${selected.rideId}`}
                      className="text-[var(--bw-brand)] hover:underline"
                    >
                      {selected.rideId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">People</dt>
                <dd className="space-x-1">
                  {selected.userId ? (
                    <Link
                      href={`/users/${selected.userId}`}
                      className="text-[var(--bw-brand)] hover:underline"
                    >
                      User {selected.userId}
                    </Link>
                  ) : (
                    <span>User —</span>
                  )}
                  <span>·</span>
                  <span>Driver {selected.driverId ?? "—"}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Location</dt>
                <dd>{selected.locationLabel}</dd>
              </div>
              {selected.resolution ? (
                <div>
                  <dt className="text-xs text-[var(--bw-text-muted)]">Resolution</dt>
                  <dd>{selected.resolution}</dd>
                </div>
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => setPending("ack")} data-testid="incident-acknowledge">
                Acknowledge
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPending("assign")} data-testid="incident-assign">
                Assign to me
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPending("escalate")} data-testid="incident-escalate">
                Escalate
              </Button>
              <Button size="sm" disabled={busy} onClick={() => setPending("resolve")} data-testid="incident-resolve">
                Resolve
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPending("close")}>
                Close
              </Button>
              {selected.userId ? (
                <Link
                  href={`/notifications?compose=1&userId=${encodeURIComponent(selected.userId)}`}
                >
                  <Button size="sm" variant="secondary">
                    Send Notification
                  </Button>
                </Link>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="block space-y-1 text-sm">
                <span className="text-xs text-[var(--bw-text-muted)]">Internal note</span>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 py-2 text-sm"
                />
              </label>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !noteText.trim()}
                onClick={() => void addNote()}
              >
                Add note
              </Button>
              {selected.internalNotes.length > 0 ? (
                <ul className="space-y-1 text-xs text-[var(--bw-text-secondary)]">
                  {selected.internalNotes.map((n, i) => (
                    <li key={`${i}-${n.slice(0, 12)}`}>{n}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <ol className="space-y-2 text-sm">
              {selected.timeline.map((t) => (
                <li key={t.id} className="flex justify-between gap-2 border-b border-[var(--bw-border)] py-1">
                  <span>{t.label}</span>
                  <span className="text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(t.timestamp))}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={pending === "ack" || pending === "assign" || pending === "escalate" || pending === "close"}
        title="Confirm incident action"
        description="This action is audit-logged."
        onCancel={() => setPending(null)}
        onConfirm={() => void run(pending)}
      />
      <ReasonConfirmDialog
        open={pending === "resolve"}
        title="Resolve incident"
        description="Provide resolution notes."
        onCancel={() => setPending(null)}
        onConfirm={(reason) => void run("resolve", reason)}
      />
    </PageContainer>
  );
}
