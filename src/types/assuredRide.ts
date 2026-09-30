import type { RideNetwork } from "./network";

export type AssuredRideStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "COMPENSATION_PENDING"
  | "COMPENSATED"
  | "DISPUTED"
  | "RISK_REVIEW";

export type CancellingParty = "DRIVER" | "RIDER" | "NONE";

export type SecurityStatus =
  | "HELD"
  | "REFUNDED"
  | "FORFEITED"
  | "PARTIAL_FORFEIT";

export interface AssuredPassenger {
  userId: string;
  name: string;
  /** Security in paise (integer). */
  securityPaise: number;
  cancelled: boolean;
  cancelledAt: string | null;
  eligibleForCompensation: boolean;
  compensationPaise: number;
}

export interface AssuredTimelineEntry {
  id: string;
  label: string;
  timestamp: string;
}

export interface AssuredRideCase {
  id: string;
  rideId: string;
  networkType: RideNetwork;
  driverId: string;
  driverName: string;
  /** Fare in paise. */
  farePaise: number;
  /** Aggregate security held in paise (sum of passenger securities). */
  securityPaise: number;
  status: AssuredRideStatus;
  securityStatus: SecurityStatus;
  cancellingParty: CancellingParty;
  cancelledByUserId: string | null;
  cancelledAt: string | null;
  forfeitedPaise: number;
  compensationPoolPaise: number;
  passengers: AssuredPassenger[];
  riskCaseId: string | null;
  routeLabel: string;
  createdAt: string;
  updatedAt: string;
  timeline: AssuredTimelineEntry[];
}

export interface AssuredRideFilters {
  status?: AssuredRideStatus | "ALL";
  networkType?: RideNetwork | "ALL";
  search?: string;
  hasCancellation?: boolean;
  hasRisk?: boolean;
}

export interface CompensationCase {
  id: string;
  assuredRideId: string;
  rideId: string;
  forfeitedPaise: number;
  compensationPoolPaise: number;
  eligibleCount: number;
  perPassengerPaise: number;
  allocations: { userId: string; name: string; amountPaise: number }[];
  status: "PENDING" | "REVIEWED" | "PAID_MOCK" | "DISPUTED";
  calculatedAt: string;
  resolvedAt: string | null;
}

export interface CancellationCase {
  id: string;
  assuredRideId: string;
  rideId: string;
  networkType: RideNetwork;
  cancellingParty: Exclude<CancellingParty, "NONE">;
  cancellingUserId: string | null;
  cancellingName: string;
  cancelledAt: string;
  securityPaise: number;
  forfeitedPaise: number;
  compensationPoolPaise: number;
  riskStatus: "NONE" | "FLAGGED" | "REVIEWING" | "CLEARED";
  caseStatus: AssuredRideStatus;
}
