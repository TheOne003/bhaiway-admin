export type NotificationCategory = "critical" | "operations" | "system";

export interface OpsNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  href?: string;
  relatedAlertId?: string;
  relatedServiceId?: string;
}
