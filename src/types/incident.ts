import type { SafetySeverity } from "./safety";
import type { RideNetwork } from "./network";

export type IncidentStatus =
  | "OPEN"
  | "INVESTIGATING"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export type IncidentType =
  | "SOS"
  | "ACCIDENT"
  | "SAFETY_COMPLAINT"
  | "ROUTE_DEVIATION"
  | "HARASSMENT"
  | "DRIVER_BEHAVIOR"
  | "RIDER_BEHAVIOR"
  | "OTHER";

export interface IncidentTimelineEntry {
  id: string;
  label: string;
  timestamp: string;
  actorId: string | null;
}

export interface IncidentRecord {
  id: string;
  type: IncidentType;
  severity: SafetySeverity;
  status: IncidentStatus;
  rideId: string | null;
  userId: string | null;
  driverId: string | null;
  sosId: string | null;
  networkType: RideNetwork | null;
  title: string;
  description: string;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
  acknowledgedBy: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  internalNotes: string[];
  timeline: IncidentTimelineEntry[];
}

export interface IncidentFilters {
  status?: IncidentStatus | "ALL" | "OPENISH";
  severity?: SafetySeverity | "ALL";
  type?: IncidentType | "ALL";
  networkType?: RideNetwork | "ALL";
  assignedTo?: string | "ALL" | "UNASSIGNED";
  search?: string;
  createdFrom?: string;
  createdTo?: string;
}
