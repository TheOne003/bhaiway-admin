import { cn } from "@/lib/utils";
import type { CouponStatus } from "@/types/coupon";
import type { CreditStatus } from "@/types/credit";
import type { ReferralStatus } from "@/types/referral";
import type { RefundStatus } from "@/types/refund";
import type { SecurityDepositStatus } from "@/types/securityDeposit";
import type { TransactionStatus } from "@/types/transaction";
import type { MoneyDirection } from "@/types/money";
import type { WalletStatus } from "@/types/wallet";

function BadgeShell({
  testId,
  status,
  className,
  symbol,
  label,
}: {
  testId: string;
  status: string;
  className?: string;
  symbol: string;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        className,
      )}
      data-testid={testId}
      data-status={status}
    >
      <span aria-hidden>{symbol}</span>
      {label}
    </span>
  );
}

const WALLET_LABELS: Record<WalletStatus, string> = {
  ACTIVE: "Active",
  LOCKED: "Locked",
  SUSPENDED: "Suspended",
  CLOSED: "Closed",
};

const WALLET_SYMBOLS: Record<WalletStatus, string> = {
  ACTIVE: "✓",
  LOCKED: "⊘",
  SUSPENDED: "⏸",
  CLOSED: "■",
};

export function WalletStatusBadge({ status }: { status: WalletStatus }) {
  return (
    <BadgeShell
      testId="wallet-status-badge"
      status={status}
      symbol={WALLET_SYMBOLS[status]}
      label={WALLET_LABELS[status]}
      className={cn(
        status === "ACTIVE" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "LOCKED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        status === "SUSPENDED" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "CLOSED" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
      )}
    />
  );
}

const TXN_LABELS: Record<TransactionStatus, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  FAILED: "Failed",
  REVERSED: "Reversed",
  CANCELLED: "Cancelled",
};

const TXN_SYMBOLS: Record<TransactionStatus, string> = {
  PENDING: "…",
  COMPLETED: "✓",
  FAILED: "✕",
  REVERSED: "↩",
  CANCELLED: "—",
};

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <BadgeShell
      testId="transaction-status-badge"
      status={status}
      symbol={TXN_SYMBOLS[status]}
      label={TXN_LABELS[status]}
      className={cn(
        status === "PENDING" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "COMPLETED" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "FAILED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        status === "REVERSED" &&
          "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
        status === "CANCELLED" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
      )}
    />
  );
}

const DIR_LABELS: Record<MoneyDirection, string> = {
  CREDIT: "Credit",
  DEBIT: "Debit",
  HOLD: "Hold",
  RELEASE: "Release",
};

const DIR_SYMBOLS: Record<MoneyDirection, string> = {
  CREDIT: "+",
  DEBIT: "−",
  HOLD: "⊡",
  RELEASE: "⊟",
};

export function TransactionDirectionBadge({ direction }: { direction: MoneyDirection }) {
  return (
    <BadgeShell
      testId="transaction-direction-badge"
      status={direction}
      symbol={DIR_SYMBOLS[direction]}
      label={DIR_LABELS[direction]}
      className={cn(
        direction === "CREDIT" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        direction === "DEBIT" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        (direction === "HOLD" || direction === "RELEASE") &&
          "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
      )}
    />
  );
}

const DEP_LABELS: Record<SecurityDepositStatus, string> = {
  HELD: "Held",
  RELEASED: "Released",
  FORFEITED: "Forfeited",
  REFUNDED: "Refunded",
  DISPUTED: "Disputed",
};

const DEP_SYMBOLS: Record<SecurityDepositStatus, string> = {
  HELD: "⊡",
  RELEASED: "⊟",
  FORFEITED: "✕",
  REFUNDED: "↩",
  DISPUTED: "▲",
};

