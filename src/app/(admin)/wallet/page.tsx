"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WalletStatusBadge } from "@/components/status/MoneyBadges";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { walletService } from "@/services/wallet";
import type { Wallet, WalletStatus, WalletSummary } from "@/types/wallet";

export default function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        walletService.getWallets({ status, search: search || undefined }),
        walletService.getWalletSummary(),
      ]);
      setWallets(list);
      setSummary(sum);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load wallets.");
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const visible = useMemo(() => wallets, [wallets]);

  if (loading && wallets.length === 0 && !error) {
    return <LoadingState label="Loading wallets…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="wallet-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          User balances derived from the immutable ledger.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load wallets." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {summary ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          data-testid="wallet-summary"
        >
          <SummaryTile label="Wallets" value={String(summary.totalWallets)} />
          <SummaryTile label="Active" value={String(summary.activeWallets)} />
          <SummaryTile label="Locked" value={String(summary.lockedWallets)} />
          <SummaryTile
            label="Total available"
            value={formatMoney(summary.totalAvailablePaise)}
          />
          <SummaryTile label="Total held" value={formatMoney(summary.totalHeldPaise)} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(["ALL", "ACTIVE", "LOCKED", "SUSPENDED", "CLOSED"] as const).map((id) => (
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
        placeholder="Search wallet or user…"
        className="h-10 w-full max-w-md rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
      />

      {visible.length === 0 ? (
        <EmptyState title="No wallets match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="wallet-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Wallet</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Available</th>
                <th className="px-3 py-2">Held</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((w) => (
                <tr
                  key={w.id}
                  className="border-b border-[var(--bw-border)] last:border-0"
                >
                  <td className="px-3 py-2 font-mono text-xs">{w.id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{w.userId}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatMoney(w.availableBalancePaise)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatMoney(w.heldBalancePaise)}
                  </td>
                  <td className="px-3 py-2">
                    <WalletStatusBadge status={w.status} />
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/wallet/${w.id}`}
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      data-testid={`wallet-open-${w.id}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 py-2">
      <p className="text-xs text-[var(--bw-text-muted)]">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
