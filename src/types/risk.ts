import type { RideNetwork } from "./network";
import type { SafetySeverity } from "./safety";

export type RiskType =
  | "REPEATED_CANCELLATION"
  | "FAST_CANCEL_AFTER_BOOKING"
  | "COMPENSATION_PATTERN"
  | "SHARED_ACTOR_PATTERN"
  | "ABNORMAL_ASSURED_BEHAVIOR";

export type RiskCaseStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "ESCALATED"
  | "RESOLVED"
  | "FALSE_POSITIVE";

export interface RiskSignal {
  code: string;
  label: string;
  detail: string;
}

export interface RiskTimelineEntry {
  id: string;
  label: string;
  timestamp: string;
  actorId: string | null;
}

export interface RiskCase {
  id: string;
  rideId: string;
  assuredRideId: string | null;
  userId: string | null;
  driverId: string | null;
  networkType: RideNetwork;
  riskType: RiskType;
  severity: SafetySeverity;
  /** Deterministic mock score 0–100 from rules (not ML). */
  score: number;
  status: RiskCaseStatus;
  reason: string;
  signals: RiskSignal[];
  detectedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  resolution: string | null;
  metadata: Record<string, string>;
  timeline: RiskTimelineEntry[];
}

export interface RiskFilters {
  severity?: SafetySeverity | "ALL";
  riskType?: RiskType | "ALL";
  status?: RiskCaseStatus | "ALL";
  networkType?: RideNetwork | "ALL";
  search?: string;
}
