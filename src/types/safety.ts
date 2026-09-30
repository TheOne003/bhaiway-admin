export type SafetySeverity = "INFO" | "WARNING" | "CRITICAL";

export type SafetyEventType =
  | "SOS"
  | "ROUTE_DEVIATION"
  | "INCIDENT"
  | "SAFETY_ALERT";

export interface SafetyEvent {
  id: string;
  type: SafetyEventType;
  severity: SafetySeverity;
  rideId: string;
  userId: string | null;
  driverId: string | null;
  sosId: string | null;
  incidentId: string | null;
  status: string;
  latitude: number;
  longitude: number;
  locationLabel: string;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  description: string;
  metadata: Record<string, string>;
}

export interface SafetySummary {
  activeRides: number;
  activeSos: number;
  criticalIncidents: number;
  openIncidents: number;
  routeDeviations: number;
  safetyEventsToday: number;
}
