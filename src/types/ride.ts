import type { RideNetwork } from "./network";

export type RideLifecycleStatus =
  | "scheduled"
  | "active"
  | "delayed"
  | "completed"
  | "cancelled"
  | "expired"
  | "disputed";

/** Map/live operational marker statuses (SOS reserved for Phase 5). */
export type LiveMarkerStatus = "ACTIVE" | "DELAYED" | "AT_RISK" | "SAFETY_CRITICAL";

export type SafetyStatus = "safe" | "at_risk" | "sos";

export type PaymentStatus = "pending" | "authorized" | "paid" | "failed" | "refunded";

export type OtpStatus = "not_required" | "pending" | "verified" | "failed";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RideLocation extends GeoPoint {
  timestamp: string;
  label?: string;
}

export interface RideRoute {
  origin: { name: string; point: GeoPoint };
  destination: { name: string; point: GeoPoint };
  /** Ordered path for mock GPS interpolation (origin → destination). */
  coordinates: GeoPoint[];
  distanceKm: number;
  estimatedDurationMin: number;
}

export interface RidePassenger {
  id: string;
  name: string;
  seat: number;
}

export interface RideDriverInfo {
  id: string;
  name: string;
  rating: number;
  status: "online" | "on_trip" | "offline";
}

export interface RideVehicleInfo {
  id: string;
  registration: string;
  make: string;
  model: string;
}

export interface RideTimelineEvent {
  id: string;
  label: string;
  timestamp: string;
}

export interface Ride {
  id: string;
  /** Canonical network field — never infer from route text. */
  networkType: RideNetwork;
  status: RideLifecycleStatus;
  driver: RideDriverInfo;
  vehicle: RideVehicleInfo;
  passengers: RidePassenger[];
  seats: number;
  booked: number;
  route: RideRoute;
  scheduledStart: string;
  actualStart: string | null;
  currentLocation: RideLocation | null;
  /** Progress along route coordinates 0..1 for deterministic GPS simulation. */
  routeProgress: number;
  etaMinutes: number | null;
  fare: number;
  securityAmount: number;
  currency: "INR";
  paymentStatus: PaymentStatus;
  otpStatus: OtpStatus;
  safetyStatus: SafetyStatus;
  city: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface RideSummary {
  id: string;
  network: RideNetwork;
  driverName: string;
  routeLabel: string;
  scheduledAt: string;
  seats: number;
  booked: number;
  fare: number;
  currency: "INR";
  status: RideLifecycleStatus;
  safety: SafetyStatus;
}

export interface RideFilters {
  networkType?: RideNetwork | "ALL";
  status?: RideLifecycleStatus | "ALL";
  safetyStatus?: SafetyStatus | "ALL" | "attention";
  search?: string;
  activeOnly?: boolean;
}

export function toRideSummary(ride: Ride): RideSummary {
  return {
    id: ride.id,
    network: ride.networkType,
    driverName: ride.driver.name,
    routeLabel: `${ride.route.origin.name} → ${ride.route.destination.name}`,
    scheduledAt: ride.scheduledStart,
    seats: ride.seats,
    booked: ride.booked,
    fare: ride.fare,
    currency: ride.currency,
    status: ride.status,
    safety: ride.safetyStatus,
  };
}

export function toLiveMarkerStatus(ride: Ride): LiveMarkerStatus {
  if (ride.safetyStatus === "sos") return "SAFETY_CRITICAL";
  if (ride.safetyStatus === "at_risk" || ride.status === "disputed") return "AT_RISK";
  if (ride.status === "delayed") return "DELAYED";
  return "ACTIVE";
}

export function isLiveOnMap(ride: Ride): boolean {
  return ride.status === "active" || ride.status === "delayed";
}
