"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  TransactionDirectionBadge,
  TransactionStatusBadge,
  WalletStatusBadge,
} from "@/components/status/MoneyBadges";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { walletService } from "@/services/wallet";
import type { LedgerTransaction } from "@/types/transaction";
import type { Wallet } from "@/types/wallet";

export default function WalletDetailPage() {
  const params = useParams<{ id: string }>();
  const walletId = params.id;
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [activity, setActivity] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const w = await walletService.getWalletById(walletId);
      if (!w) {
        setWallet(null);
        setActivity([]);
        setError(null);
      } else {
        const txns = await walletService.getWalletActivity(walletId);
        setWallet(w);
        setActivity(txns);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load wallet.");
    } finally {
      setLoading(false);
    }
  }, [walletId]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  if (loading && !wallet && !error) {
    return <LoadingState label="Loading wallet…" />;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load wallet." message={error} />
        <Button variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="space-y-3">
        <ErrorState title="Wallet not found" message={`No wallet matches ${walletId}.`} />
        <Link href="/wallet">
          <Button variant="secondary">Back to wallets</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5" data-testid="wallet-detail">
      <Link href="/wallet" className="text-sm text-[var(--bw-brand)] hover:underline">
        ← Wallets
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-mono">{wallet.id}</h1>
          <p className="text-sm text-[var(--bw-text-secondary)]">User {wallet.userId}</p>
        </div>
        <WalletStatusBadge status={wallet.status} />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4"
          data-testid="wallet-available"
        >
          <p className="text-xs text-[var(--bw-text-muted)]">Available balance</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatMoney(wallet.availableBalancePaise)}
          </p>
        </div>
        <div
          className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4"
          data-testid="wallet-held"
        >
          <p className="text-xs text-[var(--bw-text-muted)]">Held balance</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatMoney(wallet.heldBalancePaise)}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-[var(--bw-text-muted)]">
          Ledger activity
        </h2>
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Txn</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Direction</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((t) => (
                <tr key={t.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      href={`/transactions/${t.id}`}
                      className="font-mono text-xs text-[var(--bw-brand)] hover:underline"
                    >
                      {t.id}
                    </Link>
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
