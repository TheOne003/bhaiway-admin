"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { TransactionDetailPanel } from "@/components/money/TransactionDetailPanel";
import { Button } from "@/components/ui/Button";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { transactionsService } from "@/services/transactions";
import type { LedgerTransaction } from "@/types/transaction";

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const txnId = params.id;
  const { session } = useAuth();
  const { refresh: refreshOps } = useOps();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Ops Admin";

  const [txn, setTxn] = useState<LedgerTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await transactionsService.getTransactionById(txnId);
      setTxn(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load transaction.");
    } finally {
      setLoading(false);
    }
  }, [txnId]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  async function handleReverse(reason: string) {
    setBusy(true);
    try {
      await transactionsService.createReversalTransaction({
        originalTransactionId: txnId,
        reason,
        adminId,
        adminName,
        idempotencyKey: `rev_${txnId}_${Date.now()}`,
      });
      setReverseOpen(false);
      await refreshOps();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reversal failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !txn && !error) {
    return <LoadingState label="Loading transaction…" />;
  }

  if (error && !txn) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load transaction." message={error} />
        <Button variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="space-y-3">
        <ErrorState title="Transaction not found" message={`No transaction matches ${txnId}.`} />
        <Link href="/transactions">
          <Button variant="secondary">Back to transactions</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/transactions" className="text-sm text-[var(--bw-brand)] hover:underline">
        ← Transactions
      </Link>
      <div className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-5">
        <TransactionDetailPanel
          txn={txn}
          reverseBusy={busy}
          onReverse={
            txn.status === "COMPLETED" && !txn.reversedByTransactionId
              ? () => setReverseOpen(true)
              : undefined
          }
        />
      </div>
      <ReasonConfirmDialog
        open={reverseOpen}
        title="Reverse transaction"
        description="Creates a compensating ledger entry. The original row stays immutable."
        confirmLabel="Reverse"
        danger
        onCancel={() => setReverseOpen(false)}
        onConfirm={(reason) => void handleReverse(reason)}
      />
    </div>
  );
}
