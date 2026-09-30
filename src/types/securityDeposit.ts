export type SecurityDepositStatus =
  | "HELD"
  | "RELEASED"
  | "FORFEITED"
  | "REFUNDED"
  | "DISPUTED";

export interface SecurityDeposit {
  id: string;
  rideId: string;
  userId: string;
  amountPaise: number;
  status: SecurityDepositStatus;
  heldAt: string;
  releasedAt: string | null;
  forfeitedAt: string | null;
  refundedAt: string | null;
  reason: string | null;
  relatedTransactionId: string | null;
  relatedCancellationId: string | null;
  relatedAssuredRideId: string | null;
  networkType: "OFFICE" | "OUTSTATION";
  createdAt: string;
  updatedAt: string;
  timeline: { id: string; label: string; timestamp: string }[];
}

export interface SecurityDepositFilters {
  status?: SecurityDepositStatus | "ALL";
  networkType?: "OFFICE" | "OUTSTATION" | "ALL";
  userId?: string;
  rideId?: string;
  search?: string;
}
