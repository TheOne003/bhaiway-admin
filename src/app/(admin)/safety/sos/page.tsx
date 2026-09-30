"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SosDetailPanel } from "@/components/safety/SosDetailPanel";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { SeverityBadge, SosStatusBadge } from "@/components/status/SafetyBadges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { auditService } from "@/services/audit";
import { safetyService } from "@/services/safety";
import type { SafetySeverity } from "@/types/safety";
import type { RideNetwork } from "@/types/network";
import type { SOSRecord, SOSStatus } from "@/types/sos";

export default function SosPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading SOS queue…" />}>
      <SosPageInner />
    </Suspense>
  );
}

function SosPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("sos");
  const { session } = useAuth();
  const { users, refresh } = useOps();

  const [cases, setCases] = useState<SOSRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SOSStatus | "ALL" | "ACTIVE">("ACTIVE");
  const [severity, setSeverity] = useState<SafetySeverity | "ALL">("ALL");
  const [network, setNetwork] = useState<RideNetwork | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [ackId, setAckId] = useState<string | null>(null);
  const [respondId, setRespondId] = useState<string | null>(null);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [falseId, setFalseId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);

  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await safetyService.getSOSCases({
        status,
        severity,
        networkType: network,
        search,
      });
      setCases(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load SOS cases.");
    } finally {
      setLoading(false);
    }
  }, [status, severity, network, search]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => cases.find((c) => c.id === selectedId) ?? null,
    [cases, selectedId],
  );

  const userName = useCallback(
    (id: string) => users.find((u) => u.id === id)?.name ?? id,
    [users],
  );

  function openDetail(id: string) {
    router.replace(`/safety/sos?sos=${id}`, { scroll: false });
  }

  function closeDetail() {
    router.replace("/safety/sos", { scroll: false });
  }

  async function afterMutation(
    record: SOSRecord,
    previousStatus: SOSRecord["status"],
    action: string,
    reason?: string,
  ) {
    await auditService.record({
      adminId,
      adminName,
      action,
      targetType: "sos",
      targetId: record.id,
      oldValue: { status: previousStatus },
      newValue: { status: record.status },
      reason,
    });
    await refresh();
    await load();
  }

  if (loading && cases.length === 0 && !error) {
    return <LoadingState label="Loading SOS queue…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="sos-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">SOS</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Emergency queue — acknowledge, respond, and resolve with audit trail.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load SOS." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <label className="min-w-[200px] flex-1">
          <span className="sr-only">Search SOS</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID, ride, user, location…"
            className="h-10 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
            data-testid="sos-search"
          />
        </label>
        <label className="text-sm">
          <span className="sr-only">Status filter</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SOSStatus | "ALL" | "ACTIVE")}
            className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
            data-testid="sos-status-filter"
          >
            <option value="ACTIVE">Active</option>
            <option value="ALL">All</option>
            <option value="TRIGGERED">Triggered</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESPONDING">Responding</option>
            <option value="RESOLVED">Resolved</option>
            <option value="FALSE_ALARM">False alarm</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">Severity filter</span>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SafetySeverity | "ALL")}
            className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
          >
            <option value="ALL">All severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">Network filter</span>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as RideNetwork | "ALL")}
            className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
          >
            <option value="ALL">All networks</option>
            <option value="OFFICE">Office</option>
            <option value="OUTSTATION">Outstation</option>
          </select>
        </label>
      </div>

      {cases.length === 0 ? (
        <EmptyState title="No SOS cases" description="Try another filter or search term." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="sos-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">SOS</th>
                <th className="px-3 py-2 font-medium">Ride</th>
                <th className="px-3 py-2 font-medium">Network</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Severity</th>
                <th className="px-3 py-2 font-medium">Triggered</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-[var(--bw-border)] last:border-0",
                    selectedId === item.id && "bg-[var(--bw-brand-soft)]/40",
                  )}
                  data-testid={`sos-row-${item.id}`}
                  data-status={item.status}
                >
                  <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
                  <td className="px-3 py-2">{item.rideId}</td>
                  <td className="px-3 py-2">
                    <NetworkBadge network={item.networkType} />
                  </td>
                  <td className="px-3 py-2">
                    <SosStatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {formatIstDateTime(new Date(item.triggeredAt))}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
                      onClick={() => openDetail(item.id)}
                      data-testid={`sos-open-${item.id}`}
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
        open={Boolean(selectedId)}
        title={selected ? `SOS ${selected.id}` : "SOS detail"}
        onClose={closeDetail}
      >
        {selected ? (
          <div className="space-y-4">
            <SosDetailPanel record={selected} userLabel={userName} />
            <div className="flex flex-wrap gap-2 border-t border-[var(--bw-border)] pt-4">
              {selected.status === "TRIGGERED" ? (
                <Button size="sm" disabled={busy} onClick={() => setAckId(selected.id)} data-testid="sos-acknowledge">
                  Acknowledge
                </Button>
              ) : null}
              {selected.status === "TRIGGERED" || selected.status === "ACKNOWLEDGED" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setRespondId(selected.id)}
                  data-testid="sos-start-response"
                >
                  Start response
                </Button>
              ) : null}
              {selected.status !== "RESOLVED" && selected.status !== "FALSE_ALARM" ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setResolveId(selected.id)}
                    data-testid="sos-resolve"
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy}
                    onClick={() => setFalseId(selected.id)}
                    data-testid="sos-false-alarm"
                  >
                    False alarm
                  </Button>
                </>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => setNoteId(selected.id)}
                data-testid="sos-add-note"
              >
                Add note
              </Button>
            </div>
          </div>
        ) : (
          <ErrorState title="SOS not found" message="Case may be filtered out or removed." />
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={ackId != null}
        title="Acknowledge SOS"
        description="Confirm acknowledgement. This action is audit-logged."
        onCancel={() => setAckId(null)}
        onConfirm={() => {
          if (!ackId) return;
          void (async () => {
            setBusy(true);
            try {
              const current = await safetyService.getSOSById(ackId);
              if (!current) return;
              const result = await safetyService.acknowledgeSOS(ackId, adminId);
              if (result) await afterMutation(result, current.status, "sos.acknowledge");
            } finally {
              setBusy(false);
              setAckId(null);
            }
          })();
        }}
      />

      <ConfirmDialog
        open={respondId != null}
        title="Start SOS response"
        description="Begin coordinated response. This action is audit-logged."
        onCancel={() => setRespondId(null)}
        onConfirm={() => {
          if (!respondId) return;
          void (async () => {
            setBusy(true);
            try {
              const current = await safetyService.getSOSById(respondId);
              if (!current) return;
              const result = await safetyService.startSOSResponse(respondId, adminId);
              if (result) await afterMutation(result, current.status, "sos.start_response");
            } finally {
              setBusy(false);
              setRespondId(null);
            }
          })();
        }}
      />

      <ReasonConfirmDialog
        open={resolveId != null}
        title="Resolve SOS"
        description="Optional resolution note. This action is audit-logged."
        reasonLabel="Resolution note"
        reasonRequired={false}
        onCancel={() => setResolveId(null)}
        onConfirm={(reason) => {
          if (!resolveId) return;
          void (async () => {
            setBusy(true);
            try {
              const current = await safetyService.getSOSById(resolveId);
              if (!current) return;
              const result = await safetyService.resolveSOS(
                resolveId,
                adminId,
                reason || undefined,
              );
              if (result) await afterMutation(result, current.status, "sos.resolve", reason);
            } finally {
              setBusy(false);
              setResolveId(null);
            }
          })();
        }}
      />

      <ReasonConfirmDialog
        open={falseId != null}
        title="Mark false alarm"
        description="Provide a reason. This action is audit-logged."
        reasonLabel="Reason"
        danger
        onCancel={() => setFalseId(null)}
        onConfirm={(reason) => {
          if (!falseId) return;
          void (async () => {
            setBusy(true);
            try {
              const current = await safetyService.getSOSById(falseId);
              if (!current) return;
              const result = await safetyService.markFalseAlarm(falseId, adminId, reason);
              if (result) await afterMutation(result, current.status, "sos.false_alarm", reason);
            } finally {
              setBusy(false);
              setFalseId(null);
            }
          })();
        }}
      />

      <ReasonConfirmDialog
        open={noteId != null}
        title="Add SOS note"
        description="Internal note for responders."
        reasonLabel="Note"
        confirmLabel="Add note"
        onCancel={() => setNoteId(null)}
        onConfirm={(note) => {
          if (!noteId) return;
          void (async () => {
            setBusy(true);
            try {
              const current = await safetyService.getSOSById(noteId);
              if (!current) return;
              const result = await safetyService.addSOSNote(noteId, note, adminId);
              if (result) await afterMutation(result, current.status, "sos.add_note", note);
            } finally {
              setBusy(false);
              setNoteId(null);
            }
          })();
        }}
      />
    </div>
  );
}
