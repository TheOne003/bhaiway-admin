/** Phase 7 notification engine domain — distinct from Phase 2 OpsNotification (admin bell). */

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type EngineNotificationCategory =
  | "RIDE"
  | "SAFETY"
  | "VERIFICATION"
  | "MONEY"
  | "SUPPORT"
  | "SYSTEM"
  | "GROWTH"
  | "ACCOUNT";

export type NotificationChannel = "IN_APP" | "PUSH" | "SMS" | "EMAIL" | "WHATSAPP";

export type NotificationDeliveryStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "READ"
  | "CANCELLED";

export interface EngineNotification {
  id: string;
  recipientUserId: string;
  category: EngineNotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  readAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  templateId: string | null;
  automationId: string | null;
  campaignId: string | null;
  sourceEventType: string | null;
  sourceEventId: string | null;
  relatedRideId: string | null;
  relatedTicketId: string | null;
  relatedTransactionId: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAttempt {
  id: string;
  notificationId: string;
  recipientUserId: string;
  channel: NotificationChannel;
  attemptNumber: number;
  status: NotificationDeliveryStatus;
  provider: string;
  providerReference: string;
  attemptedAt: string;
  deliveredAt: string | null;
  failureReason: string | null;
  metadata: Record<string, string>;
}

export interface NotificationFilters {
  category?: EngineNotificationCategory | "ALL";
  priority?: NotificationPriority | "ALL";
  channel?: NotificationChannel | "ALL";
  status?: NotificationDeliveryStatus | "ALL";
  unreadOnly?: boolean;
  readOnly?: boolean;
  search?: string;
  campaignId?: string;
  automationId?: string;
}

export interface NotificationSummary {
  unread: number;
  queued: number;
  delivered: number;
  failed: number;
  critical: number;
}
