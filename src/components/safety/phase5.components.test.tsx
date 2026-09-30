import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AssuredStatusBadge,
  IncidentStatusBadge,
  SeverityBadge,
  SosStatusBadge,
} from "@/components/status/SafetyBadges";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import userEvent from "@testing-library/user-event";
import { formatInrFromPaise, toPaise, calculateCompensationPoolPaise } from "@/lib/assuredRideMath";

describe("Phase 5 safety/assured badges", () => {
  it("renders SOS and severity with text", () => {
    render(<SosStatusBadge status="TRIGGERED" />);
    expect(screen.getByTestId("sos-status-badge")).toHaveTextContent(/Triggered/i);
    render(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByTestId("severity-badge")).toHaveTextContent(/CRITICAL/i);
  });

  it("renders incident and assured badges", () => {
    render(<IncidentStatusBadge status="ESCALATED" />);
    expect(screen.getByTestId("incident-status-badge")).toHaveTextContent(/ESCALATED/i);
    render(<AssuredStatusBadge status="COMPENSATION_PENDING" />);
    expect(screen.getByTestId("assured-status-badge")).toBeInTheDocument();
  });

  it("formats compensation display from domain math", () => {
    const pool = calculateCompensationPoolPaise(toPaise(50));
    expect(formatInrFromPaise(pool)).toMatch(/30/);
  });

  it("loading empty error states", () => {
    render(<LoadingState label="Loading SOS…" />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    render(<EmptyState title="No active SOS events." />);
    expect(screen.getByText(/No active SOS/i)).toBeInTheDocument();
    render(<ErrorState message="Unable to load incident data." />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("dark mode with safety badges", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
        <SosStatusBadge status="TRIGGERED" />
      </ThemeProvider>,
    );
    await user.click(await screen.findByTestId("theme-dark"));
    expect(screen.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("sos-status-badge")).toHaveTextContent(/Triggered/i);
  });
});
