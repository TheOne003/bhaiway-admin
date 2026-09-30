export type CreditSource =
  | "ADMIN_ADJUSTMENT"
  | "PROMOTION"
  | "REFERRAL"
  | "COMPENSATION"
  | "CUSTOMER_RECOVERY";

export type CreditStatus =
  | "ACTIVE"
  | "PARTIALLY_USED"
  | "USED"
  | "EXPIRED"
  | "REVOKED";

export interface CreditRecord {
  id: string;
  userId: string;
  amountPaise: number;
  remainingPaise: number;
  reason: string;
  source: CreditSource;
  status: CreditStatus;
  expiresAt: string | null;
  relatedTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface CreditFilters {
  status?: CreditStatus | "ALL";
  source?: CreditSource | "ALL";
  userId?: string;
  search?: string;
}

export interface CreateCreditInput {
  userId: string;
  amountPaise: number;
  reason: string;
  source: CreditSource;
  expiresAt: string | null;
  adminId: string;
  adminName: string;
  idempotencyKey: string;
}
