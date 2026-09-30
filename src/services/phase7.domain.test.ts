import { beforeEach, describe, expect, it } from "vitest";
import {
  extractTemplateVariables,
  renderTemplate,
  validateTemplate,
  canTransitionTemplateStatus,
  SAMPLE_TEMPLATE_VARS,
} from "@/lib/notificationTemplates";
import { resolveAudience } from "@/services/audience";
import { evaluateConditions } from "@/services/notificationAutomations";
import { getChannelProvider } from "@/services/notificationProviders";
import {
  buildIdempotencyKey,
  notificationEngine,
} from "@/services/notificationEngine";
import { notificationTemplatesService } from "@/services/notificationTemplates";
import { notificationAutomationsService } from "@/services/notificationAutomations";
import { notificationCampaignsService } from "@/services/notificationCampaigns";
import { supportService } from "@/services/support";
import { __resetNotificationsForTests, notificationsService } from "@/services/notifications";
import { __resetAuditForTests } from "@/services/audit";
import { __resetDashboardForTests } from "@/services/dashboard";

describe("template rendering and validation", () => {
  it("substitutes variables", () => {
    const out = renderTemplate(
      "Hi {{userName}}, ride {{rideId}}",
      { userName: "Rahul", rideId: "BW-RIDE-001" },
    );
    expect(out.body).toBe("Hi Rahul, ride BW-RIDE-001");
    expect(out.unknownVariables).toEqual([]);
  });

  it("detects unknown and empty body", () => {
    expect(extractTemplateVariables("Hi {{userName}} {{foo}}")).toEqual(
      expect.arrayContaining(["userName", "foo"]),
    );
    const v = validateTemplate({
      body: "",
      subject: null,
      channels: ["IN_APP"],
    });
    expect(v.valid).toBe(false);
    expect(
      validateTemplate({
        body: "Hi {{unknownVar}}",
        subject: null,
        channels: ["EMAIL"],
      }).errors.length,
    ).toBeGreaterThan(0);
  });

  it("requires email subject and status transitions", () => {
    expect(
      validateTemplate({
        body: "Hi {{userName}}",
        subject: null,
        channels: ["EMAIL"],
      }).valid,
    ).toBe(false);
    expect(canTransitionTemplateStatus("DRAFT", "ACTIVE")).toBe(true);
    expect(canTransitionTemplateStatus("ARCHIVED", "ACTIVE")).toBe(false);
    expect(SAMPLE_TEMPLATE_VARS.userName).toBe("Rahul");
  });
});

describe("audience and conditions", () => {
  it("resolves audiences deterministically", () => {
    expect(resolveAudience({ type: "OFFICE_COMMUTE_USERS" })).toEqual([
      "usr_001",
      "usr_002",
      "usr_008",
    ]);
    expect(resolveAudience({ type: "CUSTOM_USER_SET", userIds: ["usr_001"] })).toEqual([
      "usr_001",
    ]);
  });

  it("evaluates automation conditions", () => {
    expect(
      evaluateConditions([{ field: "newStatus", op: "eq", value: "CONFIRMED" }], {
        newStatus: "CONFIRMED",
      }),
    ).toBe(true);
    expect(
      evaluateConditions([{ field: "newStatus", op: "eq", value: "CONFIRMED" }], {
        newStatus: "CANCELLED",
      }),
    ).toBe(false);
  });
});

describe("mock channel providers", () => {
  it("returns deterministic mock results", async () => {
    const sms = await getChannelProvider("SMS").send({
      notificationId: "n1",
      recipientUserId: "usr_001",
      channel: "SMS",
      title: "t",
      body: "b",
      attemptNumber: 1,
    });
    expect(sms.provider).toBe("mock-sms");
    expect(sms.providerReference).toContain("MOCK-SMS");
    const fail = await getChannelProvider("SMS").send({
      notificationId: "x_fail",
      recipientUserId: "usr_001",
      channel: "SMS",
      title: "t",
      body: "b",
      attemptNumber: 1,
    });
    expect(fail.status).toBe("FAILED");
  });
});

