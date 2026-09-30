import { beforeEach, describe, expect, it } from "vitest";
import {
  advanceRouteProgress,
  formatEta,
  interpolateAlongRoute,
} from "@/lib/rideGeo";
import {
  __resetRidesForTests,
  __setRidesErrorForTests,
  filterRides,
  mapRideStatusLabel,
  ridesService,
} from "@/services/rides";
import { RIDE_NETWORK_LABELS } from "@/types/network";

describe("ridesService", () => {
  beforeEach(() => {
    __resetRidesForTests();
  });

  it("getRides returns deterministic mock set", async () => {
    const rides = await ridesService.getRides();
    expect(rides.length).toBeGreaterThanOrEqual(12);
  });

  it("getActiveRides returns only active/delayed", async () => {
    const active = await ridesService.getActiveRides();
    expect(active.every((r) => r.status === "active" || r.status === "delayed")).toBe(true);
    expect(active.length).toBeGreaterThan(0);
  });

  it("filters by network", async () => {
    const office = await ridesService.getRidesByNetwork("OFFICE");
    expect(office.every((r) => r.networkType === "OFFICE")).toBe(true);
    expect(office.length).toBeGreaterThanOrEqual(4);
    const outstation = await ridesService.getRidesByNetwork("OUTSTATION");
    expect(outstation.every((r) => r.networkType === "OUTSTATION")).toBe(true);
  });

  it("filters by status and combined filters", async () => {
    const delayed = await ridesService.getRidesByStatus("delayed");
    expect(delayed.every((r) => r.status === "delayed")).toBe(true);
    const combined = filterRides(await ridesService.getRides(), {
      networkType: "OFFICE",
      status: "active",
    });
    expect(combined.every((r) => r.networkType === "OFFICE" && r.status === "active")).toBe(
      true,
    );
  });

  it("searches by ride id and driver", async () => {
    const byId = await ridesService.getRides({ search: "BW10291" });
    expect(byId.some((r) => r.id === "BW10291")).toBe(true);
    const byDriver = await ridesService.getRides({ search: "Rahul" });
    expect(byDriver.some((r) => r.driver.name.includes("Rahul"))).toBe(true);
  });

  it("maps ride status labels", () => {
    expect(mapRideStatusLabel("active")).toBe("Active");
    expect(mapRideStatusLabel("delayed")).toBe("Delayed");
  });

  it("updates location along route without teleporting", async () => {
    const before = await ridesService.getRideById("BW10291");
    expect(before).toBeTruthy();
    const after = await ridesService.updateRideLocation("BW10291", 0.5);
    expect(after?.routeProgress).toBe(0.5);
    expect(after?.currentLocation?.lat).not.toBe(before!.route.origin.point.lat);
    const mid = interpolateAlongRoute(before!.route.coordinates, 0.5);
    expect(after?.currentLocation?.lat).toBeCloseTo(mid.lat, 5);
  });

  it("surfaces service failure", async () => {
    __setRidesErrorForTests(true);
    await expect(ridesService.getRides()).rejects.toThrow(/Unable to load rides/i);
  });
});

describe("ride geo helpers", () => {
  it("advances progress deterministically", () => {
    expect(advanceRouteProgress(0.1, 0.05)).toBe(0.15);
    expect(advanceRouteProgress(0.99, 0.05)).toBe(1);
  });

  it("formats ETA", () => {
    expect(formatEta(null)).toBe("—");
    expect(formatEta(0)).toBe("Arrived");
    expect(formatEta(45)).toBe("45 min");
    expect(formatEta(90)).toBe("1h 30m");
  });

  it("exposes network labels", () => {
    expect(RIDE_NETWORK_LABELS.OFFICE).toContain("Office");
    expect(RIDE_NETWORK_LABELS.OUTSTATION).toContain("Outstation");
  });
});
