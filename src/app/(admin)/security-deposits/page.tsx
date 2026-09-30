"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DepositStatusBadge } from "@/components/status/MoneyBadges";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { securityDepositService } from "@/services/securityDeposits";
import type { SecurityDeposit, SecurityDepositStatus } from "@/types/securityDeposit";

export default function SecurityDepositsPage() {
  const [deposits, setDeposits] = useState<SecurityDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SecurityDepositStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await securityDepositService.getDeposits({
        status,
        search: search || undefined,
      });
      setDeposits(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load deposits.");
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => deposits.find((d) => d.id === selectedId) ?? null,
    [deposits, selectedId],
  );

  if (loading && deposits.length === 0 && !error) {
    return <LoadingState label="Loading security deposits…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="deposits-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Security deposits</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Read-only lifecycle tied to Assured Rides and ledger holds.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load deposits." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(["ALL", "HELD", "RELEASED", "FORFEITED", "REFUNDED", "DISPUTED"] as const).map((id) => (
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
        placeholder="Search deposit, ride, user…"
        className="h-10 w-full max-w-md rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
      />

      {deposits.length === 0 ? (
        <EmptyState title="No security deposits match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="deposits-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Deposit</th>
                <th className="px-3 py-2">Ride</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Network</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{d.id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{d.rideId}</td>
                  <td className="px-3 py-2 font-mono text-xs">{d.userId}</td>
                  <td className="px-3 py-2">
                    <NetworkBadge network={d.networkType} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(d.amountPaise)}</td>
                  <td className="px-3 py-2">
                    <DepositStatusBadge status={d.status} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelectedId(d.id)}
                      data-testid={`deposit-open-${d.id}`}
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
        title={selected ? `Deposit ${selected.id}` : "Security deposit"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="space-y-4" data-testid="deposit-detail">
            <DepositStatusBadge status={selected.status} />
            <dl className="grid gap-2 text-sm">
              <Row label="Amount" value={formatMoney(selected.amountPaise)} />
              <Row label="Ride" value={selected.rideId} mono />
              <Row label="User" value={selected.userId} mono />
              <Row label="Held at" value={formatIstDateTime(new Date(selected.heldAt))} />
              <Row
                label="Related txn"
                value={selected.relatedTransactionId ?? "—"}
                mono={Boolean(selected.relatedTransactionId)}
              />
              <Row label="Reason" value={selected.reason ?? "—"} />
            </dl>
            <section>
              <h3 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">
                Lifecycle
              </h3>
              <ol className="mt-2 space-y-1 text-sm">
                {selected.timeline.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex justify-between gap-2 border-b border-[var(--bw-border)] py-1"
                  >
                    <span>{ev.label}</span>
                    <span className="text-xs text-[var(--bw-text-muted)]">
                      {formatIstDateTime(new Date(ev.timestamp))}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
            {selected.relatedTransactionId ? (
              <Link
                href={`/transactions/${selected.relatedTransactionId}`}
                className="text-sm text-[var(--bw-brand)] hover:underline"
              >
                View ledger entry →
              </Link>
            ) : null}
          </div>
        ) : null}
      </DetailDrawer>
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
