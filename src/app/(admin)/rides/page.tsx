"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { RideStatusBadge, SafetyBadge } from "@/components/status/RideStatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { filterRides } from "@/services/rides";
import { useOps } from "@/providers/OpsProvider";
import type { RideNetwork } from "@/types/network";
import type { RideLifecycleStatus } from "@/types/ride";

type NetworkTab = "ALL" | RideNetwork;

export default function RidesPage() {
  const { rides, loading, ridesError, refresh } = useOps();
  const [network, setNetwork] = useState<NetworkTab>("ALL");
  const [status, setStatus] = useState<RideLifecycleStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () =>
      filterRides(rides, {
        networkType: network,
        status,
        search,
      }),
    [rides, network, status, search],
  );

  if (loading && rides.length === 0) {
    return <LoadingState label="Loading rides…" />;
  }

  if (ridesError && rides.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load rides." message={ridesError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="rides-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Rides</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Operational ride list across Office and Outstation networks.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2" data-testid="rides-network-tabs">
        {(
          [
            { id: "ALL", label: "All" },
            { id: "OFFICE", label: "Office" },
            { id: "OUTSTATION", label: "Outstation" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setNetwork(tab.id)}
            aria-pressed={network === tab.id}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              network === tab.id
                ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
                : "border-[var(--bw-border)] text-[var(--bw-text-secondary)]",
            )}
            data-testid={`rides-network-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="sr-only">Search rides</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ride ID, driver, route…"
            className="h-10 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
            data-testid="rides-search"
          />
        </label>
        <label className="text-sm">
          <span className="sr-only">Status filter</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RideLifecycleStatus | "ALL")}
            className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
            data-testid="rides-status-filter"
          >
            <option value="ALL">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="delayed">Delayed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
            <option value="disputed">Disputed</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No rides found" description="Try another network, status, or search." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="rides-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Ride ID</th>
                <th className="px-3 py-2 font-medium">Network</th>
                <th className="px-3 py-2 font-medium">Route</th>
                <th className="px-3 py-2 font-medium">Driver</th>
                <th className="px-3 py-2 font-medium">Date/Time</th>
                <th className="px-3 py-2 font-medium">Seats</th>
                <th className="px-3 py-2 font-medium">Booked</th>
                <th className="px-3 py-2 font-medium">Fare</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Safety</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((ride) => (
                <tr
                  key={ride.id}
                  className="border-b border-[var(--bw-border)] last:border-0"
                  data-testid={`ride-row-${ride.id}`}
                  data-network={ride.networkType}
                  data-status={ride.status}
                >
                  <td className="px-3 py-2.5 font-medium">{ride.id}</td>
                  <td className="px-3 py-2.5">
                    <NetworkBadge network={ride.networkType} />
                  </td>
                  <td className="px-3 py-2.5 text-[var(--bw-text-secondary)]">
                    {ride.route.origin.name} → {ride.route.destination.name}
                  </td>
                  <td className="px-3 py-2.5">{ride.driver.name}</td>
                  <td className="px-3 py-2.5 text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(ride.scheduledStart))}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{ride.seats}</td>
                  <td className="px-3 py-2.5 tabular-nums">{ride.booked}</td>
                  <td className="px-3 py-2.5 tabular-nums">₹{ride.fare}</td>
                  <td className="px-3 py-2.5">
                    <RideStatusBadge status={ride.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <SafetyBadge status={ride.safetyStatus} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/rides/${ride.id}`}>
                      <Button variant="ghost" size="sm" data-testid={`open-ride-${ride.id}`}>
                        Open
                      </Button>
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
