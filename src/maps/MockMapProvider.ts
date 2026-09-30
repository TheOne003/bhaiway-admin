import type { GeoPoint } from "@/types/ride";
import type { MapInitOptions, MapMarkerModel, MapProvider } from "./types";

/**
 * Mock map renderer — SVG coordinate plane.
 * Not a production tile provider; architecture-ready for replacement.
 */
export class MockMapProvider implements MapProvider {
  private container: HTMLElement | null = null;
  private root: HTMLDivElement | null = null;
  private svg: SVGSVGElement | null = null;
  private markersLayer: SVGGElement | null = null;
  private routesLayer: SVGGElement | null = null;
  private markers = new Map<string, MapMarkerModel>();
  private routes = new Map<string, GeoPoint[]>();
  private clickHandlers = new Set<(id: string) => void>();
  private center: GeoPoint = { lat: 28.6, lng: 77.2 };
  private zoom = 8;
  private bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null =
    null;

  initialize(container: HTMLElement, options: MapInitOptions = {}): void {
    this.destroy();
    this.container = container;
    this.center = options.center ?? this.center;
    this.zoom = options.zoom ?? this.zoom;

    const root = document.createElement("div");
    root.className = "bw-mock-map relative h-full w-full overflow-hidden rounded-md";
    root.setAttribute("data-testid", "mock-map");
    root.setAttribute("role", "application");
    root.setAttribute("aria-label", "Live rides map");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1000 700");
    svg.setAttribute("class", "h-full w-full");
    svg.style.background =
      "linear-gradient(160deg, var(--bw-elevated) 0%, var(--bw-surface) 55%, var(--bw-bg) 100%)";

    const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");
    grid.setAttribute("opacity", "0.35");
    for (let i = 0; i <= 10; i += 1) {
      const v = document.createElementNS("http://www.w3.org/2000/svg", "line");
      v.setAttribute("x1", String(i * 100));
      v.setAttribute("x2", String(i * 100));
      v.setAttribute("y1", "0");
      v.setAttribute("y2", "700");
      v.setAttribute("stroke", "var(--bw-border)");
      v.setAttribute("stroke-width", "1");
      grid.appendChild(v);
      const h = document.createElementNS("http://www.w3.org/2000/svg", "line");
      h.setAttribute("y1", String(i * 70));
      h.setAttribute("y2", String(i * 70));
      h.setAttribute("x1", "0");
      h.setAttribute("x2", "1000");
      h.setAttribute("stroke", "var(--bw-border)");
      h.setAttribute("stroke-width", "1");
      grid.appendChild(h);
    }

    const routesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const markersLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");

    svg.appendChild(grid);
    svg.appendChild(routesLayer);
    svg.appendChild(markersLayer);
    root.appendChild(svg);

    const caption = document.createElement("div");
    caption.className =
      "pointer-events-none absolute bottom-2 left-2 rounded border border-[var(--bw-border)] bg-[var(--bw-surface)]/90 px-2 py-1 text-[10px] text-[var(--bw-text-muted)]";
    caption.textContent = "Mock map · provider abstraction (not live tiles)";
    root.appendChild(caption);

    container.innerHTML = "";
    container.appendChild(root);

    this.root = root;
    this.svg = svg;
    this.routesLayer = routesLayer;
    this.markersLayer = markersLayer;
    this.render();
  }

  setCenter(point: GeoPoint, zoom?: number): void {
    this.center = point;
    if (zoom != null) this.zoom = zoom;
    this.render();
  }

  setZoom(zoom: number): void {
    this.zoom = zoom;
    this.render();
  }

  addMarker(marker: MapMarkerModel): void {
    this.markers.set(marker.id, marker);
    this.render();
  }

  removeMarker(id: string): void {
    this.markers.delete(id);
    this.render();
  }

  updateMarker(id: string, patch: Partial<MapMarkerModel>): void {
    const current = this.markers.get(id);
    if (!current) return;
    this.markers.set(id, { ...current, ...patch, id });
    this.render();
  }

  clearMarkers(): void {
    this.markers.clear();
    this.render();
  }

  fitBounds(points: GeoPoint[]): void {
    if (points.length === 0) return;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    this.bounds = {
      minLat: Math.min(...lats) - 0.05,
      maxLat: Math.max(...lats) + 0.05,
      minLng: Math.min(...lngs) - 0.05,
      maxLng: Math.max(...lngs) + 0.05,
    };
    this.center = {
      lat: (this.bounds.minLat + this.bounds.maxLat) / 2,
      lng: (this.bounds.minLng + this.bounds.maxLng) / 2,
    };
    this.render();
  }

