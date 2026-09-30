export type AlertPriority = "critical" | "warning" | "info";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export type AlertSource =
  | "system_health"
  | "safety"
  | "support"
  | "verification"
  | "payments"
  | "operations";

export interface OpsAlert {
  id: string;
  priority: AlertPriority;
  title: string;
  description: string;
  source: AlertSource;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
  read: boolean;
  href?: string;
  relatedServiceId?: string;
}

export type AlertFilter =
  | "all"
  | "critical"
  | "warning"
  | "info"
  | "unread"
  | "resolved";
