"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import {
  KpiCard,
  KpiGrid,
  PageContainer,
  PageHeader,
} from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { analyticsService } from "@/services/analytics";
import type {
  AnalyticsFilters,
  AnalyticsOverview,
  MetricValue,
  TimeSeriesPoint,
} from "@/types/analytics";

const DEFAULT_FILTERS: AnalyticsFilters = {
  range: "30D",
  network: "ALL",
  userType: "ALL",
};

function metricValue(list: MetricValue[], key: string): number | null {
  return list.find((m) => m.key === key)?.value ?? null;
}

function formatCount(v: number | null): string {
  if (v == null) return "Not available";
  return v.toLocaleString("en-IN");
}

function MetricCell({ m }: { m: MetricValue }) {
  return (
    <div className="border-l-2 border-[var(--bw-border)] pl-3" data-testid={`metric-${m.key}`}>
      <dt className="text-xs text-[var(--bw-text-muted)]">{m.label}</dt>
      <dd className="text-lg font-semibold tabular-nums">
        {m.value == null ? (
          <span className="text-sm font-normal text-[var(--bw-text-muted)]">Not available</span>
        ) : (
          m.value.toLocaleString("en-IN")
        )}
      </dd>
    </div>
  );
}

function SimpleBars({
  points,
  field,
  label,
}: {
  points: TimeSeriesPoint[];
  field: keyof Pick<TimeSeriesPoint, "rides" | "users" | "sos" | "support">;
  label: string;
}) {
  const max = Math.max(1, ...points.map((p) => p[field]));
  return (
    <div className="space-y-2" data-testid={`chart-${field}`} role="img" aria-label={label}>
      <p className="text-sm font-medium">{label}</p>
      <ul className="flex h-28 items-end gap-1 overflow-x-auto">
        {points.map((p) => {
          const v = p[field];
          const h = Math.round((v / max) * 100);
          return (
            <li key={p.date} className="flex min-w-[1.25rem] flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[var(--bw-accent)]/80"
                style={{ height: `${Math.max(v > 0 ? 8 : 2, h)}%` }}
                title={`${p.date}: ${v}`}
              />
              <span className="text-[9px] text-[var(--bw-text-muted)]">{p.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AnalyticsWorkspace() {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: AnalyticsFilters) => {
    setLoading(true);
    try {
      const overview = await analyticsService.getOverviewMetrics(f);
      setData(overview);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(filters), 0);
    return () => window.clearTimeout(id);
  }, [filters, load]);

  const networkTotal = useMemo(() => {
    if (!data) return 0;
    return data.networkSplit.officeRides + data.networkSplit.outstationRides;
  }, [data]);

  if (loading && !data) return <LoadingState label="Loading analytics…" />;
  if (error && !data) {
    return (
      <div className="max-w-xl space-y-3">
        <ErrorState title="Unable to load analytics." message={error} />
        <Button variant="secondary" onClick={() => void load(filters)} data-testid="analytics-retry">
          Retry
        </Button>
      </div>
    );
  }
  if (!data) {
    return <EmptyState title="No analytics available." description="No metrics for this filter set." />;
  }

  const revenue = metricValue(data.money, "txn_volume");
  const rides = metricValue(data.rides, "total_rides");
  const completed = metricValue(data.rides, "completed");
  const cancelled = metricValue(data.rides, "cancelled");
  const active = metricValue(data.rides, "active_rides");
  const users = metricValue(data.users, "total_users");
  const drivers = metricValue(data.rides, "active_drivers");
  const assured = metricValue(data.assured, "assured_cases");

  return (
    <PageContainer width="wide" testId="analytics-page">
      <PageHeader
        title="Analytics"
        description={`Operational metrics from domain services · ${new Date(data.generatedAt).toLocaleString("en-IN")}`}
      />

      <section
        className="flex flex-wrap gap-3 border-b border-[var(--bw-border)] pb-3"
        data-testid="analytics-filters"
        aria-label="Analytics filters"
      >
        <label className="text-sm">
          <span className="mr-2 text-[var(--bw-text-muted)]">Range</span>
          <select
            className="rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
            value={filters.range}
            data-testid="analytics-range"
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                range: e.target.value as AnalyticsFilters["range"],
              }))
            }
          >
            <option value="TODAY">Today</option>
            <option value="7D">7 Days</option>
            <option value="30D">30 Days</option>
            <option value="90D">90 Days</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 text-[var(--bw-text-muted)]">Network</span>
          <select
            className="rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
            value={filters.network}
            data-testid="analytics-network"
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                network: e.target.value as AnalyticsFilters["network"],
              }))
            }
          >
            <option value="ALL">All</option>
            <option value="OFFICE">Office Commute</option>
            <option value="OUTSTATION">Outstation</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 text-[var(--bw-text-muted)]">User type</span>
          <select
            className="rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
            value={filters.userType}
            data-testid="analytics-user-type"
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                userType: e.target.value as AnalyticsFilters["userType"],
              }))
            }
          >
            <option value="ALL">All</option>
            <option value="RIDER">Rider</option>
            <option value="DRIVER">Driver</option>
            <option value="BOTH">Both</option>
          </select>
        </label>
        {filters.range === "CUSTOM" ? (
          <>
            <label className="text-sm">
              From
              <input
                type="date"
                className="ml-2 rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
                data-testid="analytics-custom-from"
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    customFrom: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined,
                  }))
                }
              />
            </label>
            <label className="text-sm">
              To
              <input
                type="date"
                className="ml-2 rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
                data-testid="analytics-custom-to"
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    customTo: e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined,
                  }))
                }
              />
            </label>
          </>
        ) : null}
      </section>

      <KpiGrid>
        <KpiCard
          label="Revenue"
          value={revenue == null ? "Not available" : formatMoney(revenue)}
          hint="Txn volume"
          testId="analytics-kpi-revenue"
          tone="brand"
        />
        <KpiCard
          label="Total Rides"
          value={formatCount(rides)}
          testId="analytics-kpi-rides"
          tone="info"
        />
        <KpiCard
          label="Completed"
          value={formatCount(completed)}
          testId="analytics-kpi-completed"
          tone="success"
        />
        <KpiCard
          label="Cancelled"
          value={formatCount(cancelled)}
          testId="analytics-kpi-cancelled"
          tone="danger"
        />
        <KpiCard
          label="Active"
          value={formatCount(active)}
          testId="analytics-kpi-active"
          tone="warning"
        />
        <KpiCard
          label="Users"
          value={formatCount(users)}
          testId="analytics-kpi-users"
          tone="brand"
        />
        <KpiCard
          label="Drivers"
          value={formatCount(drivers)}
          testId="analytics-kpi-drivers"
          tone="info"
        />
        <KpiCard
          label="Assured"
          value={formatCount(assured)}
          testId="analytics-kpi-assured"
          tone="success"
        />
      </KpiGrid>

      <section aria-labelledby="activity-heading" className="space-y-3">
        <h2 id="activity-heading" className="text-sm font-semibold">
          Activity
        </h2>
        {data.timeSeries.length === 0 ? (
          <EmptyState title="No activity in this range." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <SimpleBars points={data.timeSeries} field="rides" label="Rides over time" />
            <SimpleBars points={data.timeSeries} field="users" label="New users over time" />
          </div>
        )}
      </section>

      <section aria-labelledby="network-heading">
        <h2 id="network-heading" className="mb-2 text-sm font-semibold">
          Network split
        </h2>
        <div className="space-y-2" data-testid="network-split">
          <p className="text-sm text-[var(--bw-text-secondary)]">
            Office: {data.networkSplit.officeRides} · Outstation:{" "}
            {data.networkSplit.outstationRides}
          </p>
          <div
            className="flex h-2.5 overflow-hidden rounded bg-[var(--bw-border)]"
            role="img"
            aria-label="Network split bar"
          >
            <div
              className={cn("bg-[var(--bw-accent)]")}
              style={{
                width: `${networkTotal ? (data.networkSplit.officeRides / networkTotal) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-[var(--bw-text-muted)]"
              style={{
                width: `${networkTotal ? (data.networkSplit.outstationRides / networkTotal) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </section>

      {(
        [
          ["Operations", data.rides],
          ["Users", data.users],
          ["Safety", data.safety],
          ["Money", data.money],
          ["Support", data.support],
          ["Assured Ride", data.assured],
        ] as const
      ).map(([title, metrics]) => (
        <section key={title} aria-labelledby={`${title}-heading`}>
          <h2 id={`${title}-heading`} className="mb-2 text-sm font-semibold">
            {title}
          </h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {metrics.map((m) => (
              <MetricCell key={m.key} m={m} />
            ))}
          </dl>
        </section>
      ))}
    </PageContainer>
  );
}

export default function AnalyticsPage() {
  return (
    <PermissionGuard permission="analytics.view">
      <AnalyticsWorkspace />
    </PermissionGuard>
  );
}
