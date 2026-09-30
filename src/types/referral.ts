export type ReferralStatus =
  | "INVITED"
  | "SIGNED_UP"
  | "QUALIFIED"
  | "REWARDED"
  | "EXPIRED"
  | "FRAUD_REVIEW"
  | "REJECTED";

export type ReferralQualification =
  | "PENDING"
  | "FIRST_RIDE_COMPLETED"
  | "NOT_QUALIFIED"
  | "MANUAL_REVIEW";

export interface ReferralRecord {
  id: string;
  referrerUserId: string;
  referredUserId: string | null;
  code: string;
  status: ReferralStatus;
  qualification: ReferralQualification;
  rewardAmountPaise: number;
  rewardTransactionId: string | null;
  riskCaseId: string | null;
  createdAt: string;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  updatedAt: string;
}

export interface ReferralFilters {
  status?: ReferralStatus | "ALL";
  qualification?: ReferralQualification | "ALL";
  fraudReview?: boolean;
  search?: string;
}
