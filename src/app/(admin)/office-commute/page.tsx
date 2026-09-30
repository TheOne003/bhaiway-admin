"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { RideStatusBadge } from "@/components/status/RideStatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { useOps } from "@/providers/OpsProvider";
import { filterRides } from "@/services/rides";
import type { RideLifecycleStatus } from "@/types/ride";

export default function OfficeCommutePage() {
  const { rides, loading, ridesError, refresh } = useOps();
  const [status, setStatus] = useState<RideLifecycleStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () =>
      filterRides(rides, {
        networkType: "OFFICE",
        status,
        search,
      }),
    [rides, status, search],
  );

  if (loading && rides.length === 0) {
    return <LoadingState label="Loading office commute rides…" />;
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
    <PageContainer width="wide" testId="office-commute-page">
      <PageHeader
        title="Office Commute"
        description="Office network rides — filtered from the shared ride list."
      />

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ride ID, driver, route…"
          className="h-10 min-w-[220px] flex-1 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RideLifecycleStatus | "ALL")}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
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
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No office commute rides match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Ride</th>
                <th className="px-3 py-2">Network</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Driver</th>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Fare</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((ride) => (
                <tr key={ride.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2.5 font-medium">{ride.id}</td>
                  <td className="px-3 py-2.5">
                    <NetworkBadge network={ride.networkType} />
                  </td>
                  <td className="px-3 py-2.5 text-[var(--bw-text-secondary)]">
                    {ride.route.origin.name} → {ride.route.destination.name}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{ride.driver.name}</td>
                  <td className="px-3 py-2.5 text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(ride.scheduledStart))}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-xs">₹{ride.fare}</td>
                  <td className="px-3 py-2.5">
                    <RideStatusBadge status={ride.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/rides/${ride.id}`}
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
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
    </PageContainer>
  );
}
