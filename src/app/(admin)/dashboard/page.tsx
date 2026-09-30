"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Ticket, Bell, LifeBuoy, ShieldAlert } from "lucide-react";
import { LiveMapCanvas } from "@/components/maps/LiveMapCanvas";
import { PriorityBadge } from "@/components/status/PriorityBadge";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState, EmptyState } from "@/components/ui/States";
import { formatIstTime, formatRelativeTime } from "@/lib/format";
import { formatMoney, rupeesToPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ANALYTICS_REFERENCE_NOW } from "@/services/analytics";
import { transactionsService } from "@/services/transactions";
import { useOps } from "@/providers/OpsProvider";
import type { AttentionItem } from "@/types/dashboard";
import type { LedgerTransaction } from "@/types/transaction";
import type { Ride } from "@/types/ride";

function istDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isOnIstDay(iso: string, dayKey: string): boolean {
  return istDayKey(new Date(iso)) === dayKey;
}

function resolveOpsDayKey(rides: Ride[]): string {
  const today = istDayKey(new Date());
  const hasToday = rides.some(
    (r) => isOnIstDay(r.createdAt, today) || isOnIstDay(r.scheduledStart, today),
  );
  if (hasToday) return today;
  return istDayKey(new Date(ANALYTICS_REFERENCE_NOW));
}

type MapOverlay = "ALL" | "OFFICE" | "OUTSTATION" | "SOS";

