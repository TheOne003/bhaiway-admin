import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetSystemHealthForTests,
  __setSystemHealthForTests,
  systemHealthService,
  deriveOverallStatus,
} from "@/services/systemHealth";
import { MOCK_SYSTEM_HEALTH } from "@/mock/systemHealth";

describe("systemHealthService", () => {
  beforeEach(() => {
    __resetSystemHealthForTests();
  });

  it("derives overall status from service states", () => {
    expect(deriveOverallStatus([{ status: "operational" }])).toBe("all_operational");
    expect(deriveOverallStatus([{ status: "degraded" }])).toBe("degraded");
    expect(
      deriveOverallStatus([{ status: "degraded" }, { status: "down" }]),
    ).toBe("critical");
  });

  it("returns health summary from mock service layer", async () => {
    const summary = await systemHealthService.getSystemHealth();
    expect(summary.services.length).toBeGreaterThan(0);
    expect(summary.overall).toBe("critical");
  });

  it("can reflect degraded-only state via mock mutation", async () => {
    __setSystemHealthForTests({
      ...MOCK_SYSTEM_HEALTH,
      overall: "degraded",
      counts: { ...MOCK_SYSTEM_HEALTH.counts, down: 0, degraded: 1 },
      downCount: 0,
      degradedCount: 1,
      services: MOCK_SYSTEM_HEALTH.services.map((s) =>
        s.status === "down" ? { ...s, status: "operational", httpStatus: 200 } : s,
      ),
    });
    const summary = await systemHealthService.getSystemHealth();
    expect(summary.overall).toBe("degraded");
    __resetSystemHealthForTests();
  });
});
