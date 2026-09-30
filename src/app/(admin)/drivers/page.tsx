"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AccountStatusBadge,
  VerificationBadge,
} from "@/components/status/PeopleBadges";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { cn } from "@/lib/utils";
import { useOps } from "@/providers/OpsProvider";
import { filterDrivers } from "@/services/drivers";
import type { AccountStatus } from "@/types/user";

type VerificationFilter = "ALL" | "APPROVED" | "PENDING" | "FAILED";

export default function DriversPage() {
  const { drivers, loading, peopleError, refresh } = useOps();
  const [status, setStatus] = useState<AccountStatus | "ALL">("ALL");
  const [verification, setVerification] = useState<VerificationFilter>("ALL");
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () => filterDrivers(drivers, { status, verification, search }),
    [drivers, status, verification, search],
  );

  if (loading && drivers.length === 0) {
    return <LoadingState label="Loading drivers…" />;
  }

  if (peopleError && drivers.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load drivers." message={peopleError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="drivers-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Driver operations — users with an active driver profile.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2" data-testid="drivers-status-tabs">
        {(
          [
            { id: "ALL", label: "All" },
            { id: "ACTIVE", label: "Active" },
            { id: "INACTIVE", label: "Inactive" },
            { id: "SUSPENDED", label: "Suspended" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatus(tab.id)}
            aria-pressed={status === tab.id}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              status === tab.id
                ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
                : "border-[var(--bw-border)] text-[var(--bw-text-secondary)]",
            )}
            data-testid={`drivers-status-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="sr-only">Search drivers</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, phone, vehicle…"
            className="h-10 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
            data-testid="drivers-search"
          />
        </label>
        <label className="text-sm">
          <span className="sr-only">Verification filter</span>
          <select
            value={verification}
            onChange={(e) => setVerification(e.target.value as VerificationFilter)}
            className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
            data-testid="drivers-verification-filter"
          >
            <option value="ALL">All verification</option>
            <option value="APPROVED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No drivers found" description="Try another filter or search." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="drivers-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Driver</th>
                <th className="px-3 py-2 font-medium">Verification</th>
                <th className="px-3 py-2 font-medium">Vehicle</th>
                <th className="px-3 py-2 font-medium">Rating</th>
                <th className="px-3 py-2 font-medium">Rides</th>
                <th className="px-3 py-2 font-medium">Cancel %</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((driver) => (
                <tr
                  key={driver.driverId}
                  className="border-b border-[var(--bw-border)] last:border-0"
                  data-testid={`driver-row-${driver.driverId}`}
                  data-status={driver.status}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium">{driver.name}</div>
                    <div className="text-xs text-[var(--bw-text-muted)]">
                      {driver.driverId} · {driver.phoneMasked}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <VerificationBadge status={driver.governmentIdStatus} label="Gov" />
                      <VerificationBadge status={driver.licenceStatus} label="DL" />
                      <VerificationBadge status={driver.rcStatus} label="RC" />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {driver.vehicleRegistrationMasked ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{driver.rating.toFixed(1)}</td>
                  <td className="px-3 py-2 tabular-nums">{driver.totalRides}</td>
                  <td className="px-3 py-2 tabular-nums">{driver.cancellationRate.toFixed(1)}%</td>
                  <td className="px-3 py-2">
                    <AccountStatusBadge status={driver.status} />
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/drivers/${driver.driverId}`}
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      data-testid={`driver-open-${driver.driverId}`}
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
