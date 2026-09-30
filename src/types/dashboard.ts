import type { AlertPriority } from "./alert";

export interface ActiveNowMetrics {
  activeRides: number;
  activeDrivers: number;
  activePassengers: number;
  updatedAt: string;
}

export interface AttentionItem {
  id: string;
  priority: AlertPriority;
  title: string;
  description: string;
  source: string;
  timestamp: string;
  href: string;
  actionLabel: string;
}

export type OpsEventKind =
  | "health_recovered"
  | "health_degraded"
  | "health_down"
  | "alert_created"
  | "notification_checked"
  | "ride_event"
  | "system";

export interface OpsTimelineEvent {
  id: string;
  kind: OpsEventKind;
  title: string;
  timestamp: string;
  href?: string;
}

export interface DashboardSnapshot {
  activeNow: ActiveNowMetrics;
  needsAttention: AttentionItem[];
  recentEvents: OpsTimelineEvent[];
}
