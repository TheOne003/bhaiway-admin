import { cn } from "@/lib/utils";
import type {
  AutomationStatus,
  CampaignStatus,
  TemplateStatus,
} from "@/types/communication";
import type {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationPriority,
} from "@/types/notifications";
import type { SupportPriority, SupportStatus } from "@/types/support";

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

const NOTIF_STATUS: Record<
  NotificationDeliveryStatus,
  { symbol: string; label: string; className: string }
> = {
  QUEUED: {
    symbol: "◷",
    label: "Queued",
    className:
      "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
  },
  SENT: {
    symbol: "↗",
    label: "Sent",
    className: "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
  },
  DELIVERED: {
    symbol: "✓",
    label: "Delivered",
    className:
      "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
  },
  FAILED: {
    symbol: "✕",
    label: "Failed",
    className: "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
  },
  READ: {
    symbol: "◉",
    label: "Read",
    className: "border-[var(--bw-border)] bg-[var(--bw-surface)] text-[var(--bw-text-secondary)]",
  },
  CANCELLED: {
    symbol: "⊘",
    label: "Cancelled",
    className: "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
  },
};

export function NotificationStatusBadge({ status }: { status: NotificationDeliveryStatus }) {
  const cfg = NOTIF_STATUS[status];
  return (
    <BadgeShell
      testId="notification-status-badge"
      status={status}
      symbol={cfg.symbol}
      label={cfg.label}
      className={cfg.className}
    />
  );
}

const PRIORITY_CFG: Record<
  NotificationPriority,
  { symbol: string; label: string; className: string }
> = {
  LOW: {
    symbol: "↓",
    label: "Low",
    className: "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
  },
  NORMAL: {
    symbol: "−",
    label: "Normal",
    className: "border-[var(--bw-border)] bg-[var(--bw-surface)] text-[var(--bw-text-secondary)]",
  },
  HIGH: {
    symbol: "↑",
    label: "High",
    className:
      "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
  },
  CRITICAL: {
    symbol: "!!",
    label: "Critical",
    className: "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
  },
};

export function NotificationPriorityBadge({ priority }: { priority: NotificationPriority }) {
  const cfg = PRIORITY_CFG[priority];
  return (
    <BadgeShell
      testId="notification-priority-badge"
      status={priority}
      symbol={cfg.symbol}
      label={cfg.label}
      className={cfg.className}
    />
  );
}

const CHANNEL_CFG: Record<
  NotificationChannel,
  { symbol: string; label: string }
> = {
  IN_APP: { symbol: "◎", label: "In-app" },
  PUSH: { symbol: "▣", label: "Push" },
  SMS: { symbol: "✉", label: "SMS" },
  EMAIL: { symbol: "@", label: "Email" },
  WHATSAPP: { symbol: "W", label: "WhatsApp" },
};

export function NotificationChannelBadge({ channel }: { channel: NotificationChannel }) {
  const cfg = CHANNEL_CFG[channel];
  return (
    <BadgeShell
      testId="notification-channel-badge"
      status={channel}
      symbol={cfg.symbol}
      label={cfg.label}
      className="border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-secondary)]"
    />
  );
}

const TEMPLATE_CFG: Record<TemplateStatus, { symbol: string; label: string; className: string }> = {
  DRAFT: {
    symbol: "◇",
    label: "Draft",
    className: "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
  },
  ACTIVE: {
    symbol: "✓",
    label: "Active",
    className:
      "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
  },
  ARCHIVED: {
    symbol: "▤",
    label: "Archived",
    className: "border-[var(--bw-border)] bg-[var(--bw-surface)] text-[var(--bw-text-secondary)]",
  },
};

export function TemplateStatusBadge({ status }: { status: TemplateStatus }) {
  const cfg = TEMPLATE_CFG[status];
  return (
    <BadgeShell
      testId="template-status-badge"
      status={status}
      symbol={cfg.symbol}
      label={cfg.label}
      className={cfg.className}
    />
  );
}

