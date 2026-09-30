import { beforeEach, describe, expect, it } from "vitest";
import { __resetAuditForTests, auditService } from "@/services/audit";
import { analyticsService } from "@/services/analytics";
import { couponsService } from "@/services/coupons";
import { __resetFaresForTests, faresService } from "@/services/fares";
import { __resetIncidentsForTests, incidentsService } from "@/services/incidents";
import { notificationEngine } from "@/services/notificationEngine";
import { __resetVehiclesForTests, vehiclesService } from "@/services/vehicles";
import { filterRides, ridesService } from "@/services/rides";

describe("Phase 10 — admin notification send", () => {
  beforeEach(() => {
    notificationEngine.__resetForTests();
    __resetAuditForTests();
  });

  it("sends custom notification through engine with audit and delivery history", async () => {
    const created = await notificationEngine.sendAdminNotification({
      recipientUserIds: ["usr_001"],
      title: "Ops ping {{userName}}",
      body: "Please check ride status.",
      channel: "IN_APP",
      adminId: "admin",
      adminName: "BhaiWay Admin",
    });
    expect(created.length).toBe(1);
    expect(created[0].status === "DELIVERED" || created[0].status === "SENT").toBe(true);
    expect(created[0].sourceEventType).toBe("admin.notification_send");

    const listed = await notificationEngine.getNotifications({
      search: created[0].id,
    });
    expect(listed.some((n) => n.id === created[0].id)).toBe(true);

    const deliveries = await notificationEngine.getDeliveryHistory(created[0].id);
    expect(deliveries.length).toBeGreaterThan(0);

    const audits = await auditService.list({ action: "notification.admin_sent" });
    expect(audits.length).toBeGreaterThan(0);
  });

  it("rejects empty recipients and body", async () => {
    await expect(
      notificationEngine.sendAdminNotification({
        recipientUserIds: [],
        title: "t",
        body: "b",
        channel: "IN_APP",
        adminId: "admin",
        adminName: "Admin",
      }),
    ).rejects.toThrow(/recipient/i);

    await expect(
      notificationEngine.sendAdminNotification({
        recipientUserIds: ["usr_001"],
        title: "t",
        body: "   ",
        channel: "IN_APP",
        adminId: "admin",
        adminName: "Admin",
      }),
    ).rejects.toThrow(/body/i);
  });
});

describe("Phase 10 — vehicles", () => {
  beforeEach(() => {
    __resetVehiclesForTests();
    __resetAuditForTests();
  });

  it("lists, filters, and returns detail with linked driver/user", async () => {
    const all = await vehiclesService.getVehicles();
    expect(all.length).toBeGreaterThan(0);
    const first = all[0];
    expect(first.registrationMasked).toMatch(/\*/);
    expect(first.driverId).toBeTruthy();
    expect(first.userId).toBeTruthy();

    const filtered = await vehiclesService.getVehicles({ search: first.make });
    expect(filtered.some((v) => v.vehicleId === first.vehicleId)).toBe(true);

    const detail = await vehiclesService.getVehicleById(first.vehicleId);
    expect(detail?.driverName).toBeTruthy();
  });

  it("restricts vehicle with audit", async () => {
    const all = await vehiclesService.getVehicles();
    const id = all[0].vehicleId;
    const updated = await vehiclesService.setOperationalStatus(
      id,
      "RESTRICTED",
      { adminId: "admin", adminName: "Admin" },
      "Ops review",
    );
    expect(updated.operationalStatus).toBe("RESTRICTED");
    const audits = await auditService.list({ action: "vehicle.status_changed" });
    expect(audits.some((a) => a.targetId === id)).toBe(true);
  });
});

describe("Phase 10 — fares", () => {
  beforeEach(() => {
    __resetFaresForTests();
    __resetAuditForTests();
  });

  it("lists configs and previews fare", async () => {
    const list = await faresService.getConfigurations();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.some((c) => c.network === "OFFICE")).toBe(true);
    expect(list.some((c) => c.network === "OUTSTATION")).toBe(true);
    const preview = faresService.previewFare(list[0], 10);
    expect(preview).toBeGreaterThan(0);
  });

  it("creates, activates, and deactivates with validation", async () => {
    const created = await faresService.create(
      {
        name: "Test Office Fare",
        network: "OFFICE",
        baseFarePaise: 2000,
        perKmPaise: 800,
        minimumFarePaise: 4000,
        cancellationFeePaise: 1000,
        effectiveFrom: "2026-09-01T00:00:00.000Z",
      },
      { adminId: "admin", adminName: "Admin" },
    );
    expect(created.status).toBe("DRAFT");

    await expect(
      faresService.create(
        {
          name: "Bad",
          network: "OFFICE",
          baseFarePaise: -1,
          perKmPaise: 100,
          minimumFarePaise: 100,
          cancellationFeePaise: 0,
          effectiveFrom: "2026-09-01T00:00:00.000Z",
        },
        { adminId: "admin", adminName: "Admin" },
      ),
    ).rejects.toThrow();

    const active = await faresService.setStatus(
      created.id,
      "ACTIVE",
      { adminId: "admin", adminName: "Admin" },
      "Go live",
    );
    expect(active.status).toBe("ACTIVE");

    const inactive = await faresService.setStatus(
      created.id,
      "INACTIVE",
      { adminId: "admin", adminName: "Admin" },
      "Pause",
    );
    expect(inactive.status).toBe("INACTIVE");

    const audits = await auditService.list({ targetType: "fare_config" });
    expect(audits.length).toBeGreaterThan(0);
  });
});

