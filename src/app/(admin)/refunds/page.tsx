"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefundStatusBadge } from "@/components/status/MoneyBadges";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { refundsService } from "@/services/refunds";
import type { RefundRecord, RefundStatus } from "@/types/refund";

type PendingAction = { id: string; next: RefundStatus; label: string; danger?: boolean };

export default function RefundsPage() {
  const { session } = useAuth();
  const { refresh: refreshOps } = useOps();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Ops Admin";

  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RefundStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await refundsService.getRefunds({
        status,
        search: search || undefined,
      });
      setRefunds(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load refunds.");
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => refunds.find((r) => r.id === selectedId) ?? null,
    [refunds, selectedId],
  );

  function actionsFor(r: RefundRecord): PendingAction[] {
    switch (r.status) {
      case "REQUESTED":
        return [
          { id: r.id, next: "APPROVED", label: "Approve" },
          { id: r.id, next: "REJECTED", label: "Reject", danger: true },
        ];
      case "APPROVED":
        return [
          { id: r.id, next: "PROCESSING", label: "Mark processing" },
          { id: r.id, next: "REJECTED", label: "Reject", danger: true },
        ];
      case "PROCESSING":
        return [
          { id: r.id, next: "COMPLETED", label: "Complete" },
          { id: r.id, next: "FAILED", label: "Mark failed", danger: true },
        ];
      case "FAILED":
        return [{ id: r.id, next: "PROCESSING", label: "Retry processing" }];
      default:
        return [];
    }
  }

  async function applyTransition(reason: string) {
    if (!pending) return;
    setBusy(true);
    try {
      await refundsService.transitionRefund(pending.id, pending.next, {
        adminId,
        adminName,
        reason,
        idempotencyKey: `refund_${pending.id}_${pending.next}_${Date.now()}`,
      });
      setPending(null);
      await refreshOps();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && refunds.length === 0 && !error) {
    return <LoadingState label="Loading refunds…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="refunds-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Refunds</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Approve, process, and complete refunds with audit trail.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load refunds." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          ["ALL", "REQUESTED", "APPROVED", "PROCESSING", "COMPLETED", "FAILED", "REJECTED"] as const
        ).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={status === id}
            onClick={() => setStatus(id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              status === id
                ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
                : "border-[var(--bw-border)] text-[var(--bw-text-secondary)]",
            )}
          >
            {id === "ALL" ? "All" : id}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search refund, user, txn…"
        className="h-10 w-full max-w-md rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
      />

      {refunds.length === 0 ? (
        <EmptyState title="No refunds match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="refunds-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Refund</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Original txn</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Requested</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.userId}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.originalTransactionId}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(r.amountPaise)}</td>
                  <td className="px-3 py-2">
                    <RefundStatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(r.requestedAt))}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelectedId(r.id)}
                      data-testid={`refund-open-${r.id}`}
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
        title={selected ? `Refund ${selected.id}` : "Refund"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="space-y-4" data-testid="refund-detail">
            <RefundStatusBadge status={selected.status} />
            <dl className="grid gap-2 text-sm">
              <Row label="User" value={selected.userId} mono />
              <Row label="Amount" value={formatMoney(selected.amountPaise)} />
              <Row label="Original txn" value={selected.originalTransactionId} mono />
              <Row label="Reason" value={selected.reason} />
              <Row label="Ride" value={selected.rideId ?? "—"} mono={Boolean(selected.rideId)} />
              <Row
                label="Refund txn"
                value={selected.refundTransactionId ?? "—"}
                mono={Boolean(selected.refundTransactionId)}
              />
              <Row label="Requested" value={formatIstDateTime(new Date(selected.requestedAt))} />
              {selected.processedAt ? (
                <Row label="Processed" value={formatIstDateTime(new Date(selected.processedAt))} />
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-2">
              {actionsFor(selected).map((action) => (
                <Button
                  key={`${action.next}-${action.label}`}
                  variant={action.danger ? "danger" : "secondary"}
                  size="sm"
                  disabled={busy}
                  data-testid={action.label === "Approve" ? "refund-approve" : undefined}
                  onClick={() => setPending(action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
            {selected.refundTransactionId ? (
              <Link
                href={`/transactions/${selected.refundTransactionId}`}
                className="text-sm text-[var(--bw-brand)] hover:underline"
              >
                View refund ledger entry →
              </Link>
            ) : null}
          </div>
        ) : null}
      </DetailDrawer>

      <ReasonConfirmDialog
        open={Boolean(pending)}
        title={pending ? `${pending.label} refund` : "Refund action"}
        description="This transition is recorded in the audit log."
        confirmLabel={pending?.label ?? "Confirm"}
        danger={pending?.danger}
        onCancel={() => setPending(null)}
        onConfirm={(reason) => void applyTransition(reason)}
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
