import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActiveNowSection } from "@/components/dashboard/ActiveNowSection";
import { NeedsAttentionSection } from "@/components/dashboard/NeedsAttentionSection";
import { SystemHealthSummarySection } from "@/components/dashboard/SystemHealthSummarySection";
import { SystemHealthTable } from "@/components/system/SystemHealthTable";
import { AlertsPanel } from "@/components/alerts/AlertsPanel";
import {
  NotificationBell,
  NotificationDrawer,
} from "@/components/notifications/NotificationDrawer";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { MOCK_SYSTEM_HEALTH } from "@/mock/systemHealth";
import { MOCK_ALERTS } from "@/mock/alerts";
import { MOCK_NOTIFICATIONS } from "@/mock/notifications";

describe("Phase 2 components", () => {
  it("renders dashboard active metrics", () => {
    render(
      <ActiveNowSection
        metrics={{
          activeRides: 142,
          activeDrivers: 118,
          activePassengers: 327,
          updatedAt: "2026-09-20T00:00:00.000Z",
        }}
      />,
    );
    expect(screen.getByTestId("active-now")).toBeInTheDocument();
    expect(screen.getByText("142")).toBeInTheDocument();
    expect(screen.getByText("118")).toBeInTheDocument();
    expect(screen.getByText("327")).toBeInTheDocument();
  });

  it("renders needs attention critical item", () => {
    render(
      <NeedsAttentionSection
        items={[
          {
            id: "1",
            priority: "critical",
            title: "RC Verification API unavailable",
            description: "Vehicle verification may be affected.",
            source: "system_health",
            timestamp: "2026-09-20T00:00:00.000Z",
            href: "/system-health",
            actionLabel: "View System Health",
          },
        ]}
      />,
    );
    expect(screen.getByTestId("attention-item")).toHaveAttribute("data-priority", "critical");
    expect(screen.getByText(/RC Verification API unavailable/i)).toBeInTheDocument();
  });

  it("renders system health summary counts", () => {
    render(<SystemHealthSummarySection health={MOCK_SYSTEM_HEALTH} />);
    expect(screen.getByTestId("health-summary")).toBeInTheDocument();
    expect(screen.getByText("Operational")).toBeInTheDocument();
  });

  it("renders system health table and opens detail", async () => {
    const user = userEvent.setup();
    render(<SystemHealthTable health={MOCK_SYSTEM_HEALTH} />);
    expect(screen.getByTestId("system-health-table")).toBeInTheDocument();
    await user.click(screen.getByTestId("view-service-svc_rc"));
    expect(screen.getByTestId("service-detail")).toBeInTheDocument();
    expect(screen.getByTestId("service-detail")).toHaveTextContent(/Vehicle Verification/i);
  });

  it("filters alert rows", async () => {
    const user = userEvent.setup();
    render(
      <AlertsPanel
        alerts={MOCK_ALERTS}
        onAcknowledge={async () => undefined}
        onResolve={async () => undefined}
      />,
    );
    await user.click(screen.getByTestId("alert-filter-critical"));
    const rows = screen.getAllByTestId("alert-row");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("shows notification unread state and drawer", async () => {
    const user = userEvent.setup();
    const markRead = vi.fn(async () => undefined);
    render(
      <>
        <NotificationBell unreadCount={2} open={false} onToggle={() => undefined} />
        <NotificationDrawer
          open
          notifications={MOCK_NOTIFICATIONS}
          onClose={() => undefined}
          onMarkRead={markRead}
          onMarkAllRead={async () => undefined}
        />
      </>,
    );
    expect(screen.getByTestId("notification-unread-count")).toHaveTextContent("2");
    expect(screen.getByTestId("notification-drawer")).toBeInTheDocument();
    const unread = MOCK_NOTIFICATIONS.find((n) => !n.read)!;
    await user.click(screen.getByTestId(`mark-read-${unread.id}`));
    expect(markRead).toHaveBeenCalledWith(unread.id);
  });

  it("theme switcher still works with command center components", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );
    await user.click(await screen.findByTestId("theme-dark"));
    expect(screen.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
  });
});