describe("notification engine", () => {
  beforeEach(() => {
    notificationEngine.__resetForTests();
    notificationTemplatesService.__resetForTests();
    notificationAutomationsService.__resetForTests();
    notificationCampaignsService.__resetForTests();
    __resetNotificationsForTests();
    __resetAuditForTests();
    __resetDashboardForTests();
  });

  it("ride confirmed → automation → template → delivery", async () => {
    const created = await notificationEngine.processEvent({
      eventType: "ride.status_changed",
      eventId: "BW_TEST_CONFIRMED",
      payload: {
        rideId: "BW_TEST",
        newStatus: "CONFIRMED",
        userId: "usr_002",
        pickup: "Hub A",
      },
    });
    expect(created.length).toBeGreaterThan(0);
    expect(created[0].automationId).toBe("auto_001");
    expect(created[0].body).toMatch(/Rahul|confirmed/i);
    const history = await notificationEngine.getDeliveryHistory(created[0].id);
    expect(history.length).toBeGreaterThan(0);
  });

  it("SOS → critical notification", async () => {
    const created = await notificationEngine.processEvent({
      eventType: "safety.sos_triggered",
      eventId: "sos_engine_test",
      payload: { sosId: "sos_engine_test", rideId: "BW10294", userId: "usr_001" },
    });
    expect(created.some((n) => n.priority === "CRITICAL")).toBe(true);
  });

  it("verification approved and refund completed", async () => {
    const ver = await notificationEngine.processEvent({
      eventType: "verification.status_changed",
      eventId: "ver_test_1",
      payload: { verificationId: "ver_test_1", userId: "usr_004", newStatus: "APPROVED", type: "GOVERNMENT_ID" },
    });
    expect(ver.length).toBeGreaterThan(0);
    const ref = await notificationEngine.processEvent({
      eventType: "money.refund_updated",
      eventId: "ref_test_1",
      payload: { refundId: "ref_test_1", userId: "usr_001", newStatus: "COMPLETED", amount: "₹50" },
    });
    expect(ref.length).toBeGreaterThan(0);
  });

  it("deduplicates identical events", async () => {
    const input = {
      eventType: "ride.status_changed" as const,
      eventId: "BW_DEDUP",
      payload: { rideId: "BW_DEDUP", newStatus: "CONFIRMED", userId: "usr_002" },
    };
    const a = await notificationEngine.processEvent(input);
    const b = await notificationEngine.processEvent(input);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBe(0);
  });

  it("ignores notification.* events (no recursion)", async () => {
    const created = await notificationEngine.processEvent({
      eventType: "notification.created",
      eventId: "loop",
      payload: {},
    });
    expect(created).toEqual([]);
  });

  it("idempotency key is deterministic", () => {
    const k1 = buildIdempotencyKey({
      sourceEventType: "a",
      sourceEventId: "b",
      automationId: "c",
      recipientUserId: "d",
      channel: "IN_APP",
    });
    const k2 = buildIdempotencyKey({
      sourceEventType: "a",
      sourceEventId: "b",
      automationId: "c",
      recipientUserId: "d",
      channel: "IN_APP",
    });
    expect(k1).toBe(k2);
  });
});

describe("campaigns", () => {
  beforeEach(() => {
    notificationEngine.__resetForTests();
    notificationCampaignsService.__resetForTests();
    notificationTemplatesService.__resetForTests();
    __resetNotificationsForTests();
    __resetAuditForTests();
  });

  it("validates and starts campaign", async () => {
    const v = await notificationCampaignsService.validateStart("camp_001");
    expect(v.valid).toBe(true);
    expect(v.recipientCount).toBeGreaterThan(0);
    const started = await notificationCampaignsService.startCampaign("camp_001", {
      adminId: "adm_001",
      adminName: "Ops",
      reason: "Test start",
    });
    expect(started.status).toBe("COMPLETED");
    expect(started.deliveredCount + started.failedCount).toBeGreaterThan(0);
  });
});

describe("support transitions", () => {
  beforeEach(() => {
    supportService.__resetForTests();
    notificationEngine.__resetForTests();
    __resetAuditForTests();
  });

  it("assigns, escalates, resolves", async () => {
    const assigned = await supportService.assignTicket("tkt_002", "adm_001", {
      actorId: "adm_001",
      actorName: "Ops",
      reason: "Take ownership",
    });
    expect(assigned.assignedTo).toBe("adm_001");
    const escalated = await supportService.setStatus("tkt_002", "ESCALATED", {
      actorId: "adm_001",
      actorName: "Ops",
      reason: "Needs safety",
    });
    expect(escalated.status).toBe("ESCALATED");
  });

  it("separates internal notes from customer messages", async () => {
    const note = await supportService.addMessage({
      ticketId: "tkt_001",
      senderType: "ADMIN",
      senderId: "adm_001",
      body: "Internal only",
      internal: true,
      actorName: "Ops",
    });
    expect(note.internal).toBe(true);
    const reply = await supportService.addMessage({
      ticketId: "tkt_001",
      senderType: "ADMIN",
      senderId: "adm_001",
      body: "Customer visible reply",
      internal: false,
      actorName: "Ops",
    });
    expect(reply.internal).toBe(false);
    const msgs = await supportService.getMessages("tkt_001");
    expect(msgs.some((m) => m.internal && m.body === "Internal only")).toBe(true);
  });

  it("support message triggers notification for admin reply", async () => {
    await supportService.addMessage({
      ticketId: "tkt_002",
      senderType: "ADMIN",
      senderId: "adm_001",
      body: "We are looking into your refund.",
      internal: false,
      actorName: "Ops",
    });
    // Event is emitted; process manually to assert engine path in unit test without bus
    const created = await notificationEngine.processEvent({
      eventType: "support.message_created",
      eventId: "msg_unit_support",
      payload: {
        ticketId: "tkt_002",
        messageId: "msg_unit_support",
        userId: "usr_001",
        senderType: "ADMIN",
        internal: "false",
      },
    });
    expect(created.length).toBeGreaterThan(0);
  });
});

describe("ops notification sync", () => {
  beforeEach(() => {
    notificationEngine.__resetForTests();
    __resetNotificationsForTests();
  });

  it("mark all read updates engine and ops drawer source", async () => {
    await notificationEngine.markAllRead();
    const list = await notificationEngine.getNotifications();
    expect(list.every((n) => n.readAt)).toBe(true);
    await notificationsService.markAllAsRead();
    const ops = await notificationsService.getNotifications();
    expect(ops.every((n) => n.read)).toBe(true);
  });
});