const AUTO_CFG: Record<AutomationStatus, { symbol: string; label: string; className: string }> = {
  DRAFT: {
    symbol: "◇",
    label: "Draft",
    className: "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
  },
  ACTIVE: {
    symbol: "▶",
    label: "Active",
    className:
      "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
  },
  PAUSED: {
    symbol: "⏸",
    label: "Paused",
    className:
      "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
  },
  ARCHIVED: {
    symbol: "▤",
    label: "Archived",
    className: "border-[var(--bw-border)] bg-[var(--bw-surface)] text-[var(--bw-text-secondary)]",
  },
};

export function AutomationStatusBadge({ status }: { status: AutomationStatus }) {
  const cfg = AUTO_CFG[status];
  return (
    <BadgeShell
      testId="automation-status-badge"
      status={status}
      symbol={cfg.symbol}
      label={cfg.label}
      className={cfg.className}
    />
  );
}

const CAMP_CFG: Record<CampaignStatus, { symbol: string; label: string; className: string }> = {
  DRAFT: {
    symbol: "◇",
    label: "Draft",
    className: "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
  },
  SCHEDULED: {
    symbol: "◷",
    label: "Scheduled",
    className: "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
  },
  RUNNING: {
    symbol: "▶",
    label: "Running",
    className:
      "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
  },
  PAUSED: {
    symbol: "⏸",
    label: "Paused",
    className:
      "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
  },
  COMPLETED: {
    symbol: "✓",
    label: "Completed",
    className: "border-[var(--bw-border)] bg-[var(--bw-surface)] text-[var(--bw-text-secondary)]",
  },
  CANCELLED: {
    symbol: "⊘",
    label: "Cancelled",
    className: "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
  },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const cfg = CAMP_CFG[status];
  return (
    <BadgeShell
      testId="campaign-status-badge"
      status={status}
      symbol={cfg.symbol}
      label={cfg.label}
      className={cfg.className}
    />
  );
}

const SUPPORT_STATUS: Record<
  SupportStatus,
  { symbol: string; label: string; className: string }
> = {
  OPEN: {
    symbol: "○",
    label: "Open",
    className: "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
  },
  IN_PROGRESS: {
    symbol: "◐",
    label: "In progress",
    className: "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
  },
  WAITING_FOR_CUSTOMER: {
    symbol: "⏳",
    label: "Waiting",
    className:
      "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
  },
  ESCALATED: {
    symbol: "↑",
    label: "Escalated",
    className: "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
  },
  RESOLVED: {
    symbol: "✓",
    label: "Resolved",
    className:
      "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
  },
  CLOSED: {
    symbol: "■",
    label: "Closed",
    className: "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
  },
};

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  const cfg = SUPPORT_STATUS[status];
  return (
    <BadgeShell
      testId="support-status-badge"
      status={status}
      symbol={cfg.symbol}
      label={cfg.label}
      className={cfg.className}
    />
  );
}

const SUPPORT_PRIORITY: Record<
  SupportPriority,
  { symbol: string; label: string; className: string }
> = {
  LOW: {
    symbol: "↓",
    label: "Low",
    className: "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
  },
  NORMAL: {
    symbol: "−",
    label: "Normal",
    className: "border-[var(--bw-border)] bg-[var(--bw-surface)] text-[var(--bw-text-secondary)]",
  },
  HIGH: {
    symbol: "↑",
    label: "High",
    className:
      "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
  },
  URGENT: {
    symbol: "!!",
    label: "Urgent",
    className: "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
  },
};

export function SupportPriorityBadge({ priority }: { priority: SupportPriority }) {
  const cfg = SUPPORT_PRIORITY[priority];
  return (
    <BadgeShell
      testId="support-priority-badge"
      status={priority}
      symbol={cfg.symbol}
      label={cfg.label}
      className={cfg.className}
    />
  );
}
