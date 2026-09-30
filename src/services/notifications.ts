import { MOCK_NOTIFICATIONS } from "@/mock/notifications";
import type { OpsNotification } from "@/types/notification";

export interface NotificationsService {
  getNotifications(): Promise<OpsNotification[]>;
  getUnreadCount(list?: OpsNotification[]): number;
  markAsRead(id: string): Promise<OpsNotification | null>;
  markAsUnread(id: string): Promise<OpsNotification | null>;
  markAllAsRead(): Promise<void>;
  createNotification(
    input: Omit<OpsNotification, "id" | "createdAt" | "read"> & {
      id?: string;
      createdAt?: string;
      read?: boolean;
    },
  ): Promise<OpsNotification>;
}

let notifications: OpsNotification[] = structuredClone(MOCK_NOTIFICATIONS);
let forceError = false;

export function __resetNotificationsForTests(): void {
  notifications = structuredClone(MOCK_NOTIFICATIONS);
  forceError = false;
}

export function __setNotificationsErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function countUnread(list: OpsNotification[]): number {
  return list.filter((n) => !n.read).length;
}

export const notificationsService: NotificationsService = {
  async getNotifications() {
    if (forceError) throw new Error("Unable to load notifications.");
    return structuredClone(notifications).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  getUnreadCount(list) {
    return countUnread(list ?? notifications);
  },

  async markAsRead(id) {
    const item = notifications.find((n) => n.id === id);
    if (!item) return null;
    item.read = true;
    return structuredClone(item);
  },

  async markAsUnread(id) {
    const item = notifications.find((n) => n.id === id);
    if (!item) return null;
    item.read = false;
    return structuredClone(item);
  },

  async markAllAsRead() {
    notifications = notifications.map((n) => ({ ...n, read: true }));
  },

  async createNotification(input) {
    const now = input.createdAt ?? new Date().toISOString();
    const notification: OpsNotification = {
      id: input.id ?? `notif_${Date.now()}`,
      category: input.category,
      title: input.title,
      description: input.description,
      createdAt: now,
      read: input.read ?? false,
      href: input.href,
      relatedAlertId: input.relatedAlertId,
      relatedServiceId: input.relatedServiceId,
    };
    notifications = [notification, ...notifications.filter((n) => n.id !== notification.id)];
    return structuredClone(notification);
  },
};
