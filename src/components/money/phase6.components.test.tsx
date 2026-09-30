import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CouponStatusBadge,
  CreditStatusBadge,
  DepositStatusBadge,
  ReferralStatusBadge,
  RefundStatusBadge,
  TransactionDirectionBadge,
  TransactionStatusBadge,
  WalletStatusBadge,
} from "@/components/status/MoneyBadges";
import { TransactionDetailPanel } from "@/components/money/TransactionDetailPanel";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { formatMoney, rupeesToPaise } from "@/lib/money";
import type { LedgerTransaction } from "@/types/transaction";

const sampleTxn: LedgerTransaction = {
  id: "txn_001",
  userId: "usr_001",
  walletId: "wal_001",
  type: "CREDIT",
  direction: "CREDIT",
  amountPaise: 50000,
  currency: "INR",
  status: "COMPLETED",
  referenceType: "ADJUSTMENT",
  referenceId: null,
  description: "Test",
  createdAt: "2026-09-10T06:00:00.000Z",
  completedAt: "2026-09-10T06:00:01.000Z",
  createdBy: "system",
  idempotencyKey: "x",
  reversesTransactionId: null,
  reversedByTransactionId: null,
  metadata: {},
};

describe("Phase 6 money badges and panels", () => {
  it("renders wallet and transaction badges with text", () => {
    render(<WalletStatusBadge status="LOCKED" />);
    expect(screen.getByTestId("wallet-status-badge")).toHaveAttribute("data-status", "LOCKED");
    render(<TransactionStatusBadge status="REVERSED" />);
    expect(screen.getByTestId("transaction-status-badge")).toHaveTextContent(/Reversed/i);
    render(<TransactionDirectionBadge direction="HOLD" />);
    expect(screen.getByTestId("transaction-direction-badge")).toHaveTextContent(/Hold/i);
  });

  it("renders deposit refund credit coupon referral badges", () => {
    render(<DepositStatusBadge status="FORFEITED" />);
    expect(screen.getByTestId("deposit-status-badge")).toHaveAttribute("data-status", "FORFEITED");
    render(<RefundStatusBadge status="REQUESTED" />);
    expect(screen.getByTestId("refund-status-badge")).toHaveTextContent(/Requested/i);
    render(<CreditStatusBadge status="PARTIALLY_USED" />);
    expect(screen.getByTestId("credit-status-badge")).toBeInTheDocument();
    render(<CouponStatusBadge status="ACTIVE" />);
    expect(screen.getByTestId("coupon-status-badge")).toHaveAttribute("data-status", "ACTIVE");
    render(<ReferralStatusBadge status="FRAUD_REVIEW" />);
    expect(screen.getByTestId("referral-status-badge")).toHaveTextContent(/Fraud/i);
  });

  it("transaction detail shows immutable note and reverse", () => {
    const onReverse = () => undefined;
    render(<TransactionDetailPanel txn={sampleTxn} onReverse={onReverse} />);
    expect(screen.getByTestId("txn-detail")).toBeInTheDocument();
    expect(screen.getByTestId("txn-immutable-note")).toBeInTheDocument();
    expect(screen.getByTestId("txn-reverse")).toBeInTheDocument();
  });

  it("formats money from domain helpers", () => {
    expect(formatMoney(rupeesToPaise(50))).toMatch(/50/);
  });

  it("loading empty error states for money pages", () => {
    render(<LoadingState label="Loading wallets…" />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    render(<EmptyState title="No transactions match your filters." />);
    expect(screen.getByText(/No transactions match/i)).toBeInTheDocument();
    render(<ErrorState message="Unable to load wallet data." />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("dark mode with money badges", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
        <RefundStatusBadge status="COMPLETED" />
        <WalletStatusBadge status="ACTIVE" />
      </ThemeProvider>,
    );
    await user.click(await screen.findByTestId("theme-dark"));
    expect(screen.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("refund-status-badge")).toBeInTheDocument();
  });
});
