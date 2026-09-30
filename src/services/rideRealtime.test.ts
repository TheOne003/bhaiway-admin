import { beforeEach, describe, expect, it } from "vitest";
import { __resetAlertsForTests } from "@/services/alerts";
import { __resetDashboardForTests } from "@/services/dashboard";
import { __resetNotificationsForTests } from "@/services/notifications";
import { applyRealtimeEvent } from "@/services/realtimeBridge";
import { __resetRidesForTests, ridesService } from "@/services/rides";
import { __resetSystemHealthForTests } from "@/services/systemHealth";
import { interpolateAlongRoute } from "@/lib/rideGeo";

describe("ride realtime bridge", () => {
  beforeEach(() => {
    __resetSystemHealthForTests();
    __resetAlertsForTests();
    __resetNotificationsForTests();
    __resetDashboardForTests();
    __resetRidesForTests();
  });

  it("location_updated updates ride position", async () => {
    const ride = await ridesService.getRideById("BW10291");
    const nextProgress = 0.55;
    const point = interpolateAlongRoute(ride!.route.coordinates, nextProgress);
    await applyRealtimeEvent({
      id: "evt_loc",
      type: "ride.location_updated",
      timestamp: "2026-09-20T03:00:00.000Z",
      payload: {
        rideId: "BW10291",
        location: { ...point, timestamp: "2026-09-20T03:00:00.000Z" },
        routeProgress: nextProgress,
        etaMinutes: 30,
        timestamp: "2026-09-20T03:00:00.000Z",
      },
    });
    const updated = await ridesService.getRideById("BW10291");
    expect(updated?.routeProgress).toBe(0.55);
    expect(updated?.currentLocation?.lat).toBeCloseTo(point.lat, 5);
  });

  it("status_changed updates ride status", async () => {
    await applyRealtimeEvent({
      id: "evt_status",
      type: "ride.status_changed",
      timestamp: "2026-09-20T03:01:00.000Z",
      payload: {
        rideId: "BW10291",
        previousStatus: "active",
        newStatus: "delayed",
        timestamp: "2026-09-20T03:01:00.000Z",
      },
    });
    const updated = await ridesService.getRideById("BW10291");
    expect(updated?.status).toBe("delayed");
  });

  it("cancelled ride leaves active set", async () => {
    await applyRealtimeEvent({
      id: "evt_cancel",
      type: "ride.cancelled",
      timestamp: "2026-09-20T03:02:00.000Z",
      payload: {
        rideId: "BW10293",
        previousStatus: "active",
        newStatus: "cancelled",
        timestamp: "2026-09-20T03:02:00.000Z",
      },
    });
    const active = await ridesService.getActiveRides();
    expect(active.some((r) => r.id === "BW10293")).toBe(false);
  });

  it("ignores invalid ride location payload", async () => {
    const before = await ridesService.getRideById("BW10291");
    await applyRealtimeEvent({
      id: "evt_bad",
      type: "ride.location_updated",
      timestamp: "2026-09-20T03:00:00.000Z",
      payload: { rideId: "BW10291" },
    });
    const after = await ridesService.getRideById("BW10291");
    expect(after?.routeProgress).toBe(before?.routeProgress);
  });
});
