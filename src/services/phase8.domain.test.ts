import { beforeEach, describe, expect, it } from "vitest";
import {
  ANALYTICS_REFERENCE_NOW,
  __resetAnalyticsForTests,
  analyticsService,
} from "@/services/analytics";
import { __resetReportsForTests, reportsService } from "@/services/reports";
import {
  __resetInfrastructureForTests,
  infrastructureService,
} from "@/services/infrastructure";
import {
  __resetPermissionsForTests,
  permissionsService,
} from "@/services/permissions";
import {
  __resetPlatformSettingsForTests,
  platformSettingsService,
  validateSettings,
} from "@/services/platformSettings";
import {
  __resetAuditForTests,
  auditService,
  filterAudits,
} from "@/services/audit";
import {
  __resetSystemHealthForTests,
  systemHealthService,
} from "@/services/systemHealth";
import { __resetAlertsForTests } from "@/services/alerts";
import { DEFAULT_PLATFORM_SETTINGS } from "@/mock/platformSettings";
import type { AnalyticsFilters } from "@/types/analytics";
import type { PlatformSettings } from "@/types/platformSettings";

const actor = { adminId: "admin", adminName: "BhaiWay Admin" };

const baseFilters: AnalyticsFilters = {
  range: "30D",
  network: "ALL",
  userType: "ALL",
};

beforeEach(() => {
  __resetAnalyticsForTests();
  __resetReportsForTests();
  __resetInfrastructureForTests();
  __resetPermissionsForTests();
  __resetPlatformSettingsForTests();
  __resetAuditForTests();
  __resetSystemHealthForTests();
  __resetAlertsForTests();
});

describe("Phase 8 analytics", () => {
  it("aggregates metrics deterministically", async () => {
    const a = await analyticsService.getOverviewMetrics(baseFilters);
    const b = await analyticsService.getOverviewMetrics(baseFilters);
    expect(a.generatedAt).toBe(ANALYTICS_REFERENCE_NOW);
    expect(a.summary).toEqual(b.summary);
    expect(a.networkSplit).toEqual(b.networkSplit);
    expect(a.rides).toEqual(b.rides);
    expect(a.safety).toEqual(b.safety);
    expect(a.money).toEqual(b.money);
    expect(a.support).toEqual(b.support);
  });

  it("network OFFICE vs ALL changes office/outstation split", async () => {
    const all = await analyticsService.getOverviewMetrics(baseFilters);
    const office = await analyticsService.getOverviewMetrics({
      ...baseFilters,
      network: "OFFICE",
    });
    expect(office.networkSplit.outstationRides).toBe(0);
    expect(office.networkSplit.officeRides).toBe(
      office.rides.find((m) => m.key === "total_rides")?.value ?? -1,
    );
    expect(
      all.networkSplit.officeRides + all.networkSplit.outstationRides,
    ).toBeGreaterThanOrEqual(office.networkSplit.officeRides);
    if (all.networkSplit.outstationRides > 0) {
      expect(office.networkSplit.officeRides).not.toBe(
        all.networkSplit.officeRides + all.networkSplit.outstationRides,
      );
    }
  });

  it("date ranges TODAY vs 90D differ or stay consistent", async () => {
    const today = await analyticsService.getOverviewMetrics({
      ...baseFilters,
      range: "TODAY",
    });
    const days90 = await analyticsService.getOverviewMetrics({
      ...baseFilters,
      range: "90D",
    });
    const todayRides = today.rides.find((m) => m.key === "total_rides")?.value ?? 0;
    const longRides = days90.rides.find((m) => m.key === "total_rides")?.value ?? 0;
    expect(longRides).toBeGreaterThanOrEqual(todayRides as number);
    expect(today.generatedAt).toBe(days90.generatedAt);
  });

  it("includes safety, money, and support metric groups", async () => {
    const overview = await analyticsService.getOverviewMetrics(baseFilters);
    expect(overview.safety.map((m) => m.key)).toEqual(
      expect.arrayContaining(["sos", "incidents", "critical_incidents", "resolved_incidents"]),
    );
    expect(overview.money.map((m) => m.key)).toEqual(
      expect.arrayContaining(["txn_volume", "credits", "refunds"]),
    );
    expect(overview.support.map((m) => m.key)).toEqual(
      expect.arrayContaining(["open_tickets", "resolved_tickets", "urgent_tickets"]),
    );
  });
});

describe("Phase 8 reports", () => {
  it("generates reports deterministically with filters and CSV export", async () => {
    const first = await reportsService.generate("rpt_def_rides", actor.adminName, {
      network: "OFFICE",
    });
    const second = await reportsService.generate("rpt_def_rides", actor.adminName, {
      network: "OFFICE",
    });
    expect(first.generatedAt).toBe("2026-09-20T12:00:00.000Z");
    expect(first.status).toBe("READY");
    expect(first.columns).toEqual(second.columns);
    expect(first.rows).toEqual(second.rows);
    expect(first.summary).toEqual(second.summary);
    expect(first.rows.every((row) => row[1] === "OFFICE")).toBe(true);

    const all = await reportsService.generate("rpt_def_rides", actor.adminName, {
      network: "ALL",
    });
    expect(all.rows.length).toBeGreaterThanOrEqual(first.rows.length);

    const csv = reportsService.exportCsv(first);
    expect(csv).toContain("id,network,status,driver,scheduledStart,fare");
    expect(csv.split("\n").length).toBeGreaterThan(1);

    const listed = await reportsService.listGenerated({ category: "RIDE_OPERATIONS" });
    expect(listed.some((r) => r.definitionId === "rpt_def_rides")).toBe(true);
  });
});

