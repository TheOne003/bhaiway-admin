"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AccountStatusBadge,
  UserTypeBadge,
  VerificationBadge,
} from "@/components/status/PeopleBadges";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { countUsersByType } from "@/mock/users";
import { useOps } from "@/providers/OpsProvider";
import { filterUsers } from "@/services/users";
import type { AccountStatus, UserType, VerificationSummaryStatus } from "@/types/user";

type TypeTab = UserType | "ALL";

export default function UsersPage() {
  const { users, loading, peopleError, refresh } = useOps();
  const [userType, setUserType] = useState<TypeTab>("ALL");
  const [status, setStatus] = useState<AccountStatus | "ALL">("ALL");
  const [verification, setVerification] = useState<VerificationSummaryStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () =>
      filterUsers(users, {
        userType,
        status,
        governmentVerification: verification,
        search,
      }),
    [users, userType, status, verification, search],
  );

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.status === "ACTIVE").length,
      drivers: countUsersByType(users, "DRIVER"),
      riders: countUsersByType(users, "RIDER"),
    }),
    [users],
  );

  if (loading && users.length === 0) {
    return <LoadingState label="Loading users…" />;
  }

  if (peopleError && users.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load users." message={peopleError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="users-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Canonical people directory — riders, drivers, and dual profiles.
        </p>
      </header>

      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        data-testid="users-summary"
      >
        <SummaryStat label="Total Users" value={summary.total} />
        <SummaryStat label="Active" value={summary.active} />
        <SummaryStat label="Drivers" value={summary.drivers} />
        <SummaryStat label="Riders" value={summary.riders} />
      </div>

      <div className="flex flex-wrap items-center gap-2" data-testid="users-type-tabs">
        {(
          [
            { id: "ALL", label: "All" },
            { id: "RIDER", label: "Riders" },
            { id: "DRIVER", label: "Drivers" },
            { id: "BOTH", label: "Both" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setUserType(tab.id)}
            aria-pressed={userType === tab.id}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              userType === tab.id
                ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
                : "border-[var(--bw-border)] text-[var(--bw-text-secondary)]",
            )}
            data-testid={`users-type-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="sr-only">Search users</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, ID, email…"
            className="h-10 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
            data-testid="users-search"
          />
        </label>
        <label className="text-sm">
          <span className="sr-only">Status filter</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AccountStatus | "ALL")}
            className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
            data-testid="users-status-filter"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="RESTRICTED">Restricted</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">Verification filter</span>
          <select
            value={verification}
            onChange={(e) =>
              setVerification(e.target.value as VerificationSummaryStatus | "ALL")
            }
            className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
            data-testid="users-verification-filter"
          >
            <option value="ALL">All verification</option>
            <option value="APPROVED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="MANUAL_REVIEW">Manual review</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No users found" description="Try another type, status, or search." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="users-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Government ID</th>
                <th className="px-3 py-2 font-medium">Corporate</th>
                <th className="px-3 py-2 font-medium">Rides</th>
                <th className="px-3 py-2 font-medium">Rating</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--bw-border)] last:border-0"
                  data-testid={`user-row-${user.id}`}
                  data-type={user.userType}
                  data-status={user.status}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-[var(--bw-text-primary)]">{user.name}</div>
                    <div className="text-xs text-[var(--bw-text-muted)]">
                      {user.id} · {user.phoneMasked}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <UserTypeBadge type={user.userType} />
                  </td>
                  <td className="px-3 py-2">
                    <VerificationBadge status={user.governmentVerificationStatus} />
                  </td>
                  <td className="px-3 py-2">
                    <VerificationBadge status={user.corporateVerificationStatus} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{user.totalRides}</td>
                  <td className="px-3 py-2 tabular-nums">{user.rating.toFixed(1)}</td>
                  <td className="px-3 py-2">
                    <AccountStatusBadge status={user.status} />
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--bw-text-secondary)]">
                    {formatIstDate(new Date(user.joinedAt))}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/users/${user.id}`}
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
                      data-testid={`user-open-${user.id}`}
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

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-[var(--bw-text-muted)]">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
