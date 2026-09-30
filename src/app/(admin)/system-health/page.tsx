"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SystemHealthBadge } from "@/components/status/SystemHealthBadge";
import { SystemHealthTable } from "@/components/system/SystemHealthTable";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { overallStatusLabel } from "@/lib/systemHealth";
import { useOps } from "@/providers/OpsProvider";

function SystemHealthContent() {
  const { health, loading, error, refresh } = useOps();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("service");

  const counts = useMemo(() => {
    if (!health) return null;
    return [
      { label: "Operational", value: health.counts.operational },
      { label: "Degraded", value: health.counts.degraded },
      { label: "Down", value: health.counts.down },
      { label: "Not Configured", value: health.counts.notConfigured },
    ];
  }, [health]);

  if (loading && !health) {
    return <LoadingState label="Loading system health…" />;
  }

  if (error && !health) {
    return (
      <div className="max-w-xl space-y-3">
        <ErrorState title="System Health unavailable" message={error} />
        <Button variant="secondary" onClick={() => void refresh()} data-testid="health-retry">
          Retry
        </Button>
      </div>
    );
  }

  if (!health || !counts) {
    return (
      <ErrorState
        title="System Health unavailable"
        message="Unable to load service health."
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="system-health-page">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">System Health</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Monitor BhaiWay services and external dependencies. Values are mock health-check
          responses — not live production probes.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <SystemHealthBadge status={health.overall} />
          <span className="text-sm text-[var(--bw-text-secondary)]">
            {overallStatusLabel(health.overall)}
          </span>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map((item) => (
          <div
            key={item.label}
            className="border-l-2 border-[var(--bw-border)] pl-3"
          >
            <dt className="text-xs text-[var(--bw-text-muted)]">{item.label}</dt>
            <dd className="text-xl font-semibold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>

      <SystemHealthTable health={health} initialServiceId={serviceId} />
    </div>
  );
}

export default function SystemHealthPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading system health…" />}>
      <SystemHealthContent />
    </Suspense>
  );
}
