"use client";

import Link from "next/link";
import {
  TransactionDirectionBadge,
  TransactionStatusBadge,
} from "@/components/status/MoneyBadges";
import { Button } from "@/components/ui/Button";
import { formatIstDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { LedgerTransaction } from "@/types/transaction";

interface TransactionDetailPanelProps {
  txn: LedgerTransaction;
  onReverse?: () => void;
  reverseBusy?: boolean;
}

export function TransactionDetailPanel({
  txn,
  onReverse,
  reverseBusy,
}: TransactionDetailPanelProps) {
  const canReverse =
    txn.status === "COMPLETED" && !txn.reversedByTransactionId && onReverse;
  const showImmutable =
    txn.status === "COMPLETED" || txn.status === "REVERSED";

  return (
    <div className="space-y-4" data-testid="txn-detail">
      <div className="flex flex-wrap gap-2">
        <TransactionStatusBadge status={txn.status} />
        <TransactionDirectionBadge direction={txn.direction} />
      </div>

      {showImmutable ? (
        <p
          className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-elevated)] px-3 py-2 text-xs text-[var(--bw-text-secondary)]"
          data-testid="txn-immutable-note"
        >
          Completed ledger entries are immutable. Use reversal to compensate — never edit amounts
          in place.
        </p>
      ) : null}

      <dl className="grid gap-2 text-sm">
        <Row label="Transaction" value={txn.id} mono />
        <Row label="User" value={txn.userId} mono />
        <Row label="Wallet" value={txn.walletId} mono />
        <Row label="Type" value={txn.type.replace(/_/g, " ")} />
        <Row label="Amount" value={formatMoney(txn.amountPaise, txn.currency)} />
        <Row label="Reference" value={`${txn.referenceType} · ${txn.referenceId ?? "—"}`} />
        <Row label="Description" value={txn.description} />
        <Row label="Created" value={formatIstDateTime(new Date(txn.createdAt))} />
        <Row
          label="Completed"
          value={txn.completedAt ? formatIstDateTime(new Date(txn.completedAt)) : "—"}
        />
        {txn.reversesTransactionId ? (
          <Row label="Reverses" value={txn.reversesTransactionId} mono />
        ) : null}
        {txn.reversedByTransactionId ? (
          <Row label="Reversed by" value={txn.reversedByTransactionId} mono />
        ) : null}
      </dl>

      {canReverse ? (
        <Button
          variant="danger"
          size="sm"
          loading={reverseBusy}
          onClick={onReverse}
          data-testid="txn-reverse"
        >
          Reverse transaction
        </Button>
      ) : null}

      {txn.reversedByTransactionId ? (
        <Link
          href={`/transactions/${txn.reversedByTransactionId}`}
          className="text-sm text-[var(--bw-brand)] hover:underline"
        >
          View reversal entry →
        </Link>
      ) : null}
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
