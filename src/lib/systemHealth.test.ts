import { beforeEach, describe, expect, it } from "vitest";
import {
  countByStatus,
  deriveOverallStatus,
  formatServiceStatus,
} from "@/lib/systemHealth";
import {
  __resetSystemHealthForTests,
  __setSystemHealthErrorForTests,
  __setSystemHealthForTests,
  systemHealthService,
} from "@/services/systemHealth";
import { MOCK_SERVICES, buildSystemHealthSummary } from "@/mock/systemHealth";

describe("system health aggregation", () => {
  beforeEach(() => {
    __resetSystemHealthForTests();
  });

  it("aggregates status counts", () => {
    const counts = countByStatus(MOCK_SERVICES);
    expect(counts.down).toBeGreaterThanOrEqual(1);
    expect(counts.degraded).toBeGreaterThanOrEqual(1);
    expect(counts.notConfigured).toBeGreaterThanOrEqual(1);
    expect(counts.operational).toBeGreaterThanOrEqual(1);
  });

  it("calculates overall health", () => {
    expect(deriveOverallStatus([{ status: "operational" }])).toBe("all_operational");
    expect(deriveOverallStatus([{ status: "degraded" }])).toBe("degraded");
    expect(deriveOverallStatus([{ status: "down" }])).toBe("critical");
  });

  it("formats service status labels", () => {
    expect(formatServiceStatus("not_configured")).toBe("Not Configured");
    expect(formatServiceStatus("down")).toBe("Down");
  });

  it("returns health summary from service layer", async () => {
    const summary = await systemHealthService.getSystemHealth();
    expect(summary.services.length).toBe(MOCK_SERVICES.length);
    expect(summary.counts.down).toBeGreaterThanOrEqual(1);
  });

  it("supports empty health response", async () => {
    __setSystemHealthForTests(buildSystemHealthSummary([]));
    const summary = await systemHealthService.getSystemHealth();
    expect(summary.services).toHaveLength(0);
    expect(summary.overall).toBe("all_operational");
  });

  it("surfaces service failure", async () => {
    __setSystemHealthErrorForTests(true);
    await expect(systemHealthService.getSystemHealth()).rejects.toThrow(
      /Unable to load service health/i,
    );
  });
});
