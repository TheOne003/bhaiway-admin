import {
  MOCK_DELIVERY_ATTEMPTS,
  MOCK_ENGINE_NOTIFICATIONS,
} from "@/mock/engineNotifications";
import { MOCK_USERS } from "@/mock/users";
import { SAMPLE_TEMPLATE_VARS, renderTemplate } from "@/lib/notificationTemplates";
import { resolveAudience } from "@/services/audience";
import { evaluateConditions, notificationAutomationsService } from "@/services/notificationAutomations";
import { getChannelProvider } from "@/services/notificationProviders";
import { notificationTemplatesService } from "@/services/notificationTemplates";
import { notificationsService } from "@/services/notifications";
import type { NotificationCampaign } from "@/types/communication";
import type {
  DeliveryAttempt,
  EngineNotification,
  EngineNotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationFilters,
  NotificationPriority,
  NotificationSummary,
} from "@/types/notifications";
import type { NotificationCategory as OpsCategory } from "@/types/notification";

let notifications: EngineNotification[] = structuredClone(MOCK_ENGINE_NOTIFICATIONS);
let deliveries: DeliveryAttempt[] = structuredClone(MOCK_DELIVERY_ATTEMPTS);
const processedKeys = new Set<string>(notifications.map((n) => n.idempotencyKey));
/** Prevent notification.* events from re-entering the engine. */
let processingDepth = 0;
let forceError: string | null = null;

function assertOk() {
  if (forceError) throw new Error(forceError);
}

export function buildIdempotencyKey(parts: {
  sourceEventType: string;
  sourceEventId: string;
  automationId: string;
  recipientUserId: string;
  channel: NotificationChannel;
}): string {
  return [
    parts.sourceEventType,
    parts.sourceEventId,
    parts.automationId,
    parts.recipientUserId,
    parts.channel,
  ].join("|");
}

function mapOpsCategory(
  category: EngineNotificationCategory,
  priority: NotificationPriority,
): OpsCategory {
  if (priority === "CRITICAL" || category === "SAFETY") return "critical";
  if (category === "SYSTEM") return "system";
  return "operations";
}

function userName(userId: string): string {
  return MOCK_USERS.find((u) => u.id === userId)?.name ?? "User";
}

function buildVars(payload: Record<string, unknown>, recipientUserId: string): Record<string, string> {
  return {
    ...SAMPLE_TEMPLATE_VARS,
    userName: userName(recipientUserId),
    rideId: String(payload.rideId ?? SAMPLE_TEMPLATE_VARS.rideId),
    driverName: String(payload.driverName ?? SAMPLE_TEMPLATE_VARS.driverName),
    pickup: String(payload.pickup ?? SAMPLE_TEMPLATE_VARS.pickup),
    dropoff: String(payload.dropoff ?? SAMPLE_TEMPLATE_VARS.dropoff),
    amount: String(payload.amount ?? SAMPLE_TEMPLATE_VARS.amount),
    ticketId: String(payload.ticketId ?? SAMPLE_TEMPLATE_VARS.ticketId),
    verificationType: String(payload.type ?? payload.verificationType ?? SAMPLE_TEMPLATE_VARS.verificationType),
  };
}

