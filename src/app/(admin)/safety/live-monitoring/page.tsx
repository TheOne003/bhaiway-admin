"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LiveMapCanvas } from "@/components/maps/LiveMapCanvas";
import { MapLegend } from "@/components/maps/MapLegend";
import { SosDetailPanel } from "@/components/safety/SosDetailPanel";
import { SeverityBadge, SosStatusBadge } from "@/components/status/SafetyBadges";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { isActiveSos } from "@/mock/sos";
import { useOps } from "@/providers/OpsProvider";
import type { MapMarkerModel } from "@/maps/types";

function LiveMonitoringInner() {
  const { activeRides, sosCases, incidents, safetySummary, loading, safetyError, refresh, getSos } =
    useOps();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sosId = searchParams.get("sos");
  const selectedSos = sosId ? getSos(sosId) ?? null : null;

  const safetyMarkers: MapMarkerModel[] = useMemo(() => {
    return sosCases
      .filter((s) => isActiveSos(s.status))
      .map((s) => ({
        id: `sos:${s.id}`,
        position: { lat: s.latitude, lng: s.longitude },
        network: s.networkType,
        status: "SAFETY_CRITICAL" as const,
        selected: s.id === sosId,
        label: `SOS ${s.id}`,
      }));
  }, [sosCases, sosId]);

  const onSelectMarker = useCallback(
    (id: string) => {
      if (id.startsWith("sos:")) {
        const sid = id.slice(4);
        router.replace(`/safety/live-monitoring?sos=${sid}`, { scroll: false });
        return;
      }
      router.replace(`/live-map?ride=${id}`, { scroll: false });
    },
    [router],
  );

  if (loading && !safetySummary) return <LoadingState label="Loading live monitoring…" />;
  if (safetyError && !safetySummary) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load safety data." message={safetyError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  const summary = safetySummary ?? {
    activeRides: activeRides.length,
    activeSos: 0,
    criticalIncidents: 0,
    openIncidents: 0,
    routeDeviations: 0,
    safetyEventsToday: 0,
  };

  return (
    <div className="space-y-4" data-testid="safety-live-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Live Monitoring</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Safety operations workspace — active rides and SOS.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" data-testid="safety-summary">
        <Stat label="Active rides" value={summary.activeRides} />
        <Stat label="Active SOS" value={summary.activeSos} critical={summary.activeSos > 0} />
        <Stat label="Critical incidents" value={summary.criticalIncidents} critical />
        <Stat label="Open incidents" value={summary.openIncidents} />
        <Stat label="Route deviations" value={summary.routeDeviations} />
        <Stat label="Events today" value={summary.safetyEventsToday} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="relative min-h-[420px] overflow-hidden rounded-md border border-[var(--bw-border)]">
          <LiveMapCanvas
            rides={activeRides}
            selectedRideId={null}
            onSelectRide={onSelectMarker}
            safetyMarkers={safetyMarkers}
            onSelectMarker={onSelectMarker}
          />
          <div className="absolute bottom-3 right-3">
            <MapLegend showSafety />
          </div>
        </div>

        <aside className="space-y-3 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
            Active SOS
          </h2>
          {sosCases.filter((s) => isActiveSos(s.status)).length === 0 ? (
            <EmptyState title="No active SOS events." />
          ) : (
            <ul className="space-y-2" data-testid="safety-sos-list">
              {sosCases
                .filter((s) => isActiveSos(s.status))
                .map((sos) => (
                  <li key={sos.id}>
                    <button
                      type="button"
                      className="w-full rounded-md border border-[var(--bw-border)] p-2 text-left hover:bg-[var(--bw-elevated)]"
                      onClick={() =>
                        router.replace(`/safety/live-monitoring?sos=${sos.id}`, {
                          scroll: false,
                        })
                      }
                      data-testid={`safety-sos-${sos.id}`}
                    >
                      <div className="flex flex-wrap gap-1">
                        <SeverityBadge severity={sos.severity} />
                        <SosStatusBadge status={sos.status} />
                      </div>
                      <div className="mt-1 text-sm font-medium">{sos.rideId}</div>
                      <div className="text-xs text-[var(--bw-text-muted)]">{sos.locationLabel}</div>
                    </button>
                  </li>
                ))}
            </ul>
          )}
          <div className="border-t border-[var(--bw-border)] pt-2 text-xs">
            <Link href="/safety/sos" className="text-[var(--bw-brand)] hover:underline">
              Open SOS queue →
            </Link>
            <br />
            <Link href="/safety/incidents" className="text-[var(--bw-brand)] hover:underline">
              Incidents ({incidents.length}) →
            </Link>
          </div>
        </aside>
      </div>

      <DetailDrawer
        open={Boolean(selectedSos)}
        title={selectedSos ? `SOS ${selectedSos.id}` : "SOS"}
        onClose={() => router.replace("/safety/live-monitoring", { scroll: false })}
      >
        {selectedSos ? (
          <div className="space-y-3">
            <SosDetailPanel record={selectedSos} />
            <Link
              href={`/safety/sos?id=${selectedSos.id}`}
              className="text-sm text-[var(--bw-brand)] hover:underline"
            >
              Open full SOS actions →
            </Link>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  );
}

function Stat({
  label,
  value,
  critical,
}: {
  label: string;
  value: number;
  critical?: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        critical && value > 0
          ? "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)]"
          : "border-[var(--bw-border)] bg-[var(--bw-surface)]"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-[var(--bw-text-muted)]">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function LiveMonitoringPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading live monitoring…" />}>
      <LiveMonitoringInner />
    </Suspense>
  );
}
