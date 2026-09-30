"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LiveMapCanvas } from "@/components/maps/LiveMapCanvas";
import { MapLegend } from "@/components/maps/MapLegend";
import { SosDetailPanel } from "@/components/safety/SosDetailPanel";
import { RideDetailDrawer } from "@/components/rides/RideDetailDrawer";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { cn } from "@/lib/utils";
import type { MapMarkerModel } from "@/maps/types";
import { useOps } from "@/providers/OpsProvider";
import type { RideNetwork } from "@/types/network";
import { toLiveMarkerStatus, type Ride } from "@/types/ride";

type NetworkFilter = "ALL" | RideNetwork;
type StatusFilter = "ALL" | "active" | "delayed" | "at_risk";
type SafetyFilter = "ALL" | "safe" | "attention";
type LayerFilter = "ALL" | "RIDES" | "SOS" | "INCIDENTS" | "SAFETY_CRITICAL";

function LiveMapInner() {
  const {
    activeRides,
    rides,
    loading,
    ridesError,
    refresh,
    getRide,
    sosCases,
    incidents,
  } = useOps();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedRideId = searchParams.get("ride");
  const selectedSosParam = searchParams.get("sos");

  const [network, setNetwork] = useState<NetworkFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [safety, setSafety] = useState<SafetyFilter>("ALL");
  const [layer, setLayer] = useState<LayerFilter>("ALL");

  const activeSos = useMemo(
    () => sosCases.filter((s) => s.status === "TRIGGERED" || s.status === "ACKNOWLEDGED" || s.status === "RESPONDING"),
    [sosCases],
  );
  const openIncidents = useMemo(
    () =>
      incidents.filter(
        (i) => i.status === "OPEN" || i.status === "INVESTIGATING" || i.status === "ESCALATED",
      ),
    [incidents],
  );
  const safetyLoadError = null;

  const filteredRides = useMemo(() => {
    return activeRides.filter((ride) => {
      if (network !== "ALL" && ride.networkType !== network) return false;
      if (status === "active" && ride.status !== "active") return false;
      if (status === "delayed" && ride.status !== "delayed") return false;
      if (status === "at_risk" && ride.safetyStatus === "safe") return false;
      if (safety === "safe" && ride.safetyStatus !== "safe") return false;
      if (safety === "attention" && ride.safetyStatus === "safe") return false;
      return true;
    });
  }, [activeRides, network, status, safety]);

  const sosMarkers = useMemo((): MapMarkerModel[] => {
    return activeSos
      .filter((s) => network === "ALL" || s.networkType === network)
      .map((s) => ({
        id: `sos:${s.id}`,
        position: { lat: s.latitude, lng: s.longitude },
        network: s.networkType,
        status: "SAFETY_CRITICAL" as const,
        label: s.id,
      }));
  }, [activeSos, network]);

  const incidentMarkers = useMemo((): MapMarkerModel[] => {
    return openIncidents
      .filter(
        (i) =>
          i.latitude != null &&
          i.longitude != null &&
          (network === "ALL" || i.networkType === network),
      )
      .map((i) => ({
        id: `inc:${i.id}`,
        position: { lat: i.latitude!, lng: i.longitude! },
        network: i.networkType ?? "OFFICE",
        status:
          i.severity === "CRITICAL" ? ("SAFETY_CRITICAL" as const) : ("AT_RISK" as const),
        label: i.id,
      }));
  }, [openIncidents, network]);

  const ridesForMap = useMemo(() => {
    if (layer === "SOS" || layer === "INCIDENTS") return [] as Ride[];
    if (layer === "SAFETY_CRITICAL") {
      return filteredRides.filter((r) => toLiveMarkerStatus(r) === "SAFETY_CRITICAL");
    }
    return filteredRides;
  }, [filteredRides, layer]);

  const safetyMarkers = useMemo(() => {
    if (layer === "RIDES") return [];
    if (layer === "SOS") return sosMarkers;
    if (layer === "INCIDENTS") return incidentMarkers;
    if (layer === "SAFETY_CRITICAL") {
      return [...sosMarkers, ...incidentMarkers.filter((m) => m.status === "SAFETY_CRITICAL")];
    }
    return [...sosMarkers, ...incidentMarkers];
  }, [layer, sosMarkers, incidentMarkers]);

  const mapEmpty = ridesForMap.length === 0 && safetyMarkers.length === 0;

  const selectedRide = selectedRideId ? (getRide(selectedRideId) ?? null) : null;
  const selectedSos = useMemo(
    () => activeSos.find((s) => s.id === selectedSosParam) ?? null,
    [activeSos, selectedSosParam],
  );

  const onSelectRide = useCallback(
    (rideId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("ride", rideId);
      params.delete("sos");
      router.replace(`/live-map?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const onSelectMarker = useCallback(
    (markerId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (markerId.startsWith("sos:")) {
        params.delete("ride");
        params.set("sos", markerId.replace("sos:", ""));
        params.delete("incident");
        router.replace(`/live-map?${params.toString()}`, { scroll: false });
        return;
      }
      if (markerId.startsWith("inc:")) {
        params.delete("ride");
        params.delete("sos");
        params.set("incident", markerId.replace("inc:", ""));
        router.replace(`/live-map?${params.toString()}`, { scroll: false });
        return;
      }
      params.set("ride", markerId);
      params.delete("sos");
      params.delete("incident");
      router.replace(`/live-map?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const onCloseDrawer = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("ride");
    params.delete("sos");
    params.delete("incident");
    const qs = params.toString();
    router.replace(qs ? `/live-map?${qs}` : "/live-map", { scroll: false });
  }, [router, searchParams]);

  if (loading && rides.length === 0) {
    return <LoadingState label="Loading live rides..." />;
  }

  if (ridesError && rides.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorState title="Live map unavailable." message={ridesError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex h-[calc(100vh-7rem)] min-h-[560px] flex-col gap-3"
      data-testid="live-map-page"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Live Map</h1>
          <p className="text-sm text-[var(--bw-text-secondary)]">
            Where are BhaiWay&apos;s active rides right now? · {ridesForMap.length} rides ·{" "}
            {safetyMarkers.length} safety markers
          </p>
        </div>
        <p className="text-xs text-[var(--bw-text-muted)]" data-testid="live-map-state">
          Live · Mock GPS
        </p>
      </header>

      {safetyLoadError ? (
        <p className="text-xs text-[var(--bw-warning)]" role="status">
          {safetyLoadError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-4 text-sm">
        <FilterGroup
          label="Layer"
          value={layer}
          options={[
            { id: "ALL", label: "All" },
            { id: "RIDES", label: "Rides" },
            { id: "SOS", label: "SOS" },
            { id: "INCIDENTS", label: "Incidents" },
            { id: "SAFETY_CRITICAL", label: "Safety Critical" },
          ]}
          onChange={(v) => setLayer(v as LayerFilter)}
          testId="map-layer-filter"
        />
        <FilterGroup
          label="Network"
          value={network}
          options={[
            { id: "ALL", label: "All" },
            { id: "OFFICE", label: "Office" },
            { id: "OUTSTATION", label: "Outstation" },
          ]}
          onChange={(v) => setNetwork(v as NetworkFilter)}
          testId="map-network-filter"
        />
        <FilterGroup
          label="Status"
          value={status}
          options={[
            { id: "ALL", label: "All" },
            { id: "active", label: "Active" },
            { id: "delayed", label: "Delayed" },
            { id: "at_risk", label: "At Risk" },
          ]}
          onChange={(v) => setStatus(v as StatusFilter)}
          testId="map-status-filter"
        />
        <FilterGroup
          label="Safety"
          value={safety}
          options={[
            { id: "ALL", label: "All" },
            { id: "safe", label: "No Issue" },
            { id: "attention", label: "Attention Required" },
          ]}
          onChange={(v) => setSafety(v as SafetyFilter)}
          testId="map-safety-filter"
        />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
        {mapEmpty ? (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              title="Nothing to show on map."
              description="Adjust layer or network filters, or wait for live activity."
            />
          </div>
        ) : (
          <LiveMapCanvas
            rides={ridesForMap}
            selectedRideId={selectedRideId}
            onSelectRide={onSelectRide}
            safetyMarkers={safetyMarkers}
            selectedMarkerId={
              selectedSosParam ? `sos:${selectedSosParam}` : null
            }
            onSelectMarker={onSelectMarker}
          />
        )}
        <MapLegend className="absolute right-3 top-3 z-10 hidden sm:block" />
      </div>

      <RideDetailDrawer
        ride={selectedRide}
        open={Boolean(selectedRideId && selectedRide)}
        onClose={onCloseDrawer}
      />

      <DetailDrawer
        open={Boolean(selectedSos)}
        title={selectedSos ? `SOS ${selectedSos.id}` : "SOS"}
        onClose={onCloseDrawer}
      >
        {selectedSos ? (
          <div className="space-y-3">
            <SosDetailPanel record={selectedSos} />
            <Link
              href={`/safety/sos?sos=${selectedSos.id}`}
              className="text-sm font-medium text-[var(--bw-brand)] hover:underline"
            >
              Open in SOS queue
            </Link>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
  testId: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      data-testid={testId}
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
        {label}
      </span>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-medium",
            value === opt.id
              ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
              : "border-[var(--bw-border)] text-[var(--bw-text-secondary)] hover:bg-[var(--bw-elevated)]",
          )}
          data-testid={`${testId}-${opt.id}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function LiveMapPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading live rides..." />}>
      <LiveMapInner />
    </Suspense>
  );
}
