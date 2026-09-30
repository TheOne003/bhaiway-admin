"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { AssuredStatusBadge } from "@/components/status/SafetyBadges";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatInrFromPaise } from "@/lib/assuredRideMath";
import { formatIstDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useOps } from "@/providers/OpsProvider";
import { filterAssuredRides } from "@/services/assuredRide";
import type { AssuredRideStatus } from "@/types/assuredRide";

export default function AssuredRidesPage() {
  const { assuredRides, loading, assuredError, refresh } = useOps();
  const [status, setStatus] = useState<AssuredRideStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(
    () => filterAssuredRides(assuredRides, { status, search }),
    [assuredRides, status, search],
  );
  const selected = assuredRides.find((c) => c.id === selectedId) ?? null;

  if (loading && assuredRides.length === 0) {
    return <LoadingState label="Loading Assured Rides…" />;
  }
  if (assuredError && assuredRides.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load Assured Ride cases." message={assuredError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="assured-rides-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Assured Rides</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Security hold, cancellations, and compensation context.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            "ALL",
            "ACTIVE",
            "COMPLETED",
            "CANCELLED",
            "COMPENSATION_PENDING",
            "COMPENSATED",
            "DISPUTED",
            "RISK_REVIEW",
          ] as const
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
            data-testid={`assured-filter-${id}`}
          >
            {id === "ALL" ? "All" : id.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search ride, driver…"
        className="h-10 w-full max-w-md rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
        data-testid="assured-search"
      />

      {visible.length === 0 ? (
        <EmptyState title="No Assured Ride cases." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="assured-rides-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Ride</th>
                <th className="px-3 py-2">Network</th>
                <th className="px-3 py-2">Driver</th>
                <th className="px-3 py-2">Passengers</th>
                <th className="px-3 py-2">Fare</th>
                <th className="px-3 py-2">Security</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Cancel</th>
                <th className="px-3 py-2">Compensation</th>
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--bw-border)] last:border-0"
                  data-testid={`assured-row-${item.id}`}
                >
                  <td className="px-3 py-2 font-mono text-xs">{item.rideId}</td>
                  <td className="px-3 py-2">
                    <NetworkBadge network={item.networkType} />
                  </td>
                  <td className="px-3 py-2 text-xs">{item.driverName}</td>
                  <td className="px-3 py-2 tabular-nums">{item.passengers.length}</td>
                  <td className="px-3 py-2 tabular-nums">{formatInrFromPaise(item.farePaise)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatInrFromPaise(item.securityPaise)}
                  </td>
                  <td className="px-3 py-2">
                    <AssuredStatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-2 text-xs">{item.cancellingParty}</td>
                  <td className="px-3 py-2 tabular-nums text-xs">
                    {formatInrFromPaise(item.compensationPoolPaise)}
                  </td>
                  <td className="px-3 py-2 text-xs">{item.riskCaseId ?? "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelectedId(item.id)}
                      data-testid={`assured-open-${item.id}`}
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
        title={selected ? `Assured Ride ${selected.rideId}` : "Assured Ride"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="space-y-4" data-testid="assured-detail">
            <AssuredStatusBadge status={selected.status} />
            <dl className="grid gap-2 text-sm">
              <Row label="Route" value={selected.routeLabel} />
              <Row label="Driver" value={`${selected.driverName} (${selected.driverId})`} />
              <Row label="Fare" value={formatInrFromPaise(selected.farePaise)} />
              <Row label="Security" value={formatInrFromPaise(selected.securityPaise)} />
              <Row label="Security status" value={selected.securityStatus} />
              <Row label="Forfeited" value={formatInrFromPaise(selected.forfeitedPaise)} />
              <Row
                label="Compensation pool"
                value={formatInrFromPaise(selected.compensationPoolPaise)}
              />
            </dl>
            <section>
              <h3 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">
                Passengers
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {selected.passengers.map((p) => (
                  <li key={p.userId}>
                    {p.name} · security {formatInrFromPaise(p.securityPaise)}
                    {p.cancelled ? " · cancelled" : ""}
                    {p.compensationPaise > 0
                      ? ` · comp ${formatInrFromPaise(p.compensationPaise)}`
                      : ""}
                  </li>
                ))}
              </ul>
            </section>
            <ol className="space-y-1 text-sm">
              {selected.timeline.map((t) => (
                <li key={t.id} className="flex justify-between gap-2 border-b border-[var(--bw-border)] py-1">
                  <span>{t.label}</span>
                  <span className="text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(t.timestamp))}
                  </span>
                </li>
              ))}
            </ol>
            <Link href={`/rides/${selected.rideId}`} className="text-sm text-[var(--bw-brand)] hover:underline">
              View ride →
            </Link>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--bw-text-muted)]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
