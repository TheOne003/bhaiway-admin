import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetAlertsForTests,
  __setAlertsErrorForTests,
  alertsService,
  filterAlerts,
  mapPriorityLabel,
} from "@/services/alerts";

describe("alertsService", () => {
  beforeEach(() => {
    __resetAlertsForTests();
  });

  it("maps alert priorities", () => {
    expect(mapPriorityLabel("critical")).toBe("Critical");
    expect(mapPriorityLabel("warning")).toBe("Warning");
  });

  it("filters alerts", async () => {
    const alerts = await alertsService.getAlerts();
    expect(filterAlerts(alerts, "critical").every((a) => a.priority === "critical")).toBe(true);
    expect(filterAlerts(alerts, "unread").every((a) => !a.read)).toBe(true);
    expect(filterAlerts(alerts, "resolved").every((a) => a.status === "resolved")).toBe(true);
  });

  it("acknowledges and resolves alerts", async () => {
    const alerts = await alertsService.getAlerts();
    const open = alerts.find((a) => a.status === "open");
    expect(open).toBeTruthy();
    const acked = await alertsService.acknowledge(open!.id);
    expect(acked?.status).toBe("acknowledged");
    const resolved = await alertsService.resolve(open!.id);
    expect(resolved?.status).toBe("resolved");
  });

  it("handles empty and error states", async () => {
    __setAlertsErrorForTests(true);
    await expect(alertsService.getAlerts()).rejects.toThrow(/Unable to load alerts/i);
  });
});
