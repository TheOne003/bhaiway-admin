import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AccountStatusBadge,
  UserTypeBadge,
  VerificationBadge,
} from "@/components/status/PeopleBadges";
import { ConfirmDialog, DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { OpsProvider } from "@/providers/OpsProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { __resetUsersForTests } from "@/services/users";
import { __resetDriversForTests } from "@/services/drivers";
import { __resetVerificationForTests } from "@/services/verification";
import { __resetAuditForTests } from "@/services/audit";
import { __resetAlertsForTests } from "@/services/alerts";
import { __resetNotificationsForTests } from "@/services/notifications";
import { __resetDashboardForTests } from "@/services/dashboard";
import { __resetRidesForTests } from "@/services/rides";
import { __resetSystemHealthForTests } from "@/services/systemHealth";

const replaceMock = vi.fn();
let mockParams: Record<string, string> = { id: "usr_001" };
let mockSearch = new URLSearchParams();

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/users",
  useParams: () => mockParams,
  useSearchParams: () => mockSearch,
}));

import UsersPage from "@/app/(admin)/users/page";
import UserDetailPage from "@/app/(admin)/users/[id]/page";
import DriversPage from "@/app/(admin)/drivers/page";
import DriverDetailPage from "@/app/(admin)/drivers/[id]/page";
import VerificationPage from "@/app/(admin)/verification/page";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OpsProvider>{children}</OpsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  __resetSystemHealthForTests();
  __resetAlertsForTests();
  __resetNotificationsForTests();
  __resetDashboardForTests();
  __resetRidesForTests();
  __resetUsersForTests();
  __resetDriversForTests();
  __resetVerificationForTests();
  __resetAuditForTests();
  mockParams = { id: "usr_001" };
  mockSearch = new URLSearchParams();
  replaceMock.mockReset();
});

describe("people badges", () => {
  it("renders UserTypeBadge", () => {
    render(<UserTypeBadge type="BOTH" />);
    expect(screen.getByTestId("user-type-badge")).toHaveTextContent(/Both/i);
    expect(screen.getByTestId("user-type-badge")).toHaveAttribute("data-type", "BOTH");
  });

  it("renders AccountStatusBadge", () => {
    render(<AccountStatusBadge status="SUSPENDED" />);
    expect(screen.getByTestId("account-status-badge")).toHaveTextContent(/Suspended/i);
  });

  it("renders VerificationBadge with text not color alone", () => {
    render(<VerificationBadge status="PENDING" />);
    expect(screen.getByTestId("verification-badge")).toHaveTextContent(/PENDING/i);
  });
});

describe("users UI", () => {
  it("renders users table with filters and search", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <UsersPage />
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByTestId("users-table")).toBeInTheDocument());
    expect(screen.getByTestId("users-summary")).toBeInTheDocument();

    await user.click(screen.getByTestId("users-type-RIDER"));
    const rows = screen.getAllByTestId(/^user-row-/);
    expect(rows.every((row) => ["RIDER", "BOTH"].includes(row.getAttribute("data-type") ?? ""))).toBe(
      true,
    );

    await user.type(screen.getByTestId("users-search"), "Neha");
    await waitFor(() => expect(screen.getByTestId("user-row-usr_001")).toBeInTheDocument());
  });

  it("renders user detail", async () => {
    render(
      <Wrapper>
        <UserDetailPage />
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByTestId("user-detail-page")).toBeInTheDocument());
    expect(
      within(screen.getByTestId("user-detail-page")).getByRole("heading", { name: /Neha Kapoor/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("user-verification-summary")).toBeInTheDocument();
  });
});

describe("drivers UI", () => {
  it("renders drivers table", async () => {
    render(
      <Wrapper>
        <DriversPage />
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByTestId("drivers-table")).toBeInTheDocument());
  });

  it("renders driver detail", async () => {
    mockParams = { id: "drv_usr_002" };
    render(
      <Wrapper>
        <DriverDetailPage />
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByTestId("driver-detail-page")).toBeInTheDocument());
    expect(screen.getByTestId("driver-vehicle-context")).toBeInTheDocument();
  });
});

describe("verification UI", () => {
  it("renders verification tabs and table", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <VerificationPage />
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByTestId("verification-page")).toBeInTheDocument());
    expect(screen.getByTestId("verification-tabs")).toBeInTheDocument();
    await user.click(screen.getByTestId("verification-tab-CORPORATE"));
    await waitFor(() => expect(screen.getByTestId("verification-table")).toBeInTheDocument());
  });

  it("opens verification detail drawer and shows approve confirmation", async () => {
    const user = userEvent.setup();
    mockSearch = new URLSearchParams("id=ver_gov_004");
    render(
      <Wrapper>
        <VerificationPage />
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByTestId("detail-drawer")).toBeInTheDocument());
    expect(screen.getByTestId("verification-detail")).toBeInTheDocument();

    await user.click(screen.getByTestId("verification-approve"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("shows reject reason dialog", async () => {
    const user = userEvent.setup();
    render(
      <ReasonConfirmDialog
        open
        title="Reject Verification"
        description="Provide a reason."
        onCancel={() => undefined}
        onConfirm={() => undefined}
        danger
      />,
    );
    expect(screen.getByTestId("reason-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason/i)).toBeInTheDocument();
    await user.type(screen.getByTestId("reason-input"), "Invalid document");
    expect(screen.getByTestId("reason-confirm")).not.toBeDisabled();
  });

  it("manual review flow requires reason", () => {
    render(
      <ReasonConfirmDialog
        open
        title="Send to Manual Review"
        description="Provide a review reason."
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );
    expect(screen.getByTestId("reason-confirm")).toBeDisabled();
  });
});

describe("states and theme", () => {
  it("renders loading empty error states", () => {
    const { unmount } = render(<LoadingState label="Loading users…" />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    unmount();
    render(<EmptyState title="No users found" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    render(<ErrorState message="Unable to load users." />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("dark mode works with people badges", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
        <div data-testid="badge-fixture">
          <VerificationBadge status="APPROVED" />
          <AccountStatusBadge status="ACTIVE" />
        </div>
      </ThemeProvider>,
    );
    await user.click(await screen.findByTestId("theme-dark"));
    expect(screen.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
    expect(
      within(screen.getByTestId("badge-fixture")).getByTestId("verification-badge"),
    ).toHaveTextContent(/APPROVED/i);
  });

  it("confirm dialog closes on cancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Suspend user"
        description="Confirm"
        onCancel={onCancel}
        onConfirm={() => undefined}
      />,
    );
    await user.click(within(screen.getByTestId("confirm-dialog")).getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("detail drawer escape closes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <DetailDrawer open title="Verification" onClose={onClose}>
        <div>body</div>
      </DetailDrawer>,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
