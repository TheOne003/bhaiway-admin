"use client";

import { useEffect, useMemo, useRef } from "react";
import { createMapProvider, type MapProvider, type MapMarkerModel } from "@/maps";
import { isLiveOnMap, toLiveMarkerStatus, type Ride } from "@/types/ride";

interface LiveMapCanvasProps {
  rides: Ride[];
  selectedRideId: string | null;
  onSelectRide: (rideId: string) => void;
  safetyMarkers?: MapMarkerModel[];
  selectedMarkerId?: string | null;
  onSelectMarker?: (markerId: string) => void;
}

export function LiveMapCanvas({
  rides,
  selectedRideId,
  onSelectRide,
  safetyMarkers = [],
  selectedMarkerId = null,
  onSelectMarker,
}: LiveMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<MapProvider | null>(null);
  const onSelectRef = useRef(onSelectRide);
  const onMarkerRef = useRef(onSelectMarker);
  useEffect(() => {
    onSelectRef.current = onSelectRide;
  }, [onSelectRide]);
  useEffect(() => {
    onMarkerRef.current = onSelectMarker;
  }, [onSelectMarker]);

  const liveRides = useMemo(() => rides.filter(isLiveOnMap), [rides]);

  useEffect(() => {
    if (!containerRef.current) return;
    const provider = createMapProvider();
    provider.initialize(containerRef.current, {
      center: { lat: 28.55, lng: 77.2 },
      zoom: 8,
    });
    const unsubscribe = provider.onMarkerClick((id) => {
      if (onMarkerRef.current) onMarkerRef.current(id);
      else onSelectRef.current(id);
    });
    providerRef.current = provider;
    return () => {
      unsubscribe();
      provider.destroy();
      providerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.clearMarkers();
    liveRides.forEach((ride) => {
      if (!ride.currentLocation) return;
      provider.addMarker({
        id: ride.id,
        position: ride.currentLocation,
        network: ride.networkType,
        status: toLiveMarkerStatus(ride),
        selected: ride.id === selectedRideId,
        label: ride.id,
      });
    });
    safetyMarkers.forEach((marker) =>
      provider.addMarker({
        ...marker,
        selected: marker.id === selectedMarkerId,
      }),
    );

    const points = [
      ...liveRides
        .map((r) => r.currentLocation)
        .filter(Boolean)
        .map((loc) => ({ lat: loc!.lat, lng: loc!.lng })),
      ...safetyMarkers.map((m) => m.position),
    ];
    if (points.length > 0) provider.fitBounds(points);

    liveRides.forEach((r) => provider.clearRoute(r.id));
    const selected = liveRides.find((r) => r.id === selectedRideId);
    if (selected?.currentLocation) {
      provider.drawRoute(selected.id, selected.route.coordinates);
      provider.setCenter(selected.currentLocation, 9);
    }
  }, [liveRides, selectedRideId, safetyMarkers, selectedMarkerId]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[420px] w-full"
      data-testid="live-map-canvas"
    />
  );
}