export function DepositStatusBadge({ status }: { status: SecurityDepositStatus }) {
  return (
    <BadgeShell
      testId="deposit-status-badge"
      status={status}
      symbol={DEP_SYMBOLS[status]}
      label={DEP_LABELS[status]}
      className={cn(
        status === "HELD" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "RELEASED" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "FORFEITED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        status === "REFUNDED" &&
          "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
        status === "DISPUTED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
      )}
    />
  );
}

const REFUND_LABELS: Record<RefundStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  REJECTED: "Rejected",
};

const REFUND_SYMBOLS: Record<RefundStatus, string> = {
  REQUESTED: "○",
  APPROVED: "◉",
  PROCESSING: "▶",
  COMPLETED: "✓",
  FAILED: "✕",
  REJECTED: "—",
};

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  return (
    <BadgeShell
      testId="refund-status-badge"
      status={status}
      symbol={REFUND_SYMBOLS[status]}
      label={REFUND_LABELS[status]}
      className={cn(
        status === "REQUESTED" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "APPROVED" &&
          "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
        status === "PROCESSING" &&
          "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
        status === "COMPLETED" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "FAILED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        status === "REJECTED" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
      )}
    />
  );
}

const CREDIT_LABELS: Record<CreditStatus, string> = {
  ACTIVE: "Active",
  PARTIALLY_USED: "Partial",
  USED: "Used",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

const CREDIT_SYMBOLS: Record<CreditStatus, string> = {
  ACTIVE: "✓",
  PARTIALLY_USED: "½",
  USED: "■",
  EXPIRED: "⏱",
  REVOKED: "⊘",
};

export function CreditStatusBadge({ status }: { status: CreditStatus }) {
  return (
    <BadgeShell
      testId="credit-status-badge"
      status={status}
      symbol={CREDIT_SYMBOLS[status]}
      label={CREDIT_LABELS[status]}
      className={cn(
        status === "ACTIVE" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "PARTIALLY_USED" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        (status === "USED" || status === "EXPIRED") &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
        status === "REVOKED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
      )}
    />
  );
}

const COUPON_LABELS: Record<CouponStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  EXPIRED: "Expired",
  DISABLED: "Disabled",
};

const COUPON_SYMBOLS: Record<CouponStatus, string> = {
  DRAFT: "○",
  ACTIVE: "✓",
  PAUSED: "⏸",
  EXPIRED: "⏱",
  DISABLED: "⊘",
};

export function CouponStatusBadge({ status }: { status: CouponStatus }) {
  return (
    <BadgeShell
      testId="coupon-status-badge"
      status={status}
      symbol={COUPON_SYMBOLS[status]}
      label={COUPON_LABELS[status]}
      className={cn(
        status === "ACTIVE" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "DRAFT" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
        status === "PAUSED" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "EXPIRED" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
        status === "DISABLED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
      )}
    />
  );
}

const REFERRAL_LABELS: Record<ReferralStatus, string> = {
  INVITED: "Invited",
  SIGNED_UP: "Signed up",
  QUALIFIED: "Qualified",
  REWARDED: "Rewarded",
  EXPIRED: "Expired",
  FRAUD_REVIEW: "Fraud review",
  REJECTED: "Rejected",
};

const REFERRAL_SYMBOLS: Record<ReferralStatus, string> = {
  INVITED: "○",
  SIGNED_UP: "◐",
  QUALIFIED: "◉",
  REWARDED: "✓",
  EXPIRED: "⏱",
  FRAUD_REVIEW: "▲",
  REJECTED: "—",
};

export function ReferralStatusBadge({ status }: { status: ReferralStatus }) {
  return (
    <BadgeShell
      testId="referral-status-badge"
      status={status}
      symbol={REFERRAL_SYMBOLS[status]}
      label={REFERRAL_LABELS[status]}
      className={cn(
        status === "QUALIFIED" &&
          "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
        status === "REWARDED" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "FRAUD_REVIEW" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        (status === "INVITED" || status === "SIGNED_UP") &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        (status === "EXPIRED" || status === "REJECTED") &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
      )}
    />
  );
}
