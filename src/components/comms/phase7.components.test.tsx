import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AutomationStatusBadge,
  CampaignStatusBadge,
  NotificationChannelBadge,
  NotificationPriorityBadge,
  NotificationStatusBadge,
  SupportPriorityBadge,
  SupportStatusBadge,
  TemplateStatusBadge,
} from "@/components/status/CommsBadges";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { renderTemplate } from "@/lib/notificationTemplates";

describe("Phase 7 comms/support badges", () => {
  it("renders notification badges with text", () => {
    render(<NotificationStatusBadge status="FAILED" />);
    expect(screen.getByTestId("notification-status-badge")).toHaveAttribute("data-status", "FAILED");
    render(<NotificationPriorityBadge priority="CRITICAL" />);
    expect(screen.getByTestId("notification-priority-badge")).toHaveTextContent(/Critical/i);
    render(<NotificationChannelBadge channel="SMS" />);
    expect(screen.getByTestId("notification-channel-badge")).toHaveTextContent(/SMS/i);
  });

  it("renders template automation campaign support badges", () => {
    render(<TemplateStatusBadge status="ACTIVE" />);
    expect(screen.getByTestId("template-status-badge")).toBeInTheDocument();
    render(<AutomationStatusBadge status="PAUSED" />);
    expect(screen.getByTestId("automation-status-badge")).toHaveAttribute("data-status", "PAUSED");
    render(<CampaignStatusBadge status="RUNNING" />);
    expect(screen.getByTestId("campaign-status-badge")).toBeInTheDocument();
    render(<SupportStatusBadge status="ESCALATED" />);
    expect(screen.getByTestId("support-status-badge")).toHaveTextContent(/Escalated/i);
    render(<SupportPriorityBadge priority="URGENT" />);
    expect(screen.getByTestId("support-priority-badge")).toHaveAttribute("data-status", "URGENT");
  });

  it("template preview substitution", () => {
    const out = renderTemplate("Hi {{userName}}", { userName: "Rahul" });
    expect(out.body).toBe("Hi Rahul");
  });

  it("notification drawer links to center", () => {
    render(
      <NotificationDrawer
        open
        notifications={[]}
        onClose={() => undefined}
        onMarkRead={async () => undefined}
        onMarkAllRead={async () => undefined}
      />,
    );
    expect(screen.getByTestId("notif-drawer-center-link")).toBeInTheDocument();
  });

  it("loading empty error states", () => {
    render(<LoadingState label="Loading notifications…" />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    render(<EmptyState title="No unread notifications." />);
    expect(screen.getByText(/No unread notifications/i)).toBeInTheDocument();
    render(<ErrorState message="Unable to load conversation." />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("dark mode with support badges", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
        <SupportStatusBadge status="OPEN" />
        <NotificationPriorityBadge priority="CRITICAL" />
      </ThemeProvider>,
    );
    await user.click(await screen.findByTestId("theme-dark"));
    expect(screen.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("support-status-badge")).toBeInTheDocument();
  });
});