export function filterEngineNotifications(
  list: EngineNotification[],
  filters?: NotificationFilters,
): EngineNotification[] {
  if (!filters) return list;
  return list.filter((n) => {
    if (filters.category && filters.category !== "ALL" && n.category !== filters.category) return false;
    if (filters.priority && filters.priority !== "ALL" && n.priority !== filters.priority) return false;
    if (filters.channel && filters.channel !== "ALL" && n.channel !== filters.channel) return false;
    if (filters.status && filters.status !== "ALL" && n.status !== filters.status) return false;
    if (filters.unreadOnly && n.readAt) return false;
    if (filters.readOnly && !n.readAt) return false;
    if (filters.campaignId && n.campaignId !== filters.campaignId) return false;
    if (filters.automationId && n.automationId !== filters.automationId) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${n.id} ${n.recipientUserId} ${n.title} ${n.sourceEventId ?? ""} ${n.relatedRideId ?? ""} ${n.relatedTicketId ?? ""} ${n.relatedTransactionId ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

async function processMockDelivery(notification: EngineNotification): Promise<EngineNotification> {
  const provider = getChannelProvider(notification.channel);
  const attemptNumber =
    deliveries.filter((d) => d.notificationId === notification.id).length + 1;
  const result = await provider.send({
    notificationId: notification.id,
    recipientUserId: notification.recipientUserId,
    channel: notification.channel,
    title: notification.title,
    body: notification.body,
    attemptNumber,
  });
  const now = new Date().toISOString();
  const attempt: DeliveryAttempt = {
    id: `del_${notification.id}_${attemptNumber}`,
    notificationId: notification.id,
    recipientUserId: notification.recipientUserId,
    channel: notification.channel,
    attemptNumber,
    status: result.status,
    provider: result.provider,
    providerReference: result.providerReference,
    attemptedAt: now,
    deliveredAt: result.deliveredAt,
    failureReason: result.failureReason,
    metadata: { mock: "true" },
  };
  deliveries = [attempt, ...deliveries];

  const status: NotificationDeliveryStatus = result.status;
  const updated: EngineNotification = {
    ...notification,
    status,
    sentAt: now,
    deliveredAt: result.deliveredAt,
    failedAt: result.status === "FAILED" ? now : null,
    updatedAt: now,
  };
  notifications = notifications.map((n) => (n.id === updated.id ? updated : n));

  // Sync admin bell for IN_APP
  if (notification.channel === "IN_APP") {
    await notificationsService.createNotification({
      id: `ops_${notification.id}`,
      category: mapOpsCategory(notification.category, notification.priority),
      title: notification.title,
      description: notification.body,
      createdAt: notification.createdAt,
      read: Boolean(notification.readAt),
      href: `/notifications/${notification.id}`,
    });
  }

  return updated;
}

export const notificationEngine = {
  async getNotifications(filters?: NotificationFilters): Promise<EngineNotification[]> {
    assertOk();
    return structuredClone(
      filterEngineNotifications(notifications, filters).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
  },

  async getNotificationById(id: string): Promise<EngineNotification | null> {
    assertOk();
    const n = notifications.find((x) => x.id === id);
    return n ? structuredClone(n) : null;
  },

  async getSummary(): Promise<NotificationSummary> {
    assertOk();
    return {
      unread: notifications.filter((n) => !n.readAt && n.status !== "CANCELLED").length,
      queued: notifications.filter((n) => n.status === "QUEUED").length,
      delivered: notifications.filter((n) => n.status === "DELIVERED" || n.status === "READ").length,
      failed: notifications.filter((n) => n.status === "FAILED").length,
      critical: notifications.filter((n) => n.priority === "CRITICAL").length,
    };
  },

  async getDeliveryHistory(notificationId?: string): Promise<DeliveryAttempt[]> {
    assertOk();
    const list = notificationId
      ? deliveries.filter((d) => d.notificationId === notificationId)
      : deliveries;
    return structuredClone(list);
  },

  async markRead(id: string): Promise<EngineNotification | null> {
    assertOk();
    const n = notifications.find((x) => x.id === id);
    if (!n) return null;
    const now = new Date().toISOString();
    const updated = { ...n, readAt: now, status: "READ" as const, updatedAt: now };
    notifications = notifications.map((x) => (x.id === id ? updated : x));
    await notificationsService.markAsRead(`ops_${id}`);
    return structuredClone(updated);
  },

  async markUnread(id: string): Promise<EngineNotification | null> {
    assertOk();
    const n = notifications.find((x) => x.id === id);
    if (!n) return null;
    const updated = {
      ...n,
      readAt: null,
      status: (n.deliveredAt ? "DELIVERED" : n.sentAt ? "SENT" : "QUEUED") as NotificationDeliveryStatus,
      updatedAt: new Date().toISOString(),
    };
    notifications = notifications.map((x) => (x.id === id ? updated : x));
    return structuredClone(updated);
  },

  async markAllRead(): Promise<void> {
    assertOk();
    const now = new Date().toISOString();
    notifications = notifications.map((n) =>
      n.readAt ? n : { ...n, readAt: now, status: "READ" as const, updatedAt: now },
    );
    await notificationsService.markAllAsRead();
  },

  /**
   * Process a domain realtime event through active automations.
   * Skips recursive notification.* events and dedupes by idempotency key.
   */
  async processEvent(input: {
    eventType: string;
    eventId: string;
    payload: Record<string, unknown>;
  }): Promise<EngineNotification[]> {
    assertOk();
    if (input.eventType.startsWith("notification.")) return [];
    if (processingDepth > 0 && input.eventType.startsWith("notification.")) return [];
    processingDepth += 1;
    try {
      const autos = await notificationAutomationsService.getActiveForEvent(input.eventType);
      const created: EngineNotification[] = [];
      for (const auto of autos) {
        if (!evaluateConditions(auto.conditions, input.payload)) continue;
        const template = await notificationTemplatesService.getTemplateById(auto.templateId);
        if (!template || template.status !== "ACTIVE") continue;

        let recipients: string[] = [];
        if (auto.audience.type === "USER") {
          const uid = String(
            input.payload.userId ?? input.payload.recipientUserId ?? "",
          );
          recipients = uid ? [uid] : [];
        } else {
          recipients = resolveAudience(auto.audience);
        }
        if (recipients.length === 0) continue;

        for (const recipientUserId of recipients) {
          const vars = buildVars(input.payload, recipientUserId);
          const rendered = renderTemplate(template.body, vars, template.subject);
          for (const channel of auto.channels) {
            const key = buildIdempotencyKey({
              sourceEventType: input.eventType,
              sourceEventId: input.eventId,
              automationId: auto.id,
              recipientUserId,
              channel,
            });
            if (processedKeys.has(key)) continue;
            processedKeys.add(key);
            const now = new Date().toISOString();
            const id = `eng_${input.eventId}_${auto.id}_${recipientUserId}_${channel}`.replace(
              /[^a-zA-Z0-9_]/g,
              "_",
            );
            const notification: EngineNotification = {
              id,
              recipientUserId,
              category: template.category,
              priority: auto.priority,
              title: rendered.subject ?? template.name,
              body: rendered.body,
              channel,
              status: "QUEUED",
              readAt: null,
              sentAt: null,
              deliveredAt: null,
              failedAt: null,
              templateId: template.id,
              automationId: auto.id,
              campaignId: null,
              sourceEventType: input.eventType,
              sourceEventId: input.eventId,
              relatedRideId: input.payload.rideId ? String(input.payload.rideId) : null,
              relatedTicketId: input.payload.ticketId ? String(input.payload.ticketId) : null,
              relatedTransactionId: input.payload.transactionId
                ? String(input.payload.transactionId)
                : null,
              idempotencyKey: key,
              createdAt: now,
              updatedAt: now,
            };
            notifications = [notification, ...notifications];
            const delivered = await processMockDelivery(notification);
            created.push(delivered);
          }
        }
      }
      return structuredClone(created);
    } finally {
      processingDepth -= 1;
    }
  },

  async runCampaign(
    campaign: NotificationCampaign,
  ): Promise<{ delivered: number; failed: number }> {
    assertOk();
    const template = await notificationTemplatesService.getTemplateById(campaign.templateId);
    if (!template || template.status !== "ACTIVE") {
      throw new Error("Campaign template must be ACTIVE.");
    }
    const recipients = resolveAudience(campaign.audience);
    let delivered = 0;
    let failed = 0;
    for (const recipientUserId of recipients) {
      const vars = buildVars({}, recipientUserId);
      const rendered = renderTemplate(template.body, vars, template.subject);
      for (const channel of campaign.channels) {
        const key = buildIdempotencyKey({
          sourceEventType: "campaign.manual",
          sourceEventId: campaign.id,
          automationId: `camp_${campaign.id}`,
          recipientUserId,
          channel,
        });
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);
        const now = new Date().toISOString();
        const id = `eng_camp_${campaign.id}_${recipientUserId}_${channel}`;
        const notification: EngineNotification = {
          id,
          recipientUserId,
          category: campaign.category,
          priority: "NORMAL",
          title: rendered.subject ?? campaign.name,
          body: rendered.body,
          channel,
          status: "QUEUED",
          readAt: null,
          sentAt: null,
          deliveredAt: null,
          failedAt: null,
          templateId: template.id,
          automationId: null,
          campaignId: campaign.id,
          sourceEventType: "campaign.manual",
          sourceEventId: campaign.id,
          relatedRideId: null,
          relatedTicketId: null,
          relatedTransactionId: null,
          idempotencyKey: key,
          createdAt: now,
          updatedAt: now,
        };
        notifications = [notification, ...notifications];
        const result = await processMockDelivery(notification);
        if (result.status === "FAILED") failed += 1;
        else delivered += 1;
      }
    }
    return { delivered, failed };
  },

  /**
   * Admin-composed notification through the engine (queue → mock provider → history).
   * Does not invent a second delivery path.
   */
  async sendAdminNotification(input: {
    recipientUserIds: string[];
    title: string;
    body: string;
    channel: NotificationChannel;
    category?: EngineNotificationCategory;
    priority?: NotificationPriority;
    templateId?: string | null;
    variables?: Record<string, string>;
    adminId: string;
    adminName: string;
    idempotencyKey?: string;
  }): Promise<EngineNotification[]> {
    assertOk();
    if (!input.recipientUserIds.length) throw new Error("At least one recipient is required.");
    if (!input.title.trim()) throw new Error("Title is required.");
    if (!input.body.trim()) throw new Error("Message body is required.");

    const vars = { ...SAMPLE_TEMPLATE_VARS, ...(input.variables ?? {}) };
    const rendered = renderTemplate(input.body, vars, input.title);
    const created: EngineNotification[] = [];
    const batchId = `admin_send_${Date.now()}`;

    for (const recipientUserId of input.recipientUserIds) {
      const key =
        input.idempotencyKey ??
        buildIdempotencyKey({
          sourceEventType: "admin.notification_send",
          sourceEventId: batchId,
          automationId: "admin_composer",
          recipientUserId,
          channel: input.channel,
        });
      if (processedKeys.has(key)) continue;
      processedKeys.add(key);
      const now = new Date().toISOString();
      const id = `eng_admin_${batchId}_${recipientUserId}_${input.channel}`.replace(
        /[^a-zA-Z0-9_]/g,
        "_",
      );
      const notification: EngineNotification = {
        id,
        recipientUserId,
        category: input.category ?? "ACCOUNT",
        priority: input.priority ?? "NORMAL",
        title: rendered.subject ?? input.title.trim(),
        body: rendered.body,
        channel: input.channel,
        status: "QUEUED",
        readAt: null,
        sentAt: null,
        deliveredAt: null,
        failedAt: null,
        templateId: input.templateId ?? null,
        automationId: null,
        campaignId: null,
        sourceEventType: "admin.notification_send",
        sourceEventId: batchId,
        relatedRideId: null,
        relatedTicketId: null,
        relatedTransactionId: null,
        idempotencyKey: key,
        createdAt: now,
        updatedAt: now,
      };
      notifications = [notification, ...notifications];
      const delivered = await processMockDelivery(notification);
      created.push(delivered);
    }

    const { auditService } = await import("@/services/audit");
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "notification.admin_sent",
      targetType: "notification_batch",
      targetId: batchId,
      newValue: {
        recipients: input.recipientUserIds.length,
        channel: input.channel,
        title: input.title.trim(),
      },
      reason: "Admin custom notification",
    });

    return structuredClone(created);
  },

  __resetForTests() {
    notifications = structuredClone(MOCK_ENGINE_NOTIFICATIONS);
    deliveries = structuredClone(MOCK_DELIVERY_ATTEMPTS);
    processedKeys.clear();
    for (const n of notifications) processedKeys.add(n.idempotencyKey);
    processingDepth = 0;
    forceError = null;
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
