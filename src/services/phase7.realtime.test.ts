import { beforeEach, describe, expect, it } from "vitest";
import { applyRealtimeEvent } from "@/services/realtimeBridge";
import { notificationEngine } from "@/services/notificationEngine";
import { notificationAutomationsService } from "@/services/notificationAutomations";
import { notificationTemplatesService } from "@/services/notificationTemplates";
import { __resetAlertsForTests } from "@/services/alerts";
import { __resetNotificationsForTests, notificationsService } from "@/services/notifications";
import { __resetDashboardForTests, dashboardService } from "@/services/dashboard";
import { __resetRidesForTests } from "@/services/rides";
import { __resetSafetyForTests } from "@/services/safety";
import { __resetIncidentsForTests } from "@/services/incidents";
import { supportService } from "@/services/support";

describe("Phase 7 notification + support realtime", () => {
  beforeEach(() => {
    __resetAlertsForTests();
    __resetNotificationsForTests();
    __resetDashboardForTests();
    __resetRidesForTests();
    __resetSafetyForTests();
    __resetIncidentsForTests();
    notificationEngine.__resetForTests();
    notificationAutomationsService.__resetForTests();
    notificationTemplatesService.__resetForTests();
    supportService.__resetForTests();
  });

  it("ride status CONFIRMED feeds engine without duplicate on replay", async () => {
    const event = {
      id: "evt_ride_conf",
      type: "ride.status_changed" as const,
      timestamp: "2026-09-20T07:00:00.000Z",
      payload: {
        rideId: "BW10291",
        previousStatus: "SEARCHING",
        newStatus: "CONFIRMED",
        timestamp: "2026-09-20T07:00:00.000Z",
        userId: "usr_002",
      },
    };
    await applyRealtimeEvent(event);
    const first = await notificationEngine.getNotifications({ search: "BW10291" });
    const count = first.length;
    await applyRealtimeEvent(event);
    const second = await notificationEngine.getNotifications({ search: "BW10291" });
    expect(second.length).toBe(count);
  });

  it("SOS triggered creates engine critical path + existing safety side effects", async () => {
    await applyRealtimeEvent({
      id: "evt_sos_p7",
      type: "safety.sos_triggered",
      timestamp: "2026-09-20T07:10:00.000Z",
      payload: {
        sosId: "sos_p7_test",
        rideId: "BW10301",
        userId: "usr_001",
        driverId: "drv_01",
        newStatus: "TRIGGERED",
        timestamp: "2026-09-20T07:10:00.000Z",
        latitude: 28.5,
        longitude: 77.1,
        locationLabel: "Synthetic",
        networkType: "OFFICE",
      },
    });
    const eng = await notificationEngine.getNotifications({ search: "sos_p7_test" });
    expect(eng.some((n) => n.priority === "CRITICAL")).toBe(true);
  });

  it("support message_created updates timeline", async () => {
    await applyRealtimeEvent({
      id: "evt_sup_msg",
      type: "support.message_created",
      timestamp: "2026-09-20T07:20:00.000Z",
      payload: {
        ticketId: "tkt_002",
        messageId: "msg_rt_1",
        userId: "usr_001",
        senderType: "ADMIN",
        internal: "false",
        timestamp: "2026-09-20T07:20:00.000Z",
      },
    });
    const dash = await dashboardService.getDashboard();
    expect(dash.recentEvents.some((e) => e.id.includes("msg_rt_1"))).toBe(true);
  });

  it("notification.created does not recurse into engine duplicates", async () => {
    const before = (await notificationEngine.getNotifications()).length;
    await applyRealtimeEvent({
      id: "evt_notif_only",
      type: "notification.created",
      timestamp: "2026-09-20T07:30:00.000Z",
      payload: { notificationId: "x" },
    });
    const after = (await notificationEngine.getNotifications()).length;
    expect(after).toBe(before);
  });

  it("ops unread remains consistent after mark read", async () => {
    await notificationsService.createNotification({
      id: "ops_test_p7",
      category: "operations",
      title: "Test",
      description: "x",
    });
    await notificationsService.markAsRead("ops_test_p7");
    const n = (await notificationsService.getNotifications()).find((x) => x.id === "ops_test_p7");
    expect(n?.read).toBe(true);
  });
});
