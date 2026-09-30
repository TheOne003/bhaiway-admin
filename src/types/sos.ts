import type { SafetySeverity } from "./safety";
import type { RideNetwork } from "./network";

export type SOSStatus =
  | "TRIGGERED"
  | "ACKNOWLEDGED"
  | "RESPONDING"
  | "RESOLVED"
  | "FALSE_ALARM";

export type SOSCategory =
  | "EMERGENCY"
  | "MEDICAL"
  | "HARASSMENT"
  | "ACCIDENT"
  | "OTHER";

export interface SOSTimelineEntry {
  id: string;
  label: string;
  timestamp: string;
  actorId: string | null;
}

export interface SOSRecord {
  id: string;
  rideId: string;
  triggeredByUserId: string;
  driverId: string;
  networkType: RideNetwork;
  status: SOSStatus;
  severity: SafetySeverity;
  latitude: number;
  longitude: number;
  locationLabel: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  responseStartedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  category: SOSCategory;
  notes: string[];
  timeline: SOSTimelineEntry[];
  relatedAlertId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SOSFilters {
  status?: SOSStatus | "ALL" | "ACTIVE";
  severity?: SafetySeverity | "ALL";
  networkType?: RideNetwork | "ALL";
  search?: string;
}
