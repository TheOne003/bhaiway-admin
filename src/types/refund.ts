export type RefundStatus =
  | "REQUESTED"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED";

export interface RefundRecord {
  id: string;
  userId: string;
  originalTransactionId: string;
  refundTransactionId: string | null;
  amountPaise: number;
  reason: string;
  status: RefundStatus;
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
  rideId: string | null;
}

export interface RefundFilters {
  status?: RefundStatus | "ALL";
  userId?: string;
  search?: string;
}
