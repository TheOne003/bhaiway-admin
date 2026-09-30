import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetNotificationsForTests,
  countUnread,
  notificationsService,
} from "@/services/notifications";

describe("notificationsService", () => {
  beforeEach(() => {
    __resetNotificationsForTests();
  });

  it("counts unread notifications", async () => {
    const list = await notificationsService.getNotifications();
    expect(countUnread(list)).toBeGreaterThan(0);
    expect(notificationsService.getUnreadCount(list)).toBe(countUnread(list));
  });

  it("marks one and all as read", async () => {
    const list = await notificationsService.getNotifications();
    const unread = list.find((n) => !n.read)!;
    await notificationsService.markAsRead(unread.id);
    const after = await notificationsService.getNotifications();
    expect(after.find((n) => n.id === unread.id)?.read).toBe(true);
    await notificationsService.markAllAsRead();
    const all = await notificationsService.getNotifications();
    expect(countUnread(all)).toBe(0);
  });
});
