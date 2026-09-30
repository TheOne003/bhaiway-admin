import type { GeoPoint, LiveMarkerStatus } from "@/types/ride";
import type { RideNetwork } from "@/types/network";

export interface MapInitOptions {
  center?: GeoPoint;
  zoom?: number;
}

export interface MapMarkerModel {
  id: string;
  position: GeoPoint;
  network: RideNetwork;
  status: LiveMarkerStatus;
  selected?: boolean;
  label?: string;
}

/**
 * Provider-agnostic map surface.
 * Swap MockMapProvider for a real SDK later without rewriting ride/UI logic.
 */
export interface MapProvider {
  initialize(container: HTMLElement, options?: MapInitOptions): void;
  setCenter(point: GeoPoint, zoom?: number): void;
  setZoom(zoom: number): void;
  addMarker(marker: MapMarkerModel): void;
  removeMarker(id: string): void;
  updateMarker(id: string, patch: Partial<MapMarkerModel>): void;
  clearMarkers(): void;
  fitBounds(points: GeoPoint[]): void;
  drawRoute(id: string, points: GeoPoint[]): void;
  clearRoute(id: string): void;
  destroy(): void;
  onMarkerClick(handler: (markerId: string) => void): () => void;
}
