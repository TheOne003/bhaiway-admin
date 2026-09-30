import { isOptionalVerification, isIdentityApprovedForOperations } from "@/mock/verification";
import {
  getMockVerificationProvider,
  getVerificationProvider,
  __resetVerificationProviderForTests,
} from "@/services/verificationProvider";
import { driversService } from "@/services/drivers";
import { usersService } from "@/services/users";
import type {
  VerificationFilters,
  VerificationRecord,
  VerificationStatus,
  VerificationType,
} from "@/types/verification";
import type { VerificationSummaryStatus } from "@/types/user";

let forceError = false;

export function __resetVerificationForTests(): void {
  __resetVerificationProviderForTests();
  forceError = false;
}

export function __setVerificationErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function filterVerifications(
  list: VerificationRecord[],
  filters: VerificationFilters = {},
): VerificationRecord[] {
  const type = filters.type ?? "ALL";
  const status = filters.status ?? "ALL";
  const search = filters.search?.trim().toLowerCase() ?? "";
  return list.filter((item) => {
    if (type !== "ALL" && item.type !== type) return false;
    if (status !== "ALL" && item.status !== status) return false;
    if (search) {
      const hay = [item.id, item.userId, item.maskedReference, item.provider]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export function mapVerificationStatusLabel(status: VerificationStatus): string {
  return status.replace(/_/g, " ");
}

export function toSummaryStatus(status: VerificationStatus | "NOT_REQUIRED"): VerificationSummaryStatus {
  if (status === "NOT_REQUIRED") return "NOT_REQUIRED";
  if (status === "APPROVED") return "APPROVED";
  if (status === "FAILED") return "FAILED";
  if (status === "MANUAL_REVIEW") return "MANUAL_REVIEW";
  return "PENDING";
}

async function syncUserAndDriver(userId: string): Promise<void> {
  const all = getMockVerificationProvider().__all().filter((r) => r.userId === userId);
  const gov = all.find((r) => r.type === "GOVERNMENT_ID");
  const corp = all.find((r) => r.type === "CORPORATE");
  await usersService.syncVerificationSummary(
    userId,
    gov ? toSummaryStatus(gov.status) : "NOT_STARTED",
    corp ? toSummaryStatus(corp.status) : "NOT_REQUIRED",
  );

  const licence = all.find((r) => r.type === "DRIVING_LICENCE");
  const rc = all.find((r) => r.type === "VEHICLE_RC");
  const insurance = all.find((r) => r.type === "INSURANCE");
  await driversService.syncVerificationFromRecords(userId, {
    governmentIdStatus: gov ? toSummaryStatus(gov.status) : "NOT_STARTED",
    licenceStatus: licence ? toSummaryStatus(licence.status) : "NOT_STARTED",
    corporateStatus: corp ? toSummaryStatus(corp.status) : "NOT_REQUIRED",
    rcStatus: rc ? toSummaryStatus(rc.status) : undefined,
    insuranceStatus: insurance ? toSummaryStatus(insurance.status) : undefined,
  });
}

export const verificationService = {
  async getVerifications(filters: VerificationFilters = {}): Promise<VerificationRecord[]> {
    if (forceError) throw new Error("Unable to load verifications.");
    const provider = getMockVerificationProvider();
    const all = provider.__all();
    return filterVerifications(all, filters).sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
  },

  async getVerificationById(id: string): Promise<VerificationRecord | null> {
    if (forceError) throw new Error("Unable to load verifications.");
    return getVerificationProvider().getVerification(id);
  },

  async getVerificationsForUser(userId: string): Promise<VerificationRecord[]> {
    const all = await this.getVerifications();
    return all.filter((r) => r.userId === userId);
  },

  async approve(id: string, reviewedBy = "adm_001"): Promise<VerificationRecord | null> {
    const result = await getVerificationProvider().approve(id, reviewedBy);
    if (result) await syncUserAndDriver(result.userId);
    return result;
  },

  async fail(
    id: string,
    reason: string,
    reviewedBy = "adm_001",
  ): Promise<VerificationRecord | null> {
    const result = await getVerificationProvider().fail(id, reviewedBy, reason);
    if (result) await syncUserAndDriver(result.userId);
    return result;
  },

  async sendToManualReview(
    id: string,
    reason: string,
    reviewedBy = "adm_001",
  ): Promise<VerificationRecord | null> {
    const result = await getVerificationProvider().sendToManualReview(id, reviewedBy, reason);
    if (result) await syncUserAndDriver(result.userId);
    return result;
  },

  async retry(id: string): Promise<VerificationRecord | null> {
    const result = await getVerificationProvider().retry(id);
    if (result) await syncUserAndDriver(result.userId);
    return result;
  },

  isOptional: isOptionalVerification,
  isIdentityApprovedForOperations,
};

export type { VerificationType };
