import type {
  EngineNotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from "./notifications";

export type TemplateStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type AutomationStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export type AudienceType =
  | "USER"
  | "RIDER"
  | "DRIVER"
  | "BOTH"
  | "OFFICE_COMMUTE_USERS"
  | "OUTSTATION_USERS"
  | "VERIFIED_USERS"
  | "CUSTOM_USER_SET";

export interface AudienceSpec {
  type: AudienceType;
  /** For USER / CUSTOM_USER_SET */
  userIds?: string[];
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  category: EngineNotificationCategory;
  eventType: string;
  channels: NotificationChannel[];
  subject: string | null;
  body: string;
  variables: string[];
  status: TemplateStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface AutomationCondition {
  field: string;
  op: "eq" | "neq" | "in";
  value: string | string[];
}

export interface NotificationAutomation {
  id: string;
  name: string;
  description: string;
  eventType: string;
  conditions: AutomationCondition[];
  audience: AudienceSpec;
  templateId: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  status: AutomationStatus;
  /** Seconds; 0 = no cooldown */
  cooldownSeconds: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  description: string;
  category: EngineNotificationCategory;
  audience: AudienceSpec;
  templateId: string;
  channels: NotificationChannel[];
  status: CampaignStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CommunicationLogEntry {
  id: string;
  notificationId: string;
  source: "AUTOMATION" | "CAMPAIGN" | "MANUAL" | "SYSTEM";
  campaignId: string | null;
  automationId: string | null;
  channel: NotificationChannel;
  category: EngineNotificationCategory;
  recipientUserId: string;
  status: string;
  createdAt: string;
  deliveredAt: string | null;
  failedAt: string | null;
  title: string;
}

export const TEMPLATE_VARIABLES = [
  "userName",
  "rideId",
  "driverName",
  "pickup",
  "dropoff",
  "amount",
  "ticketId",
  "verificationType",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];
