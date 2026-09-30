"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TransactionDetailPanel } from "@/components/money/TransactionDetailPanel";
import {
  TransactionDirectionBadge,
  TransactionStatusBadge,
} from "@/components/status/MoneyBadges";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { transactionsService } from "@/services/transactions";
import type { LedgerTransaction, TransactionStatus, TransactionType } from "@/types/transaction";
import type { MoneyDirection } from "@/types/money";

export default function TransactionsPage() {
  const { session } = useAuth();
  const { refresh: refreshOps } = useOps();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Ops Admin";

  const [txns, setTxns] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TransactionStatus | "ALL">("ALL");
  const [type, setType] = useState<TransactionType | "ALL">("ALL");
  const [direction, setDirection] = useState<MoneyDirection | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reverseId, setReverseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await transactionsService.getTransactions({
        search: search || undefined,
        status,
        type,
        direction,
      });
      setTxns(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [search, status, type, direction]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => txns.find((t) => t.id === selectedId) ?? null,
    [txns, selectedId],
  );

  async function handleReverse(reason: string) {
    if (!reverseId) return;
    const targetId = reverseId;
    setBusy(true);
    try {
      await transactionsService.createReversalTransaction({
        originalTransactionId: targetId,
        reason,
        adminId,
        adminName,
        idempotencyKey: `rev_${targetId}_${Date.now()}`,
      });
      setReverseId(null);
      await refreshOps();
      await load();
      setSelectedId(targetId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reversal failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && txns.length === 0 && !error) {
    return <LoadingState label="Loading transactions…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="transactions-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Immutable ledger — reverse completed entries instead of editing.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load transactions." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search txn, user, reference…"
          className="h-10 min-w-[200px] flex-1 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
          data-testid="txn-search"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TransactionStatus | "ALL")}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          {(["PENDING", "COMPLETED", "FAILED", "REVERSED", "CANCELLED"] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as MoneyDirection | "ALL")}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 text-sm"
        >
          <option value="ALL">All directions</option>
          {(["CREDIT", "DEBIT", "HOLD", "RELEASE"] as const).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "RIDE_FARE", "CREDIT", "REFUND", "ADJUSTMENT", "SECURITY_DEPOSIT"] as const).map(
          (id) => (
            <button
              key={id}
              type="button"
              aria-pressed={type === id}
              onClick={() => setType(id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium",
                type === id
                  ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
                  : "border-[var(--bw-border)] text-[var(--bw-text-secondary)]",
              )}
            >
              {id === "ALL" ? "All types" : id.replace(/_/g, " ")}
            </button>
          ),
        )}
      </div>

      {txns.length === 0 ? (
        <EmptyState title="No transactions match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="transactions-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Direction</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{t.id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.userId}</td>
                  <td className="px-3 py-2 text-xs">{t.type.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">
                    <TransactionDirectionBadge direction={t.direction} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(t.amountPaise)}</td>
                  <td className="px-3 py-2">
                    <TransactionStatusBadge status={t.status} />
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(t.createdAt))}
                  </td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelectedId(t.id)}
                      data-testid={`txn-open-${t.id}`}
                    >
                      Open
                    </button>
                    <Link
                      href={`/transactions/${t.id}`}
                      className="text-xs text-[var(--bw-text-muted)] hover:underline"
                    >
                      Full
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDrawer
        open={Boolean(selected)}
        title={selected ? `Transaction ${selected.id}` : "Transaction"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <TransactionDetailPanel
            txn={selected}
            reverseBusy={busy}
            onReverse={
              selected.status === "COMPLETED" && !selected.reversedByTransactionId
                ? () => setReverseId(selected.id)
                : undefined
            }
          />
        ) : null}
      </DetailDrawer>

      <ReasonConfirmDialog
        open={Boolean(reverseId)}
        title="Reverse transaction"
        description="Creates a compensating ledger entry. The original row stays immutable."
        confirmLabel="Reverse"
        danger
        onCancel={() => setReverseId(null)}
        onConfirm={(reason) => void handleReverse(reason)}
      />
    </div>
  );
}
