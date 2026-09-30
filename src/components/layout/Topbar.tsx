"use client";

import { LogOut, Menu, Search, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { LiveClock } from "@/components/layout/LiveClock";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import {
  NotificationBell,
  NotificationDrawer,
} from "@/components/notifications/NotificationDrawer";
import { getPageTitle } from "@/config/navigation";
import { formatAdminRole } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";

interface TopbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({ sidebarOpen, onToggleSidebar }: TopbarProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const { session, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useOps();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b-2 border-b-[var(--bw-brand)] bg-[var(--bw-surface)]/95 px-3 backdrop-blur sm:px-4"
        data-testid="admin-topbar"
      >
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--bw-border)] text-[var(--bw-text-secondary)] hover:bg-[var(--bw-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={sidebarOpen}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          data-testid="sidebar-toggle"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--bw-brand)]">{pageTitle}</p>
          <p className="hidden text-xs text-[var(--bw-text-muted)] sm:block">BhaiWay Admin</p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <label className="relative hidden md:block">
            <span className="sr-only">Global search</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--bw-text-muted)]"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search…"
              className="h-9 w-48 rounded-md border border-[var(--bw-border)] bg-[var(--bw-bg)] pl-8 pr-3 text-sm text-[var(--bw-text-primary)] placeholder:text-[var(--bw-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)] lg:w-64"
              disabled
              title="Global search coming soon"
            />
          </label>

          <LiveClock className="hidden sm:inline" />

          <NotificationBell
            unreadCount={unreadCount}
            open={notifOpen}
            onToggle={() => setNotifOpen((v) => !v)}
          />

          <ThemeSwitcher compact className="hidden xl:inline-flex" />

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--bw-border)] px-2 py-1.5 text-left hover:bg-[var(--bw-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              data-testid="admin-profile-menu"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bw-brand-soft)] text-xs font-semibold text-[var(--bw-brand)]">
                {session?.admin.avatarInitials ?? "AD"}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-xs font-medium text-[var(--bw-text-primary)]">
                  {session?.admin.name ?? "Admin"}
                </span>
                <span className="block truncate text-[10px] text-[var(--bw-text-muted)]">
                  {session ? formatAdminRole(session.admin.role) : "—"}
                </span>
              </span>
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-1 w-48 rounded-md border border-[var(--bw-border)] bg-[var(--bw-elevated)] p-1 shadow-lg"
              >
                <div className="px-2 py-2 xl:hidden">
                  <ThemeSwitcher />
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-[var(--bw-text-secondary)] hover:bg-[var(--bw-surface)] hover:text-[var(--bw-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
                  data-testid="logout-button"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <NotificationDrawer
        open={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
        onMarkRead={markNotificationRead}
        onMarkAllRead={markAllNotificationsRead}
      />
    </>
  );
}
