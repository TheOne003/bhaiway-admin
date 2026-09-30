import { beforeEach, describe, expect, it } from "vitest";
import { applyRealtimeEvent } from "@/services/realtimeBridge";
import { __resetAlertsForTests, alertsService } from "@/services/alerts";
import { __resetNotificationsForTests, notificationsService } from "@/services/notifications";
import { __resetDashboardForTests, dashboardService } from "@/services/dashboard";
import { __resetRidesForTests, ridesService } from "@/services/rides";
import { __resetSystemHealthForTests } from "@/services/systemHealth";
import { __resetSafetyForTests, safetyService } from "@/services/safety";
import { __resetIncidentsForTests, incidentsService } from "@/services/incidents";

describe("Phase 5 safety realtime", () => {
  beforeEach(() => {
    __resetSystemHealthForTests();
    __resetAlertsForTests();
    __resetNotificationsForTests();
    __resetDashboardForTests();
    __resetRidesForTests();
    __resetSafetyForTests();
    __resetIncidentsForTests();
  });

  it("sos_triggered creates alert, notification, incident, and ride sos status", async () => {
    await applyRealtimeEvent({
      id: "evt_sos_new",
      type: "safety.sos_triggered",
      timestamp: "2026-09-20T05:00:00.000Z",
      payload: {
        sosId: "sos_sim_BW10301",
        rideId: "BW10301",
        userId: "usr_001",
        driverId: "drv_01",
        newStatus: "TRIGGERED",
        timestamp: "2026-09-20T05:00:00.000Z",
        latitude: 28.5,
        longitude: 77.1,
        locationLabel: "Synthetic",
        networkType: "OFFICE",
      },
    });
    const sos = await safetyService.getSOSById("sos_sim_BW10301");
    expect(sos?.status).toBe("TRIGGERED");
    const ride = await ridesService.getRideById("BW10301");
    expect(ride?.safetyStatus).toBe("sos");
    const alerts = await alertsService.getAlerts();
    expect(alerts.some((a) => a.priority === "critical" && a.title.includes("SOS"))).toBe(true);
    const notifs = await notificationsService.getNotifications();
    expect(notifs.some((n) => n.category === "critical")).toBe(true);
    const incidents = await incidentsService.getIncidents();
    expect(incidents.some((i) => i.sosId === "sos_sim_BW10301")).toBe(true);
    const dash = await dashboardService.getDashboard();
    expect(dash.needsAttention.some((a) => /SOS/i.test(a.title))).toBe(true);
  });

  it("sos acknowledge / respond / resolve update status", async () => {
    await applyRealtimeEvent({
      id: "evt_ack",
      type: "safety.sos_acknowledged",
      timestamp: "2026-09-20T05:01:00.000Z",
      payload: {
        sosId: "sos_001",
        rideId: "BW10291",
        userId: "usr_001",
        driverId: "drv_01",
        newStatus: "ACKNOWLEDGED",
        timestamp: "2026-09-20T05:01:00.000Z",
      },
    });
    expect((await safetyService.getSOSById("sos_001"))?.status).toBe("ACKNOWLEDGED");

    await applyRealtimeEvent({
      id: "evt_resp",
      type: "safety.sos_response_started",
      timestamp: "2026-09-20T05:02:00.000Z",
      payload: {
        sosId: "sos_001",
        rideId: "BW10291",
        userId: "usr_001",
        driverId: "drv_01",
        newStatus: "RESPONDING",
        timestamp: "2026-09-20T05:02:00.000Z",
      },
    });
    expect((await safetyService.getSOSById("sos_001"))?.status).toBe("RESPONDING");

    await applyRealtimeEvent({
      id: "evt_res",
      type: "safety.sos_resolved",
      timestamp: "2026-09-20T05:03:00.000Z",
      payload: {
        sosId: "sos_001",
        rideId: "BW10291",
        userId: "usr_001",
        driverId: "drv_01",
        newStatus: "RESOLVED",
        timestamp: "2026-09-20T05:03:00.000Z",
      },
    });
    expect((await safetyService.getSOSById("sos_001"))?.status).toBe("RESOLVED");
    expect((await ridesService.getRideById("BW10291"))?.safetyStatus).toBe("safe");
  });

  it("incident escalate updates incident", async () => {
    await applyRealtimeEvent({
      id: "evt_esc",
      type: "safety.incident_escalated",
      timestamp: "2026-09-20T05:04:00.000Z",
      payload: {
        incidentId: "inc_003",
        rideId: "BW10294",
        newStatus: "ESCALATED",
        timestamp: "2026-09-20T05:04:00.000Z",
      },
    });
    const incident = await incidentsService.getIncidentById("inc_003");
    expect(incident?.status).toBe("ESCALATED");
  });
});
