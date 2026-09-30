"use client";

import { useMemo, useState } from "react";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { RiskStatusBadge, SeverityBadge } from "@/components/status/SafetyBadges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { auditService } from "@/services/audit";
import { filterRiskCases, riskService } from "@/services/risk";
import type { RiskCaseStatus, RiskType } from "@/types/risk";
import type { SafetySeverity } from "@/types/safety";

export default function FraudRiskPage() {
  const { riskCases, loading, assuredError, refresh } = useOps();
  const { session } = useAuth();
  const [status, setStatus] = useState<RiskCaseStatus | "ALL">("ALL");
  const [severity, setSeverity] = useState<SafetySeverity | "ALL">("ALL");
  const [riskType, setRiskType] = useState<RiskType | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<"review" | "escalate" | "resolve" | "false" | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(
    () => filterRiskCases(riskCases, { status, severity, riskType }),
    [riskCases, status, severity, riskType],
  );
  const selected = riskCases.find((c) => c.id === selectedId) ?? null;
  const adminId = session?.admin.id ?? "adm_001";

  async function run(kind: typeof pending, reason?: string) {
    if (!selected || !kind) return;
    setBusy(true);
    try {
      const previous = selected.status;
      let updated = null;
      if (kind === "review") updated = await riskService.reviewRiskCase(selected.id, adminId);
      if (kind === "escalate") updated = await riskService.escalateRiskCase(selected.id, adminId);
      if (kind === "resolve") {
        updated = await riskService.resolveRiskCase(
          selected.id,
          reason || "Resolved",
          "RESOLVED",
          adminId,
        );
      }
      if (kind === "false") {
        updated = await riskService.resolveRiskCase(
          selected.id,
          reason || "False positive",
          "FALSE_POSITIVE",
          adminId,
        );
      }
      if (updated) {
        await auditService.record({
          adminId,
          adminName: session?.admin.name ?? "Admin",
          action: `risk.${kind}`,
          targetType: "risk",
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

  if (loading && riskCases.length === 0) return <LoadingState label="Loading risk cases…" />;
  if (assuredError && riskCases.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load risk cases." message={assuredError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="risk-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Fraud / Risk</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Deterministic mock rule engine — not a production ML fraud model.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
          data-testid="risk-status-filter"
        >
          <option value="ALL">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="ESCALATED">Escalated</option>
          <option value="RESOLVED">Resolved</option>
          <option value="FALSE_POSITIVE">False positive</option>
        </select>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as typeof severity)}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
        >
          <option value="ALL">All severity</option>
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </select>
        <select
          value={riskType}
          onChange={(e) => setRiskType(e.target.value as typeof riskType)}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
        >
          <option value="ALL">All types</option>
          <option value="REPEATED_CANCELLATION">Repeated cancellation</option>
          <option value="FAST_CANCEL_AFTER_BOOKING">Fast cancel</option>
          <option value="COMPENSATION_PATTERN">Compensation pattern</option>
          <option value="SHARED_ACTOR_PATTERN">Shared actor</option>
          <option value="ABNORMAL_ASSURED_BEHAVIOR">Abnormal Assured</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No risk cases match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="risk-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Case</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Ride</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Detected</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} data-testid={`risk-row-${item.id}`}>
                  <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
                  <td className="px-3 py-2 text-xs">{item.riskType.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{item.score}</td>
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs">{item.rideId}</div>
                    <NetworkBadge network={item.networkType} />
                  </td>
                  <td className="px-3 py-2">
                    <RiskStatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {formatIstDateTime(new Date(item.detectedAt))}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelectedId(item.id)}
                      data-testid={`risk-open-${item.id}`}
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
        title={selected ? `Risk ${selected.id}` : "Risk"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="space-y-4" data-testid="risk-detail">
            <div className="flex flex-wrap gap-2">
              <RiskStatusBadge status={selected.status} />
              <SeverityBadge severity={selected.severity} />
            </div>
            <p className="text-xs text-[var(--bw-warning)]">Mock rules engine · not production ML</p>
            <p className="text-sm">{selected.reason}</p>
            <ul className="space-y-2 text-sm">
              {selected.signals.map((s) => (
                <li key={s.code} className="rounded border border-[var(--bw-border)] p-2">
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-[var(--bw-text-muted)]">{s.detail}</div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => setPending("review")} data-testid="risk-review">
                Review
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPending("escalate")} data-testid="risk-escalate">
                Escalate
              </Button>
              <Button size="sm" disabled={busy} onClick={() => setPending("resolve")} data-testid="risk-resolve">
                Resolve
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPending("false")} data-testid="risk-false-positive">
                False positive
              </Button>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={pending === "review" || pending === "escalate"}
        title="Confirm risk action"
        description="Audit-logged mock risk action."
        onCancel={() => setPending(null)}
        onConfirm={() => void run(pending)}
      />
      <ReasonConfirmDialog
        open={pending === "resolve" || pending === "false"}
        title={pending === "false" ? "Mark false positive" : "Resolve risk case"}
        description="Provide a resolution note."
        onCancel={() => setPending(null)}
        onConfirm={(reason) => void run(pending, reason)}
      />
    </div>
  );
}
