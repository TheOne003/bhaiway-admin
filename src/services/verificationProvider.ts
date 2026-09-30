import { MOCK_VERIFICATIONS, VERIFICATION_REQUIREMENTS } from "@/mock/verification";
import type {
  VerificationProvider,
  VerificationRecord,
  VerificationType,
} from "@/types/verification";

let records: VerificationRecord[] = structuredClone(MOCK_VERIFICATIONS);

export function __resetVerificationProviderForTests(): void {
  records = structuredClone(MOCK_VERIFICATIONS);
}

export class MockVerificationProvider implements VerificationProvider {
  readonly providerId = "mock_verification_bundle";
  readonly displayName = "Mock Verification Provider";

  async getVerification(id: string): Promise<VerificationRecord | null> {
    return structuredClone(records.find((r) => r.id === id) ?? null);
  }

  async listByType(type: VerificationType): Promise<VerificationRecord[]> {
    return structuredClone(records.filter((r) => r.type === type));
  }

  async submit(input: {
    userId: string;
    type: VerificationType;
    maskedReference: string;
  }): Promise<VerificationRecord> {
    const now = new Date().toISOString();
    const record: VerificationRecord = {
      id: `ver_${input.type.toLowerCase()}_${Date.now()}`,
      userId: input.userId,
      type: input.type,
      status: "PENDING",
      maskedReference: input.maskedReference,
      provider: providerForType(input.type),
      requirement: VERIFICATION_REQUIREMENTS[input.type],
      submittedAt: now,
      reviewedAt: null,
      reviewedBy: null,
      failureReason: null,
      metadata: { source: "mock_submit" },
      createdAt: now,
      updatedAt: now,
    };
    records = [record, ...records];
    return structuredClone(record);
  }

  async retry(id: string): Promise<VerificationRecord | null> {
    const record = records.find((r) => r.id === id);
    if (!record) return null;
    record.status = "PENDING";
    record.failureReason = null;
    record.reviewedAt = null;
    record.reviewedBy = null;
    record.updatedAt = new Date().toISOString();
    return structuredClone(record);
  }

  async approve(id: string, reviewedBy: string): Promise<VerificationRecord | null> {
    const record = records.find((r) => r.id === id);
    if (!record) return null;
    record.status = "APPROVED";
    record.reviewedBy = reviewedBy;
    record.reviewedAt = new Date().toISOString();
    record.failureReason = null;
    record.updatedAt = record.reviewedAt;
    return structuredClone(record);
  }

  async fail(
    id: string,
    reviewedBy: string,
    reason: string,
  ): Promise<VerificationRecord | null> {
    const record = records.find((r) => r.id === id);
    if (!record) return null;
    record.status = "FAILED";
    record.reviewedBy = reviewedBy;
    record.reviewedAt = new Date().toISOString();
    record.failureReason = reason;
    record.updatedAt = record.reviewedAt;
    return structuredClone(record);
  }

  async sendToManualReview(
    id: string,
    reviewedBy: string,
    reason: string,
  ): Promise<VerificationRecord | null> {
    const record = records.find((r) => r.id === id);
    if (!record) return null;
    record.status = "MANUAL_REVIEW";
    record.reviewedBy = reviewedBy;
    record.failureReason = reason;
    record.updatedAt = new Date().toISOString();
    record.metadata = { ...record.metadata, reviewNote: reason };
    return structuredClone(record);
  }

  /** Test helper — direct access for assertions. */
  __all(): VerificationRecord[] {
    return structuredClone(records);
  }
}

function providerForType(type: VerificationType): string {
  switch (type) {
    case "GOVERNMENT_ID":
      return "mock_aadhaar";
    case "DRIVING_LICENCE":
      return "mock_dl";
    case "VEHICLE_RC":
      return "mock_rc";
    case "INSURANCE":
      return "mock_insurance";
    case "CORPORATE":
      return "mock_corporate";
    default:
      return "mock_unknown";
  }
}

let singleton: MockVerificationProvider | null = null;

export function getVerificationProvider(): VerificationProvider {
  if (!singleton) singleton = new MockVerificationProvider();
  return singleton;
}

export function getMockVerificationProvider(): MockVerificationProvider {
  return getVerificationProvider() as MockVerificationProvider;
}
