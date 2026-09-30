export type VerificationType =
  | "GOVERNMENT_ID"
  | "DRIVING_LICENCE"
  | "VEHICLE_RC"
  | "INSURANCE"
  | "CORPORATE";

export type VerificationStatus =
  | "PENDING"
  | "MANUAL_REVIEW"
  | "APPROVED"
  | "FAILED";

export type VerificationRequirement = "required" | "optional";

export interface VerificationRecord {
  id: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  maskedReference: string;
  provider: string;
  requirement: VerificationRequirement;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  failureReason: string | null;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationFilters {
  type?: VerificationType | "ALL";
  status?: VerificationStatus | "ALL";
  search?: string;
}

export interface VerificationProvider {
  readonly providerId: string;
  readonly displayName: string;
  getVerification(id: string): Promise<VerificationRecord | null>;
  listByType(type: VerificationType): Promise<VerificationRecord[]>;
  submit(input: {
    userId: string;
    type: VerificationType;
    maskedReference: string;
  }): Promise<VerificationRecord>;
  retry(id: string): Promise<VerificationRecord | null>;
  approve(id: string, reviewedBy: string): Promise<VerificationRecord | null>;
  fail(
    id: string,
    reviewedBy: string,
    reason: string,
  ): Promise<VerificationRecord | null>;
  sendToManualReview(
    id: string,
    reviewedBy: string,
    reason: string,
  ): Promise<VerificationRecord | null>;
}
