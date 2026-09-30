/** Shared money primitives — amounts always in integer paise. */

export type CurrencyCode = "INR";

export type MoneyDirection = "CREDIT" | "DEBIT" | "HOLD" | "RELEASE";

export type LedgerReferenceType =
  | "RIDE"
  | "ASSURED_RIDE"
  | "SECURITY_DEPOSIT"
  | "REFUND"
  | "CREDIT"
  | "COUPON"
  | "REFERRAL"
  | "COMPENSATION"
  | "ADJUSTMENT"
  | "CANCELLATION"
  | "NONE";
