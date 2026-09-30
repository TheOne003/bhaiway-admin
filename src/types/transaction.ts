import type { CurrencyCode, LedgerReferenceType, MoneyDirection } from "./money";

export type TransactionType =
  | "RIDE_FARE"
  | "SECURITY_DEPOSIT"
  | "SECURITY_RELEASE"
  | "SECURITY_FORFEITURE"
  | "COMPENSATION"
  | "REFUND"
  | "CREDIT"
  | "CREDIT_REVERSAL"
  | "COUPON_DISCOUNT"
  | "REFERRAL_REWARD"
  | "ADJUSTMENT";

export type TransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REVERSED"
  | "CANCELLED";

export interface LedgerTransaction {
  id: string;
  userId: string;
  walletId: string;
  type: TransactionType;
  direction: MoneyDirection;
  amountPaise: number;
  currency: CurrencyCode;
  status: TransactionStatus;
  referenceType: LedgerReferenceType;
  referenceId: string | null;
  description: string;
  createdAt: string;
  completedAt: string | null;
  createdBy: string | null;
  idempotencyKey: string | null;
  /** If this reverses another txn */
  reversesTransactionId: string | null;
  /** If this was reversed */
  reversedByTransactionId: string | null;
  metadata: Record<string, string | number | boolean | null>;
}

export interface TransactionFilters {
  type?: TransactionType | "ALL";
  direction?: MoneyDirection | "ALL";
  status?: TransactionStatus | "ALL";
  userId?: string;
  referenceType?: LedgerReferenceType | "ALL";
  referenceId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface CreateAdjustmentInput {
  userId: string;
  amountPaise: number;
  direction: "CREDIT" | "DEBIT";
  reason: string;
  adminId: string;
  adminName: string;
  referenceType?: LedgerReferenceType;
  referenceId?: string | null;
  idempotencyKey: string;
}

export interface CreateReversalInput {
  originalTransactionId: string;
  reason: string;
  adminId: string;
  adminName: string;
  idempotencyKey: string;
}
