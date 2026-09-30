export type UserType = "RIDER" | "DRIVER" | "BOTH";

export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "RESTRICTED";

export type Gender = "male" | "female" | "other" | "unspecified";

/** High-level verification summary for list views. */
export type VerificationSummaryStatus =
  | "APPROVED"
  | "PENDING"
  | "FAILED"
  | "MANUAL_REVIEW"
  | "NOT_REQUIRED"
  | "NOT_STARTED";

export interface User {
  id: string;
  name: string;
  email: string;
  phoneMasked: string;
  userType: UserType;
  gender: Gender;
  status: AccountStatus;
  governmentVerificationStatus: VerificationSummaryStatus;
  corporateVerificationStatus: VerificationSummaryStatus;
  joinedAt: string;
  lastActiveAt: string;
  rating: number;
  totalRides: number;
  createdAt: string;
  updatedAt: string;
  /** Optional restriction flags for audit-ready actions. */
  bookingRestricted?: boolean;
  publishingRestricted?: boolean;
}

export interface UserFilters {
  userType?: UserType | "ALL";
  status?: AccountStatus | "ALL";
  governmentVerification?: VerificationSummaryStatus | "ALL";
  corporateVerification?: VerificationSummaryStatus | "ALL";
  gender?: Gender | "ALL";
  search?: string;
  joinedFrom?: string;
  joinedTo?: string;
}

/** @deprecated Prefer User — kept for Phase 1 compatibility aliases */
export type UserStatus = "active" | "inactive" | "suspended";
export type VerificationState =
  | "verified"
  | "pending"
  | "failed"
  | "manual_review"
  | "not_required"
  | "not_started";

export interface UserSummary {
  id: string;
  name: string;
  phone: string;
  email?: string;
  type: "rider" | "driver" | "both";
  gender: Gender;
  verification: VerificationState;
  corporateStatus: VerificationState;
  rideCount: number;
  joinedAt: string;
  status: UserStatus;
}
