import { beforeEach, describe, expect, it } from "vitest";
import { __resetAlertsForTests } from "@/services/alerts";
import { __resetDashboardForTests, buildNeedsAttention } from "@/services/dashboard";
import { __resetNotificationsForTests } from "@/services/notifications";
import { MockRealtimeService } from "@/services/realtime";
import { applyRealtimeEvent } from "@/services/realtimeBridge";
import {
  __resetSystemHealthForTests,
  systemHealthService,
} from "@/services/systemHealth";
import { alertsService } from "@/services/alerts";
import { notificationsService } from "@/services/notifications";
import { dashboardService } from "@/services/dashboard";

describe("realtime bridge", () => {
  beforeEach(() => {
    __resetSystemHealthForTests();
    __resetAlertsForTests();
    __resetNotificationsForTests();
    __resetDashboardForTests();
  });

  it("SERVICE_DOWN updates health, alert, and notifications", async () => {
    const beforeUnread = notificationsService.getUnreadCount(
      await notificationsService.getNotifications(),
    );

    await applyRealtimeEvent({
      id: "evt_down",
      type: "system.service_down",
      timestamp: "2026-09-20T01:00:00.000Z",
      payload: {
        serviceId: "svc_payment",
        serviceName: "Payment Gateway",
        previousStatus: "operational",
        newStatus: "down",
        timestamp: "2026-09-20T01:00:00.000Z",
        httpStatus: 503,
        errorMessage: "Gateway timeout",
      },
    });

    const health = await systemHealthService.getSystemHealth();
    const payment = health.services.find((s) => s.id === "svc_payment");
    expect(payment?.status).toBe("down");
    expect(health.overall).toBe("critical");

    const alerts = await alertsService.getAlerts();
    expect(alerts.some((a) => a.title.includes("Payment Gateway"))).toBe(true);

    const notifications = await notificationsService.getNotifications();
    expect(notificationsService.getUnreadCount(notifications)).toBeGreaterThan(beforeUnread);

    const dashboard = await dashboardService.getDashboard();
    expect(dashboard.needsAttention.some((i) => /Payment/i.test(i.title))).toBe(true);
  });

  it("SERVICE_RECOVERED updates health and creates recovery event", async () => {
    await applyRealtimeEvent({
      id: "evt_up",
      type: "system.service_recovered",
      timestamp: "2026-09-20T01:05:00.000Z",
      payload: {
        serviceId: "svc_rc",
        serviceName: "RC Verification",
        previousStatus: "down",
        newStatus: "operational",
        timestamp: "2026-09-20T01:05:00.000Z",
        httpStatus: 200,
        errorMessage: null,
      },
    });

    const health = await systemHealthService.getSystemHealth();
    expect(health.services.find((s) => s.id === "svc_rc")?.status).toBe("operational");

    const dashboard = await dashboardService.getDashboard();
    expect(dashboard.recentEvents.some((e) => /recovered/i.test(e.title))).toBe(true);
  });

  it("ignores invalid realtime payloads", async () => {
    const before = await systemHealthService.getSystemHealth();
    await applyRealtimeEvent({
      id: "evt_bad",
      type: "system.service_down",
      timestamp: "2026-09-20T01:00:00.000Z",
      payload: { broken: true },
    });
    const after = await systemHealthService.getSystemHealth();
    expect(after.services).toEqual(before.services);
  });

  it("MockRealtimeService delivers events to subscribers", () => {
    const bus = new MockRealtimeService();
    const seen: string[] = [];
    bus.connect();
    bus.subscribe((e) => seen.push(e.type));
    bus.emit({
      id: "1",
      type: "system.service_down",
      timestamp: new Date().toISOString(),
      payload: {},
    });
    expect(seen).toEqual(["system.service_down"]);
  });
});

describe("needs attention builder", () => {
  it("only includes actionable critical/warning items", async () => {
    __resetAlertsForTests();
    __resetSystemHealthForTests();
    const alerts = await alertsService.getAlerts();
    const health = await systemHealthService.getSystemHealth();
    const items = buildNeedsAttention(alerts, health);
    expect(items.every((i) => i.priority === "critical" || i.priority === "warning")).toBe(
      true,
    );
  });
});
