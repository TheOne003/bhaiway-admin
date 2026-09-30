import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SystemHealthBadge } from "@/components/status/SystemHealthBadge";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { Button } from "@/components/ui/Button";

describe("status badges", () => {
  it("renders system health with status text (not color alone)", () => {
    render(<SystemHealthBadge status="critical" />);
    expect(screen.getByTestId("system-health-badge")).toHaveAttribute(
      "data-status",
      "critical",
    );
    expect(screen.getByTestId("system-health-badge")).toHaveTextContent(/Critical/i);
  });

  it("renders network badges for office and outstation", () => {
    const { rerender } = render(<NetworkBadge network="OFFICE" />);
    expect(screen.getByText("OFFICE")).toBeInTheDocument();
    rerender(<NetworkBadge network="OUTSTATION" />);
    expect(screen.getByText("OUTSTATION")).toBeInTheDocument();
  });
});

describe("Button", () => {
  it("shows loading state and disables interaction", () => {
    render(
      <Button loading data-testid="btn">
        Save
      </Button>,
    );
    expect(screen.getByTestId("btn")).toBeDisabled();
    expect(screen.getByText("Working…")).toBeInTheDocument();
  });
});