describe("Phase 8 infrastructure + system health", () => {
  it("exposes HEALTHY/DEGRADED/DOWN/NOT_CONFIGURED statuses", async () => {
    const components = await infrastructureService.getComponents();
    const statuses = new Set(components.map((c) => c.status));
    expect(statuses.has("HEALTHY")).toBe(true);
    expect(statuses.has("DEGRADED")).toBe(true);
    expect(statuses.has("DOWN")).toBe(true);
    expect(statuses.has("NOT_CONFIGURED")).toBe(true);
  });

  it("system health service still responds (smoke)", async () => {
    const health = await systemHealthService.getSystemHealth();
    expect(health.services.length).toBeGreaterThan(0);
    expect(["operational", "degraded", "critical", "unknown"]).toContain(health.overall);
  });
});

describe("Phase 8 permissions + last-admin protection", () => {
  it("looks up admin, assigns roles, and checks permissions", async () => {
    const admin = await permissionsService.getAdminById("admin");
    expect(admin?.status).toBe("ACTIVE");
    expect(admin?.roleIds).toContain("role_super_admin");

    expect(await permissionsService.hasPermission("admin", "analytics.view")).toBe(true);
    expect(await permissionsService.hasPermission("admin", "admin_users.manage")).toBe(true);

    await permissionsService.assignRole("admin", "role_analyst", actor);
    const updated = await permissionsService.getAdminById("admin");
    expect(updated?.roleIds).toEqual(
      expect.arrayContaining(["role_super_admin", "role_analyst"]),
    );
  });

  it("cannot disable the only active admin", async () => {
    await expect(
      permissionsService.updateAdminStatus("admin", "DISABLED", actor, "E2E deactivate"),
    ).rejects.toThrow(/only active admin/i);
  });

  it("cannot remove all roles from the only admin", async () => {
    await expect(
      permissionsService.removeRole("admin", "role_super_admin", actor),
    ).rejects.toThrow(/Cannot remove all roles|only active admin/i);
  });

  it("cannot strip critical perms from SUPER_ADMIN when only admin", async () => {
    const role = await permissionsService.getRoleById("role_super_admin");
    expect(role).not.toBeNull();
    const withoutCritical = role!.permissionIds.filter((id) => id !== "admin_users.manage");
    await expect(
      permissionsService.updateRolePermissions(
        "role_super_admin",
        withoutCritical,
        actor,
        "Strip critical",
      ),
    ).rejects.toThrow(/last administrative access|only active admin/i);
  });
});

describe("Phase 8 audit", () => {
  it("creates, filters, is append-only, and scrubs passwords", async () => {
    expect("delete" in auditService).toBe(false);
    expect(typeof (auditService as { delete?: unknown }).delete).toBe("undefined");

    const seeded = await auditService.list();
    expect(seeded.length).toBeGreaterThanOrEqual(3);

    const created = await auditService.record({
      adminId: "admin",
      adminName: "BhaiWay Admin",
      action: "admin.test_action",
      targetType: "admin",
      targetId: "admin",
      oldValue: { password: "India@0192", note: "before" },
      newValue: { password: "India@0192", note: "after", apiKey: "secret-key" },
      reason: "Scrub test",
      timestamp: "2026-09-20T12:00:00.000Z",
    });

    expect(created.oldValue).toEqual({ password: "[redacted]", note: "before" });
    expect(created.newValue).toEqual({
      password: "[redacted]",
      note: "after",
      apiKey: "[redacted]",
    });
    expect(JSON.stringify(created)).not.toContain("India@0192");

    const filtered = filterAudits(await auditService.list({}), {
      action: "admin.test_action",
    });
    expect(filtered.some((a) => a.id === created.id)).toBe(true);

    const bySearch = await auditService.list({ search: "Scrub test" });
    expect(bySearch.some((a) => a.id === created.id)).toBe(true);
  });
});

describe("Phase 8 platform settings", () => {
  it("validates assured ride percents and requires confirmCritical for maintenance", async () => {
    const bad: PlatformSettings = structuredClone(DEFAULT_PLATFORM_SETTINGS);
    bad.assuredRide.securityPercent = 0.1;
    bad.assuredRide.compensationPercent = 0.5;
    const errors = validateSettings(bad);
    expect(errors.some((e) => /0\.05|5%/i.test(e))).toBe(true);
    expect(errors.some((e) => /0\.6|60%/i.test(e))).toBe(true);

    await expect(
      platformSettingsService.updateSettingsGroup(
        "system",
        { maintenanceMode: true },
        actor,
        "Enable maintenance",
      ),
    ).rejects.toThrow(/Critical setting change requires confirmation/i);

    const updated = await platformSettingsService.updateSettingsGroup(
      "system",
      { maintenanceMode: true },
      actor,
      "Enable maintenance",
      { confirmCritical: true },
    );
    expect(updated.system.maintenanceMode).toBe(true);

    const audits = await auditService.list({ action: "settings.updated" });
    expect(audits.some((a) => a.targetId === "system")).toBe(true);
  });
});
