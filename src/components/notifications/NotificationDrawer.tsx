"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OpsNotification, NotificationCategory } from "@/types/notification";

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  critical: "Critical",
  operations: "Operations",
  system: "System",
};

interface NotificationBellProps {
  unreadCount: number;
  open: boolean;
  onToggle: () => void;
}

export function NotificationBell({ unreadCount, open, onToggle }: NotificationBellProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--bw-border)] text-[var(--bw-text-secondary)] hover:bg-[var(--bw-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      aria-expanded={open}
      title="Notifications"
      data-testid="notification-bell"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span
          className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--bw-danger)] px-1 text-[10px] font-semibold text-white"
          data-testid="notification-unread-count"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}

interface NotificationDrawerProps {
  open: boolean;
  notifications: OpsNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}

export function NotificationDrawer({
  open,
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: NotificationDrawerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const grouped: Record<NotificationCategory, OpsNotification[]> = {
    critical: [],
    operations: [],
    system: [],
  };
  notifications.forEach((n) => grouped[n.category].push(n));

  return (
    <div className="fixed inset-0 z-50" data-testid="notification-drawer">
      <button
        type="button"
        className="absolute inset-0 bg-black/25"
        aria-label="Close notifications"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[var(--bw-border)] bg-[var(--bw-surface)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--bw-border)] px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold">
            Notifications
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void onMarkAllRead()} data-testid="mark-all-read">
              Mark all read
            </Button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-[var(--bw-text-secondary)] hover:bg-[var(--bw-elevated)]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {notifications.length === 0 ? (
            <EmptyState title="No notifications" description="You're all caught up." />
          ) : (
            (Object.keys(grouped) as NotificationCategory[]).map((category) => {
              const items = grouped[category];
              if (items.length === 0) return null;
              return (
                <section key={category} className="mb-5" aria-label={CATEGORY_LABEL[category]}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
                    {CATEGORY_LABEL[category]}
                  </h3>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className={cn(
                          "rounded-md border border-[var(--bw-border)] p-3",
                          !item.read && "bg-[var(--bw-elevated)]",
                          item.category === "critical" && !item.read && "border-l-4 border-l-[var(--bw-danger)]",
                        )}
                        data-testid="notification-item"
                        data-read={item.read}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-[var(--bw-text-primary)]">
                              {item.category === "critical" ? "🔴 " : ""}
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs text-[var(--bw-text-secondary)]">
                              {item.description}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--bw-text-muted)]">
                              {formatRelativeTime(item.createdAt)}
                            </p>
                          </div>
                          {!item.read ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void onMarkRead(item.id)}
                              data-testid={`mark-read-${item.id}`}
                            >
                              Read
                            </Button>
                          ) : null}
                        </div>
                        {item.href ? (
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className="mt-2 inline-block text-xs font-medium text-[var(--bw-brand)] hover:underline"
                          >
                            Open related
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>

        <footer className="border-t border-[var(--bw-border)] px-4 py-3">
          <Link
            href="/notifications"
            onClick={onClose}
            className="text-sm font-medium text-[var(--bw-brand)] hover:underline"
            data-testid="notif-drawer-center-link"
          >
            Open Notification Center
          </Link>
        </footer>
      </aside>
    </div>
  );
}
