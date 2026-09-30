import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PermissionMatrix } from "@/components/settings/PermissionMatrix";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { AuthProvider } from "@/providers/AuthProvider";
import { PERMISSION_CATALOG } from "@/mock/permissions";
import type { PermissionId } from "@/types/permission";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Phase 8 access + permissions UI", () => {
  it("AccessDenied renders 403", () => {
    render(<AccessDenied permission="analytics.view" />);
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /403/i })).toBeInTheDocument();
    expect(screen.getByText(/Required: analytics\.view/i)).toBeInTheDocument();
    expect(screen.getByTestId("access-denied-home")).toHaveAttribute("href", "/dashboard");
  });

  it("PermissionGuard forceDenied shows AccessDenied", async () => {
    render(
      <AuthProvider>
        <PermissionGuard permission="analytics.view" forceDenied>
          <div data-testid="secret-content">Secret</div>
        </PermissionGuard>
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("access-denied")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("secret-content")).not.toBeInTheDocument();
  });

  it("PermissionMatrix toggles permissions", async () => {
    const user = userEvent.setup();
    const selected: PermissionId[] = ["dashboard.view"];
    const onToggle = vi.fn();
    const sample = PERMISSION_CATALOG.filter((p) =>
      ["dashboard.view", "analytics.view"].includes(p.id),
    );

    render(
      <PermissionMatrix
        permissions={sample}
        selectedIds={selected}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByTestId("permission-matrix")).toBeInTheDocument();
    const analyticsToggle = screen.getByTestId("perm-toggle-analytics.view");
    expect(analyticsToggle).not.toBeChecked();
    await user.click(analyticsToggle);
    expect(onToggle).toHaveBeenCalledWith("analytics.view", true);

    const dashToggle = screen.getByTestId("perm-toggle-dashboard.view");
    expect(dashToggle).toBeChecked();
    await user.click(dashToggle);
    expect(onToggle).toHaveBeenCalledWith("dashboard.view", false);
  });

  it("dark mode theme class still works", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
        <AccessDenied />
      </ThemeProvider>,
    );
    await user.click(await screen.findByTestId("theme-dark"));
    expect(screen.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
  });
});
