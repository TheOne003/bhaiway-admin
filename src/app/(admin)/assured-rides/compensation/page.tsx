"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatInrFromPaise } from "@/lib/assuredRideMath";
import { formatIstDateTime } from "@/lib/format";
import { useOps } from "@/providers/OpsProvider";
import type { CompensationCase } from "@/types/assuredRide";

export default function CompensationPage() {
  const { compensationCases, loading, assuredError, refresh } = useOps();
  const [selected, setSelected] = useState<CompensationCase | null>(null);

  if (loading && compensationCases.length === 0) {
    return <LoadingState label="Loading compensation…" />;
  }
  if (assuredError && compensationCases.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load compensation cases." message={assuredError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="compensation-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Compensation</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          60% of forfeited security, split equally among eligible passengers. Mock review only —
          no payment transfers.
        </p>
      </header>

      {compensationCases.length === 0 ? (
        <EmptyState title="No compensation cases require review." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="compensation-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Case</th>
                <th className="px-3 py-2">Ride</th>
                <th className="px-3 py-2">Forfeited</th>
                <th className="px-3 py-2">Pool (60%)</th>
                <th className="px-3 py-2">Eligible</th>
                <th className="px-3 py-2">Per passenger</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Calculated</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {compensationCases.map((item) => (
                <tr key={item.id} data-testid={`comp-row-${item.id}`}>
                  <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.rideId}</td>
                  <td className="px-3 py-2 tabular-nums" data-testid={`comp-forfeit-${item.id}`}>
                    {formatInrFromPaise(item.forfeitedPaise)}
                  </td>
                  <td className="px-3 py-2 tabular-nums" data-testid={`comp-pool-${item.id}`}>
                    {formatInrFromPaise(item.compensationPoolPaise)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{item.eligibleCount}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatInrFromPaise(item.perPassengerPaise)}
                  </td>
                  <td className="px-3 py-2 text-xs">{item.status}</td>
                  <td className="px-3 py-2 text-xs">
                    {formatIstDateTime(new Date(item.calculatedAt))}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelected(item)}
                      data-testid={`comp-open-${item.id}`}
                    >
                      Review
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
        title={selected ? `Compensation ${selected.id}` : "Compensation"}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-3 text-sm" data-testid="compensation-detail">
            <p>
              Forfeited {formatInrFromPaise(selected.forfeitedPaise)} → pool{" "}
              {formatInrFromPaise(selected.compensationPoolPaise)} (60%).
            </p>
            <ul className="space-y-1">
              {selected.allocations.map((a) => (
                <li key={a.userId}>
                  {a.name}: {formatInrFromPaise(a.amountPaise)}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[var(--bw-text-muted)]">
              Calculation from domain service. No real payouts in Phase 5.
            </p>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  );
}