  drawRoute(id: string, points: GeoPoint[]): void {
    this.routes.set(id, points);
    this.render();
  }

  clearRoute(id: string): void {
    this.routes.delete(id);
    this.render();
  }

  destroy(): void {
    if (this.container) this.container.innerHTML = "";
    this.container = null;
    this.root = null;
    this.svg = null;
    this.markersLayer = null;
    this.routesLayer = null;
    this.markers.clear();
    this.routes.clear();
    this.clickHandlers.clear();
  }

  onMarkerClick(handler: (markerId: string) => void): () => void {
    this.clickHandlers.add(handler);
    return () => this.clickHandlers.delete(handler);
  }

  private project(point: GeoPoint): { x: number; y: number } {
    const span = Math.max(0.2, 12 / Math.max(this.zoom, 1));
    const bounds = this.bounds ?? {
      minLat: this.center.lat - span / 2,
      maxLat: this.center.lat + span / 2,
      minLng: this.center.lng - span / 2,
      maxLng: this.center.lng + span / 2,
    };
    const x =
      ((point.lng - bounds.minLng) / Math.max(0.0001, bounds.maxLng - bounds.minLng)) * 1000;
    const y =
      (1 - (point.lat - bounds.minLat) / Math.max(0.0001, bounds.maxLat - bounds.minLat)) *
      700;
    return { x, y };
  }

  private render(): void {
    if (!this.markersLayer || !this.routesLayer) return;
    this.routesLayer.innerHTML = "";
    this.markersLayer.innerHTML = "";

    this.routes.forEach((points) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      path.setAttribute(
        "points",
        points
          .map((p) => {
            const { x, y } = this.project(p);
            return `${x},${y}`;
          })
          .join(" "),
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "var(--bw-brand)");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("stroke-opacity", "0.55");
      this.routesLayer?.appendChild(path);
    });

    this.markers.forEach((marker) => {
      const { x, y } = this.project(marker.position);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `translate(${x} ${y})`);
      g.style.cursor = "pointer";
      g.setAttribute("data-testid", `map-marker-${marker.id}`);
      g.setAttribute("data-network", marker.network);
      g.setAttribute("data-status", marker.status);
      g.setAttribute("data-selected", String(Boolean(marker.selected)));
      g.setAttribute("tabindex", "0");
      g.setAttribute("focusable", "true");
      g.setAttribute("role", "button");
      g.setAttribute(
        "aria-label",
        `${marker.network} ride ${marker.id}, ${marker.status}${marker.selected ? ", selected" : ""}`,
      );

      const isOffice = marker.network === "OFFICE";
      const shape = isOffice
        ? (() => {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", "-9");
            rect.setAttribute("y", "-9");
            rect.setAttribute("width", "18");
            rect.setAttribute("height", "18");
            rect.setAttribute("rx", "2");
            return rect;
          })()
        : (() => {
            const diamond = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            diamond.setAttribute("points", "0,-11 11,0 0,11 -11,0");
            return diamond;
          })();

      const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hit.setAttribute("r", "16");
      hit.setAttribute("fill", "transparent");
      hit.style.cursor = "pointer";

      const fill =
        marker.status === "DELAYED"
          ? "var(--bw-warning)"
          : marker.status === "AT_RISK" || marker.status === "SAFETY_CRITICAL"
            ? "var(--bw-danger)"
            : isOffice
              ? "var(--bw-office)"
              : "var(--bw-outstation)";

      shape.setAttribute("fill", fill);
      shape.setAttribute("stroke", marker.selected ? "var(--bw-text-primary)" : "var(--bw-surface)");
      shape.setAttribute("stroke-width", marker.selected ? "3" : "2");

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("y", "28");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("font-size", "10");
      label.setAttribute("fill", "var(--bw-text-secondary)");
      label.textContent = marker.label ?? marker.id;

      g.appendChild(hit);
      g.appendChild(shape);
      g.appendChild(label);

      const activate = () => this.clickHandlers.forEach((handler) => handler(marker.id));
      hit.addEventListener("click", activate);
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });

      this.markersLayer?.appendChild(g);
    });
  }
}

export function createMapProvider(): MapProvider {
  return new MockMapProvider();
}
