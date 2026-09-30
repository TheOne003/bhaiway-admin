import { cn } from "@/lib/utils";
import { mapUserTypeLabel } from "@/services/users";
import { mapStatusLabel } from "@/mock/users";
import { mapVerificationSummaryLabel } from "@/mock/users";
import type { AccountStatus, UserType, VerificationSummaryStatus } from "@/types/user";
import type { VerificationStatus } from "@/types/verification";

export function UserTypeBadge({ type }: { type: UserType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-secondary)]",
      )}
      data-testid="user-type-badge"
      data-type={type}
    >
      <span aria-hidden>{type === "BOTH" ? "◇" : type === "DRIVER" ? "▣" : "○"}</span>
      {mapUserTypeLabel(type)}
    </span>
  );
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        status === "ACTIVE" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "INACTIVE" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
        status === "SUSPENDED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        status === "RESTRICTED" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
      )}
      data-testid="account-status-badge"
      data-status={status}
    >
      <span aria-hidden>
        {status === "ACTIVE" ? "●" : status === "SUSPENDED" ? "■" : status === "RESTRICTED" ? "▲" : "○"}
      </span>
      {mapStatusLabel(status)}
    </span>
  );
}

type VerificationBadgeStatus = VerificationSummaryStatus | VerificationStatus;

export function VerificationBadge({
  status,
  label,
}: {
  status: VerificationBadgeStatus;
  label?: string;
}) {
  const text = label ?? mapVerificationSummaryLabel(status as VerificationSummaryStatus);
  const symbol =
    status === "APPROVED"
      ? "✓"
      : status === "FAILED"
        ? "✕"
        : status === "MANUAL_REVIEW"
          ? "…"
          : status === "NOT_REQUIRED"
            ? "—"
            : status === "NOT_STARTED"
              ? "·"
              : "○";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        status === "APPROVED" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        (status === "PENDING" || status === "NOT_STARTED") &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "MANUAL_REVIEW" &&
          "border-[var(--bw-info)] bg-[var(--bw-info-soft)] text-[var(--bw-info)]",
        status === "FAILED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        status === "NOT_REQUIRED" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
      )}
      data-testid="verification-badge"
      data-status={status}
    >
      <span aria-hidden>{symbol}</span>
      {text}
    </span>
  );
}