describe("Phase 10 — outstation / office commute", () => {
  it("filters rides by network without duplicating entities", async () => {
    const rides = await ridesService.getRides();
    const outstation = filterRides(rides, { networkType: "OUTSTATION" });
    const office = filterRides(rides, { networkType: "OFFICE" });
    expect(outstation.every((r) => r.networkType === "OUTSTATION")).toBe(true);
    expect(office.every((r) => r.networkType === "OFFICE")).toBe(true);
    expect(outstation.length + office.length).toBeLessThanOrEqual(rides.length);
  });
});

describe("Phase 10 — incidents case handling", () => {
  beforeEach(() => {
    __resetIncidentsForTests();
  });

  it("acknowledges and resolves with timeline", async () => {
    const list = await incidentsService.getIncidents({ status: "OPENISH" });
    expect(list.length).toBeGreaterThan(0);
    const id = list[0].id;
    const userId = list[0].userId;
    expect(userId).toBeTruthy();

    const ack = await incidentsService.acknowledgeIncident(id, "admin");
    expect(ack?.status).toBe("INVESTIGATING");
    expect(ack?.timeline[0].label).toMatch(/acknowledged/i);

    const resolved = await incidentsService.resolveIncident(id, "Handled in ops", "admin");
    expect(resolved?.status).toBe("RESOLVED");
  });

  it("adds internal notes", async () => {
    const list = await incidentsService.getIncidents();
    const id = list[0].id;
    const updated = await incidentsService.addIncidentNote(id, "Called rider", "admin");
    expect(updated?.internalNotes[0]).toBe("Called rider");
  });
});

describe("Phase 10 — analytics KPIs", () => {
  it("derives core KPIs from domain services", async () => {
    const overview = await analyticsService.getOverviewMetrics({
      range: "90D",
      network: "ALL",
      userType: "ALL",
    });
    const totalRides = overview.rides.find((m) => m.key === "total_rides")?.value;
    const completed = overview.rides.find((m) => m.key === "completed")?.value;
    const cancelled = overview.rides.find((m) => m.key === "cancelled")?.value;
    const volume = overview.money.find((m) => m.key === "txn_volume")?.value;
    expect(typeof totalRides).toBe("number");
    expect(typeof completed).toBe("number");
    expect(typeof cancelled).toBe("number");
    expect(typeof volume).toBe("number");
    expect(overview.networkSplit.officeRides + overview.networkSplit.outstationRides).toBeGreaterThanOrEqual(
      0,
    );
  });
});

describe("Phase 10 — coupons create / activate", () => {
  beforeEach(() => {
    couponsService.__resetForTests();
    __resetAuditForTests();
  });

  it("creates, validates, activates, and deactivates", async () => {
    const created = await couponsService.createCoupon(
      {
        code: `P10${Date.now().toString().slice(-5)}`,
        name: "Phase10 Test",
        description: "Synthetic coupon",
        discountType: "PERCENTAGE",
        discountValue: 10,
        maxDiscountPaise: 5000,
        minimumFarePaise: 10000,
        usageLimit: 100,
        perUserLimit: 1,
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2026-12-31T23:59:59.000Z",
        applicableNetwork: "ALL",
        applicableUserType: "ALL",
      },
      { adminId: "admin", adminName: "Admin" },
    );
    expect(created.status).toBe("DRAFT");

    const active = await couponsService.setCouponStatus(created.id, "ACTIVE", {
      adminId: "admin",
      adminName: "Admin",
      reason: "Activate promo",
    });
    expect(active.status).toBe("ACTIVE");

    const paused = await couponsService.setCouponStatus(created.id, "DISABLED", {
      adminId: "admin",
      adminName: "Admin",
      reason: "Deactivate promo",
    });
    expect(paused.status).toBe("DISABLED");

    const createdAudits = await auditService.list({ action: "growth.coupon_created" });
    expect(createdAudits.some((a) => a.targetId === created.id)).toBe(true);
    const statusAudits = await auditService.list({ action: "growth.coupon_status_changed" });
    expect(statusAudits.length).toBeGreaterThan(0);
  });

  it("rejects invalid percentage", async () => {
    await expect(
      couponsService.createCoupon(
        {
          code: "BADPCT",
          name: "Bad",
          description: "x",
          discountType: "PERCENTAGE",
          discountValue: 150,
          maxDiscountPaise: null,
          minimumFarePaise: null,
          usageLimit: null,
          perUserLimit: 1,
          validFrom: "2026-01-01T00:00:00.000Z",
          validUntil: "2026-12-31T23:59:59.000Z",
          applicableNetwork: "ALL",
          applicableUserType: "ALL",
        },
        { adminId: "admin", adminName: "Admin" },
      ),
    ).rejects.toThrow(/100/);
  });
});
