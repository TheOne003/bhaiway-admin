import { cn } from "@/lib/utils";
import type { AssuredRideStatus } from "@/types/assuredRide";
import type { IncidentStatus } from "@/types/incident";
import type { RiskCaseStatus } from "@/types/risk";
import type { SafetySeverity } from "@/types/safety";
import type { SOSStatus } from "@/types/sos";

const SOS_LABELS: Record<SOSStatus, string> = {
  TRIGGERED: "Triggered",
  ACKNOWLEDGED: "Acknowledged",
  RESPONDING: "Responding",
  RESOLVED: "Resolved",
  FALSE_ALARM: "False alarm",
};

const SOS_SYMBOLS: Record<SOSStatus, string> = {
  TRIGGERED: "✦",
  ACKNOWLEDGED: "◉",
  RESPONDING: "▶",
  RESOLVED: "✓",
  FALSE_ALARM: "—",
};

export function SosStatusBadge({ status }: { status: SOSStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        status === "TRIGGERED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        status === "ACKNOWLEDGED" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "RESPONDING" &&
          "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
        status === "RESOLVED" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "FALSE_ALARM" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
      )}
      data-testid="sos-status-badge"
      data-status={status}
    >
      <span aria-hidden>{SOS_SYMBOLS[status]}</span>
      {SOS_LABELS[status]}
    </span>
  );
}

const INCIDENT_LABELS: Record<IncidentStatus, string> = {
  OPEN: "Open",
  INVESTIGATING: "Investigating",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const INCIDENT_SYMBOLS: Record<IncidentStatus, string> = {
  OPEN: "○",
  INVESTIGATING: "…",
  ESCALATED: "▲",
  RESOLVED: "✓",
  CLOSED: "■",
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        (status === "OPEN" || status === "INVESTIGATING") &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "ESCALATED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        status === "RESOLVED" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "CLOSED" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
      )}
      data-testid="incident-status-badge"
      data-status={status}
    >
      <span aria-hidden>{INCIDENT_SYMBOLS[status]}</span>
      {INCIDENT_LABELS[status]}
    </span>
  );
}

const SEVERITY_LABELS: Record<SafetySeverity, string> = {
  INFO: "Info",
  WARNING: "Warning",
  CRITICAL: "Critical",
};

const SEVERITY_SYMBOLS: Record<SafetySeverity, string> = {
  INFO: "i",
  WARNING: "!",
  CRITICAL: "◆",
};

export function SeverityBadge({ severity }: { severity: SafetySeverity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        severity === "INFO" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-secondary)]",
        severity === "WARNING" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        severity === "CRITICAL" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
      )}
      data-testid="severity-badge"
      data-severity={severity}
    >
      <span aria-hidden>{SEVERITY_SYMBOLS[severity]}</span>
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

const ASSURED_LABELS: Record<AssuredRideStatus, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  COMPENSATION_PENDING: "Comp pending",
  COMPENSATED: "Compensated",
  DISPUTED: "Disputed",
  RISK_REVIEW: "Risk review",
};

const ASSURED_SYMBOLS: Record<AssuredRideStatus, string> = {
  ACTIVE: "●",
  COMPLETED: "✓",
  CANCELLED: "✕",
  COMPENSATION_PENDING: "…",
  COMPENSATED: "₹",
  DISPUTED: "!",
  RISK_REVIEW: "▲",
};

export function AssuredStatusBadge({ status }: { status: AssuredRideStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        status === "ACTIVE" &&
          "border-[var(--bw-success)] bg-[var(--bw-success-soft)] text-[var(--bw-success)]",
        status === "COMPLETED" &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-secondary)]",
        status === "CANCELLED" &&
          "border-[var(--bw-text-muted)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
        status === "COMPENSATION_PENDING" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "COMPENSATED" &&
          "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]",
        status === "DISPUTED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        status === "RISK_REVIEW" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
      )}
      data-testid="assured-status-badge"
      data-status={status}
    >
      <span aria-hidden>{ASSURED_SYMBOLS[status]}</span>
      {ASSURED_LABELS[status]}
    </span>
  );
}

export function RiskStatusBadge({ status }: { status: RiskCaseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-secondary)]",
        status === "ESCALATED" &&
          "border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]",
        status === "OPEN" &&
          "border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]",
        status === "UNDER_REVIEW" &&
          "border-[var(--bw-info)] bg-[var(--bw-info-soft)] text-[var(--bw-info)]",
        (status === "RESOLVED" || status === "FALSE_POSITIVE") &&
          "border-[var(--bw-border)] bg-[var(--bw-elevated)] text-[var(--bw-text-muted)]",
      )}
      data-testid="risk-status-badge"
      data-status={status}
    >
      <span aria-hidden>△</span>
      {status.replace(/_/g, " ")}
    </span>
  );
}
