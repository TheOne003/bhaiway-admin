import { beforeEach, describe, expect, it } from "vitest";
import { applyRealtimeEvent } from "@/services/realtimeBridge";
import { __resetUsersForTests, usersService } from "@/services/users";
import { __resetDriversForTests, driversService } from "@/services/drivers";
import {
  __resetVerificationForTests,
  verificationService,
} from "@/services/verification";
import { __resetAlertsForTests } from "@/services/alerts";
import { __resetNotificationsForTests } from "@/services/notifications";
import { __resetDashboardForTests, dashboardService } from "@/services/dashboard";
import { __resetRidesForTests } from "@/services/rides";
import { __resetSystemHealthForTests } from "@/services/systemHealth";
import { getMockVerificationProvider } from "@/services/verificationProvider";

describe("people / verification realtime", () => {
  beforeEach(() => {
    __resetSystemHealthForTests();
    __resetAlertsForTests();
    __resetNotificationsForTests();
    __resetDashboardForTests();
    __resetRidesForTests();
    __resetUsersForTests();
    __resetDriversForTests();
    __resetVerificationForTests();
  });

  it("verification.created appears in timeline", async () => {
    await applyRealtimeEvent({
      id: "evt_ver_c",
      type: "verification.created",
      timestamp: "2026-09-20T04:00:00.000Z",
      payload: {
        verificationId: "ver_corp_002",
        userId: "usr_002",
        type: "CORPORATE",
        previousStatus: "PENDING",
        newStatus: "PENDING",
        timestamp: "2026-09-20T04:00:00.000Z",
      },
    });
    const dash = await dashboardService.getDashboard();
    expect(
      dash.recentEvents.some((e) => e.title.includes("Verification submitted")),
    ).toBe(true);
  });

  it("verification.status_changed updates queue", async () => {
    const before = await verificationService.getVerificationById("ver_gov_004");
    expect(before?.status).toBe("PENDING");
    await applyRealtimeEvent({
      id: "evt_ver_s",
      type: "verification.status_changed",
      timestamp: "2026-09-20T04:01:00.000Z",
      payload: {
        verificationId: "ver_gov_004",
        userId: "usr_004",
        type: "GOVERNMENT_ID",
        previousStatus: "PENDING",
        newStatus: "APPROVED",
        timestamp: "2026-09-20T04:01:00.000Z",
      },
    });
    const after = await verificationService.getVerificationById("ver_gov_004");
    expect(after?.status).toBe("APPROVED");
    const queue = await verificationService.getVerifications({
      type: "GOVERNMENT_ID",
      status: "APPROVED",
    });
    expect(queue.some((v) => v.id === "ver_gov_004")).toBe(true);
  });

  it("verification.status_changed updates user detail summary", async () => {
    await applyRealtimeEvent({
      id: "evt_ver_user",
      type: "verification.status_changed",
      timestamp: "2026-09-20T04:02:00.000Z",
      payload: {
        verificationId: "ver_gov_004",
        userId: "usr_004",
        type: "GOVERNMENT_ID",
        previousStatus: "PENDING",
        newStatus: "APPROVED",
        timestamp: "2026-09-20T04:02:00.000Z",
      },
    });
    const user = await usersService.getUserById("usr_004");
    expect(user?.governmentVerificationStatus).toBe("APPROVED");
  });

  it("verification.status_changed updates driver detail where applicable", async () => {
    // Approve pending RC for usr_009 driver
    const pendingRc = getMockVerificationProvider()
      .__all()
      .find((v) => v.id === "ver_rc_009");
    expect(pendingRc?.status).toBe("PENDING");
    await applyRealtimeEvent({
      id: "evt_ver_drv",
      type: "verification.status_changed",
      timestamp: "2026-09-20T04:03:00.000Z",
      payload: {
        verificationId: "ver_rc_009",
        userId: "usr_009",
        type: "VEHICLE_RC",
        previousStatus: "PENDING",
        newStatus: "APPROVED",
        timestamp: "2026-09-20T04:03:00.000Z",
      },
    });
    const driver = await driversService.getDriverById("drv_usr_009");
    expect(driver?.vehicle?.rcStatus).toBe("APPROVED");
  });

  it("user.status_changed updates user UI data", async () => {
    await applyRealtimeEvent({
      id: "evt_user",
      type: "user.status_changed",
      timestamp: "2026-09-20T04:04:00.000Z",
      payload: {
        userId: "usr_010",
        previousStatus: "ACTIVE",
        newStatus: "SUSPENDED",
        timestamp: "2026-09-20T04:04:00.000Z",
      },
    });
    const user = await usersService.getUserById("usr_010");
    expect(user?.status).toBe("SUSPENDED");
  });

  it("driver.status_changed updates driver UI data", async () => {
    await applyRealtimeEvent({
      id: "evt_drv",
      type: "driver.status_changed",
      timestamp: "2026-09-20T04:05:00.000Z",
      payload: {
        driverId: "drv_usr_003",
        userId: "usr_003",
        previousStatus: "ACTIVE",
        newStatus: "SUSPENDED",
        timestamp: "2026-09-20T04:05:00.000Z",
      },
    });
    const driver = await driversService.getDriverById("drv_usr_003");
    expect(driver?.status).toBe("SUSPENDED");
  });

  it("mutations apply without requiring page refresh (service state)", async () => {
    await applyRealtimeEvent({
      id: "evt_live",
      type: "verification.status_changed",
      timestamp: "2026-09-20T04:06:00.000Z",
      payload: {
        verificationId: "ver_corp_002",
        userId: "usr_002",
        type: "CORPORATE",
        previousStatus: "PENDING",
        newStatus: "APPROVED",
        timestamp: "2026-09-20T04:06:00.000Z",
      },
    });
    const corp = await verificationService.getVerificationById("ver_corp_002");
    expect(corp?.status).toBe("APPROVED");
    const user = await usersService.getUserById("usr_002");
    expect(user?.corporateVerificationStatus).toBe("APPROVED");
  });
});
