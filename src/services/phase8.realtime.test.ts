import { beforeEach, describe, expect, it } from "vitest";
import { getMockRealtimeService } from "@/services/realtime";
import { emitAdminRealtime } from "@/services/realtimeBridge";
import {
  __resetPlatformSettingsForTests,
  platformSettingsService,
} from "@/services/platformSettings";
import { __resetPermissionsForTests } from "@/services/permissions";
import { __resetAuditForTests } from "@/services/audit";
import type { RealtimeEvent } from "@/types/realtime";

describe("Phase 8 admin/settings realtime", () => {
  beforeEach(() => {
    __resetPermissionsForTests();
    __resetPlatformSettingsForTests();
    __resetAuditForTests();
    const bus = getMockRealtimeService();
    bus.disconnect();
  });

  it("delivers admin and settings realtime event types to subscribers", () => {
    const bus = getMockRealtimeService();
    const received: RealtimeEvent[] = [];
    const unsub = bus.subscribe((event) => {
      received.push(event);
    });
    bus.connect();

    const ts = "2026-09-20T12:00:00.000Z";
    emitAdminRealtime("admin.status_changed", {
      adminId: "admin",
      previousStatus: "ACTIVE",
      newStatus: "ACTIVE",
      timestamp: ts,
    });
    emitAdminRealtime("admin.role_updated", {
      adminId: "admin",
      roleIds: ["role_super_admin"],
      timestamp: ts,
    });
    emitAdminRealtime("admin.permission_updated", {
      roleId: "role_analyst",
      permissionIds: ["analytics.view"],
      timestamp: ts,
    });
    emitAdminRealtime("settings.updated", {
      group: "general",
      timestamp: ts,
    });
    emitAdminRealtime("audit.created", {
      action: "settings.updated",
      targetId: "general",
      timestamp: ts,
    });

    unsub();

    expect(received.map((e) => e.type)).toEqual([
      "admin.status_changed",
      "admin.role_updated",
      "admin.permission_updated",
      "settings.updated",
      "audit.created",
    ]);
    expect(received[0]?.payload).toMatchObject({
      adminId: "admin",
      newStatus: "ACTIVE",
    });
    expect(received[2]?.payload).toMatchObject({ roleId: "role_analyst" });
    expect(received[3]?.payload).toMatchObject({ group: "general" });
  });

  it("settings update emits settings.updated and audit.created", async () => {
    const bus = getMockRealtimeService();
    const received: string[] = [];
    const unsub = bus.subscribe((event) => {
      received.push(event.type);
    });
    bus.connect();

    await platformSettingsService.updateSettingsGroup(
      "communication",
      { defaultInAppEnabled: false },
      { adminId: "admin", adminName: "BhaiWay Admin" },
      "Toggle in-app default",
    );

    unsub();

    expect(received).toContain("settings.updated");
    expect(received).toContain("audit.created");
  });
});
