import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { RideStatusBadge } from "@/components/status/RideStatusBadge";
import { MapLegend } from "@/components/maps/MapLegend";
import { RideDetailContent } from "@/components/rides/RideDetailContent";
import { RideDetailDrawer } from "@/components/rides/RideDetailDrawer";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { MOCK_RIDES } from "@/mock/rides";

describe("Phase 3 ride components", () => {
  it("renders NetworkBadge for office and outstation", () => {
    const { rerender } = render(<NetworkBadge network="OFFICE" />);
    expect(screen.getByText("OFFICE")).toBeInTheDocument();
    rerender(<NetworkBadge network="OUTSTATION" />);
    expect(screen.getByText("OUTSTATION")).toBeInTheDocument();
  });

  it("renders RideStatusBadge with accessible text", () => {
    render(<RideStatusBadge status="delayed" />);
    expect(screen.getByTestId("ride-status-badge")).toHaveTextContent(/Delayed/i);
  });

  it("renders map legend", () => {
    render(<MapLegend />);
    expect(screen.getByTestId("map-legend")).toHaveTextContent(/Office/i);
    expect(screen.getByTestId("map-legend")).toHaveTextContent(/Outstation/i);
  });

  it("renders ride detail content", () => {
    const ride = MOCK_RIDES.find((r) => r.id === "BW10291")!;
    render(<RideDetailContent ride={ride} compact />);
    expect(screen.getByTestId("ride-detail-content")).toBeInTheDocument();
    expect(screen.getByText(/Rahul Verma/i)).toBeInTheDocument();
    expect(screen.getByTestId("open-full-ride")).toBeInTheDocument();
  });

  it("opens and closes ride detail drawer", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const ride = MOCK_RIDES[0];
    render(<RideDetailDrawer ride={ride} open onClose={onClose} />);
    expect(screen.getByTestId("detail-drawer")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders empty and error states", () => {
    render(<EmptyState title="No active rides right now." />);
    expect(screen.getByText(/No active rides right now/i)).toBeInTheDocument();
    render(<ErrorState title="Live map unavailable." message="fail" />);
    expect(screen.getByText(/Live map unavailable/i)).toBeInTheDocument();
  });

  it("theme switcher works alongside ride UI", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
        <NetworkBadge network="OFFICE" />
      </ThemeProvider>,
    );
    await user.click(await screen.findByTestId("theme-dark"));
    expect(screen.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
  });
});