export default function DashboardPage() {
  const {
    dashboard,
    loading,
    error,
    refresh,
    rides,
    activeRides,
    users,
    drivers,
    sosCases,
    assuredRides,
  } = useOps();

  const [ledger, setLedger] = useState<LedgerTransaction[]>([]);
  const [overlay, setOverlay] = useState<MapOverlay>("ALL");
  const [attentionOpen, setAttentionOpen] = useState(true);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void transactionsService.getTransactions().then(setLedger).catch(() => setLedger([]));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const dayKey = useMemo(() => resolveOpsDayKey(rides), [rides]);

  const kpis = useMemo(() => {
    const dayRides = rides.filter(
      (r) => isOnIstDay(r.createdAt, dayKey) || isOnIstDay(r.scheduledStart, dayKey),
    );
    const completedToday = dayRides.filter((r) => r.status === "completed");
    const cancelledToday = dayRides.filter((r) => r.status === "cancelled").length;
    const totalToday = dayRides.length;
    const activeNow = activeRides.length;

    const fareFromRides = completedToday.reduce((sum, r) => sum + rupeesToPaise(r.fare), 0);
    const fareFromLedger = ledger
      .filter(
        (t) =>
          t.type === "RIDE_FARE" &&
          t.status === "COMPLETED" &&
          isOnIstDay(t.createdAt, dayKey),
      )
      .reduce((sum, t) => sum + Math.abs(t.amountPaise), 0);
    const revenuePaise = fareFromLedger > 0 ? fareFromLedger : fareFromRides;

    return {
      revenuePaise,
      totalToday,
      activeNow,
      cancelledToday,
      completedToday: completedToday.length,
      users: users.length,
      drivers: drivers.filter((d) => d.status === "ACTIVE").length,
      assured: assuredRides.length,
    };
  }, [rides, activeRides, dayKey, ledger, users, drivers, assuredRides]);

  const mapCounts = useMemo(() => {
    const activeSos = sosCases.filter(
      (s) =>
        s.status === "TRIGGERED" || s.status === "ACKNOWLEDGED" || s.status === "RESPONDING",
    );
    return {
      active: activeRides.length,
      office: activeRides.filter((r) => r.networkType === "OFFICE").length,
      outstation: activeRides.filter((r) => r.networkType === "OUTSTATION").length,
      sos: activeSos.length,
      activeSos,
    };
  }, [activeRides, sosCases]);

  const mapRides = useMemo(() => {
    if (overlay === "OFFICE") return activeRides.filter((r) => r.networkType === "OFFICE");
    if (overlay === "OUTSTATION") return activeRides.filter((r) => r.networkType === "OUTSTATION");
    if (overlay === "SOS") return [];
    return activeRides;
  }, [activeRides, overlay]);

  const safetyMarkers = useMemo(() => {
    if (overlay !== "ALL" && overlay !== "SOS") return [];
    return mapCounts.activeSos.map((s) => ({
      id: `sos:${s.id}`,
      position: { lat: s.latitude, lng: s.longitude },
      network: s.networkType,
      status: "SAFETY_CRITICAL" as const,
      label: s.id,
    }));
  }, [mapCounts.activeSos, overlay]);

  const criticalAttention = useMemo(
    () => (dashboard?.needsAttention ?? []).filter((i) => i.priority === "critical"),
    [dashboard],
  );
  const warningAttention = useMemo(
    () => (dashboard?.needsAttention ?? []).filter((i) => i.priority === "warning"),
    [dashboard],
  );
  const recentFive = useMemo(
    () => (dashboard?.recentEvents ?? []).slice(0, 5),
    [dashboard],
  );

  const onSelectRide = useCallback((id: string) => setSelectedRideId(id), []);

  if (loading && !dashboard) {
    return <LoadingState label="Loading command center…" />;
  }

  if (error && !dashboard) {
    return (
      <ErrorState title="Command Center unavailable" message={error} className="max-w-xl" />
    );
  }

  if (!dashboard) {
    return (
      <ErrorState
        title="Command Center unavailable"
        message="Unable to load dashboard snapshot."
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4" data-testid="dashboard-page">
      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-[var(--bw-warning)]/40 bg-[var(--bw-warning-soft)] px-3 py-2">
          <p className="text-xs text-[var(--bw-warning)]">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      ) : null}

      {/* Primary KPI row — Revenue first & prominent */}
      <section
        className="grid grid-cols-2 gap-2.5 lg:grid-cols-4"
        aria-label="Today KPIs"
        data-testid="active-now"
      >
        <div
          className="col-span-2 rounded-xl border-2 border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] px-4 py-3 shadow-md sm:col-span-1 lg:col-span-1"
          data-testid="kpi-revenue-today"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--bw-brand)]">
            Revenue Made Today
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-[var(--bw-brand)]">
            {formatMoney(kpis.revenuePaise)}
          </p>
          <p className="text-[11px] text-[var(--bw-text-muted)]">Ops day · IST</p>
        </div>
        <KpiMini
          label="Total Rides Today"
          value={String(kpis.totalToday)}
          tone="info"
          testId="kpi-rides-today"
        />
        <KpiMini
          label="Active Rides Now"
          value={String(kpis.activeNow)}
          tone="success"
          testId="metric-active-rides"
        />
        <KpiMini
          label="Cancelled Rides"
          value={String(kpis.cancelledToday)}
          tone="danger"
          testId="kpi-cancelled-today"
        />
      </section>

      {/* Main: Large Live Map + Right Needs Attention */}
      <section className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div
          className="overflow-hidden rounded-xl border border-[var(--bw-border)] bg-[var(--bw-surface)] shadow-sm"
          data-testid="dashboard-live-map"
        >
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] px-3 py-2">
            {(
              [
                { id: "ALL", label: "Active", count: mapCounts.active },
                { id: "OFFICE", label: "Office Commute", count: mapCounts.office },
                { id: "OUTSTATION", label: "Outstation", count: mapCounts.outstation },
                { id: "SOS", label: "SOS", count: mapCounts.sos },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setOverlay(chip.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  overlay === chip.id
                    ? chip.id === "SOS"
                      ? "border-[var(--bw-danger)] bg-[var(--bw-danger)] text-white"
                      : "border-[var(--bw-brand)] bg-[var(--bw-brand)] text-white"
                    : "border-[var(--bw-border)] bg-[var(--bw-surface)] text-[var(--bw-text-secondary)] hover:border-[var(--bw-brand)]",
                )}
                data-testid={`map-overlay-${chip.id.toLowerCase()}`}
              >
                {chip.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    overlay === chip.id
                      ? "bg-white/25"
                      : "bg-[var(--bw-elevated)] text-[var(--bw-text-primary)]",
                  )}
                >
                  {chip.count}
                </span>
              </button>
            ))}
            <Link
              href="/live-map"
              className="ml-auto text-xs font-medium text-[var(--bw-brand)] hover:underline"
            >
              Open full map
            </Link>
          </div>
          <div className="h-[340px] sm:h-[400px]">
            <LiveMapCanvas
              rides={mapRides}
              selectedRideId={selectedRideId}
              onSelectRide={onSelectRide}
              safetyMarkers={safetyMarkers}
            />
          </div>
        </div>

        <NeedsAttentionPanel
          open={attentionOpen}
          onToggle={() => setAttentionOpen((v) => !v)}
          critical={criticalAttention}
          warningCount={warningAttention.length}
          totalCount={(dashboard.needsAttention ?? []).length}
        />
      </section>

      {/* Secondary KPI row */}
      <section
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        aria-label="Supporting KPIs"
        data-testid="dashboard-secondary-kpis"
      >
        <KpiMini label="Completed Rides" value={String(kpis.completedToday)} tone="success" />
        <KpiMini label="Users" value={String(kpis.users)} tone="brand" />
        <KpiMini label="Drivers" value={String(kpis.drivers)} tone="info" />
        <KpiMini label="Assured Rides" value={String(kpis.assured)} tone="warning" />
      </section>

      {/* Bottom: Recent activity + Quick actions */}
      <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
        <section
          className="rounded-xl border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4 shadow-sm"
          data-testid="recent-events"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--bw-text-primary)]">
              Recent Activity
            </h2>
            <Link href="/alerts" className="text-xs font-medium text-[var(--bw-brand)] hover:underline">
              View all alerts
            </Link>
          </div>
          {recentFive.length === 0 ? (
            <EmptyState title="No recent events" description="Operational timeline is empty." />
          ) : (
            <ol className="space-y-2.5">
              {recentFive.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-[var(--bw-border)] bg-[var(--bw-elevated)]/60 px-3 py-2"
                  data-testid="timeline-event"
                >
                  <div className="min-w-0">
                    {event.href ? (
                      <Link
                        href={event.href}
                        className="text-sm font-medium text-[var(--bw-text-primary)] hover:text-[var(--bw-brand)] hover:underline"
                      >
                        {event.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{event.title}</p>
                    )}
                    <p className="text-[11px] text-[var(--bw-text-muted)]">
                      {formatIstTime(new Date(event.timestamp))} ·{" "}
                      {formatRelativeTime(event.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section
          className="rounded-xl border border-[var(--bw-brand)]/30 bg-[var(--bw-brand-soft)] p-4 shadow-sm"
          data-testid="dashboard-quick-actions"
          aria-label="Quick actions"
        >
          <h2 className="mb-3 text-sm font-semibold text-[var(--bw-brand)]">Quick Actions</h2>
          <div className="grid gap-2">
            <QuickAction href="/coupons" icon={Ticket} label="Create Coupon" />
            <QuickAction href="/notifications?compose=1" icon={Bell} label="Send Notification" />
            <QuickAction href="/support" icon={LifeBuoy} label="Support" />
            <QuickAction href="/safety/incidents" icon={ShieldAlert} label="Incidents" />
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiMini({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: string;
  tone: "brand" | "success" | "warning" | "danger" | "info";
  testId?: string;
}) {
  const tones = {
    brand: "border-[var(--bw-brand)]/35 bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
    success: "border-[var(--bw-success)]/35 bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
    warning: "border-[var(--bw-warning)]/35 bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
    danger: "border-[var(--bw-danger)]/35 bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
    info: "border-[var(--bw-info)]/35 bg-[var(--bw-info-soft)] text-[var(--bw-info)]",
  } as const;
  return (
    <div className={cn("rounded-lg border px-3 py-2.5 shadow-sm", tones[tone])} data-testid={testId}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Ticket;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md border border-[var(--bw-brand)]/25 bg-[var(--bw-surface)] px-3 py-2 text-sm font-medium text-[var(--bw-text-primary)] transition-colors hover:border-[var(--bw-brand)] hover:bg-[var(--bw-brand)] hover:text-white"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

function NeedsAttentionPanel({
  open,
  onToggle,
  critical,
  warningCount,
  totalCount,
}: {
  open: boolean;
  onToggle: () => void;
  critical: AttentionItem[];
  warningCount: number;
  totalCount: number;
}) {
  return (
    <aside
      className="flex flex-col overflow-hidden rounded-xl border-2 border-[var(--bw-danger)]/40 bg-[var(--bw-danger-soft)] shadow-md"
      data-testid="needs-attention"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-danger)]"
        data-testid="needs-attention-toggle"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--bw-danger)]">
            Needs Attention
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--bw-text-secondary)]">
            Critical only · {critical.length} open
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--bw-danger)] px-2 text-xs font-bold text-white">
            {critical.length}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[var(--bw-danger)] transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </div>
      </button>

      {open ? (
        <div className="flex-1 space-y-2 border-t border-[var(--bw-danger)]/20 px-3 py-3">
          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase">
            <span className="rounded-full bg-[var(--bw-danger)] px-2 py-0.5 text-white">
              Critical {critical.length}
            </span>
            <span className="rounded-full bg-[var(--bw-warning)] px-2 py-0.5 text-white">
              Warning {warningCount}
            </span>
            <span className="rounded-full bg-[var(--bw-brand)] px-2 py-0.5 text-white">
              Total {totalCount}
            </span>
          </div>

          {critical.length === 0 ? (
            <p className="rounded-md border border-[var(--bw-success)]/40 bg-[var(--bw-success-soft)] px-3 py-2 text-sm text-[var(--bw-success)]">
              No critical issues right now.
            </p>
          ) : (
            <ul className="max-h-[320px] space-y-2 overflow-y-auto">
              {critical.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-[var(--bw-danger)]/30 bg-[var(--bw-surface)] p-2.5"
                  data-testid="attention-item"
                  data-priority={item.priority}
                >
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={item.priority} />
                    <span className="text-[10px] text-[var(--bw-text-muted)]">{item.source}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[var(--bw-text-primary)]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--bw-text-secondary)]">
                    {item.description}
                  </p>
                  <Link
                    href={item.href}
                    className="mt-2 inline-block text-xs font-medium text-[var(--bw-danger)] hover:underline"
                  >
                    {item.actionLabel}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/alerts"
            className="block text-center text-xs font-medium text-[var(--bw-brand)] hover:underline"
          >
            Open all alerts
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
