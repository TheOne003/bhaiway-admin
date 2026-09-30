import type { GeoPoint, RideLocation } from "@/types/ride";

/** Linear interpolate along a polyline by progress 0..1. */
export function interpolateAlongRoute(
  coordinates: GeoPoint[],
  progress: number,
): GeoPoint {
  if (coordinates.length === 0) return { lat: 0, lng: 0 };
  if (coordinates.length === 1) return coordinates[0];
  const p = Math.min(1, Math.max(0, progress));
  const totalSegments = coordinates.length - 1;
  const scaled = p * totalSegments;
  const index = Math.min(totalSegments - 1, Math.floor(scaled));
  const t = scaled - index;
  const a = coordinates[index];
  const b = coordinates[index + 1];
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

export function advanceRouteProgress(current: number, step = 0.05): number {
  return Math.min(1, Math.round((current + step) * 1000) / 1000);
}

export function formatEta(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes <= 0) return "Arrived";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function buildLocationFromProgress(
  coordinates: GeoPoint[],
  progress: number,
  timestamp: string,
  label?: string,
): RideLocation {
  const point = interpolateAlongRoute(coordinates, progress);
  return { ...point, timestamp, label };
}
