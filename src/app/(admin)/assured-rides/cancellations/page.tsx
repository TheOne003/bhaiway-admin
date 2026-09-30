"use client";

import { useMemo, useState } from "react";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { AssuredStatusBadge } from "@/components/status/SafetyBadges";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatInrFromPaise } from "@/lib/assuredRideMath";
import { formatIstDateTime } from "@/lib/format";
import { useOps } from "@/providers/OpsProvider";
import type { CancellationCase } from "@/types/assuredRide";

export default function CancellationsPage() {
  const { cancellationCases, loading, assuredError, refresh } = useOps();
  const [party, setParty] = useState<"ALL" | "DRIVER" | "RIDER">("ALL");
  const [selected, setSelected] = useState<CancellationCase | null>(null);

  const visible = useMemo(
    () =>
      cancellationCases.filter((c) => (party === "ALL" ? true : c.cancellingParty === party)),
    [cancellationCases, party],
  );

  if (loading && cancellationCases.length === 0) {
    return <LoadingState label="Loading cancellations…" />;
  }
  if (assuredError && cancellationCases.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load cancellation cases." message={assuredError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="cancellations-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cancellations</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Assured Ride cancellation cases and forfeiture impact.
        </p>
      </header>

      <div className="flex gap-2">
        {(["ALL", "DRIVER", "RIDER"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setParty(id)}
            className="rounded-md border border-[var(--bw-border)] px-3 py-1.5 text-xs"
            data-testid={`cancel-filter-${id}`}
          >
            {id === "ALL" ? "All" : id}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No cancellation cases." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="cancellations-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Ride</th>
                <th className="px-3 py-2">Party</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Security</th>
                <th className="px-3 py-2">Forfeited</th>
                <th className="px-3 py-2">Comp pool</th>
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} data-testid={`cancel-row-${item.id}`}>
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs">{item.rideId}</div>
                    <NetworkBadge network={item.networkType} />
                  </td>
                  <td className="px-3 py-2 text-xs">{item.cancellingParty}</td>
                  <td className="px-3 py-2 text-xs">{item.cancellingName}</td>
                  <td className="px-3 py-2 text-xs">
                    {formatIstDateTime(new Date(item.cancelledAt))}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-xs">
                    {formatInrFromPaise(item.securityPaise)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-xs">
                    {formatInrFromPaise(item.forfeitedPaise)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-xs">
                    {formatInrFromPaise(item.compensationPoolPaise)}
                  </td>
                  <td className="px-3 py-2 text-xs">{item.riskStatus}</td>
                  <td className="px-3 py-2">
                    <AssuredStatusBadge status={item.caseStatus} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelected(item)}
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
        title={selected ? `Cancellation ${selected.rideId}` : "Cancellation"}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <dl className="space-y-2 text-sm" data-testid="cancellation-detail">
            <div>
              <dt className="text-xs text-[var(--bw-text-muted)]">Cancelling party</dt>
              <dd>
                {selected.cancellingParty} · {selected.cancellingName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--bw-text-muted)]">Forfeited</dt>
              <dd>{formatInrFromPaise(selected.forfeitedPaise)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--bw-text-muted)]">Compensation impact</dt>
              <dd>{formatInrFromPaise(selected.compensationPoolPaise)} pool</dd>
            </div>
          </dl>
        ) : null}
      </DetailDrawer>
    </div>
  );
}
