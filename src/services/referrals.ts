import { MOCK_REFERRALS } from "@/mock/referrals";
import { auditService } from "@/services/audit";
import { transactionsService } from "@/services/transactions";
import { walletService } from "@/services/wallet";
import type { ReferralFilters, ReferralRecord } from "@/types/referral";

let referrals: ReferralRecord[] = structuredClone(MOCK_REFERRALS);
let forceError: string | null = null;

function assertOk() {
  if (forceError) throw new Error(forceError);
}

export function filterReferrals(
  list: ReferralRecord[],
  filters?: ReferralFilters,
): ReferralRecord[] {
  if (!filters) return list;
  return list.filter((r) => {
    if (filters.status && filters.status !== "ALL" && r.status !== filters.status) return false;
    if (
      filters.qualification &&
      filters.qualification !== "ALL" &&
      r.qualification !== filters.qualification
    )
      return false;
    if (filters.fraudReview && r.status !== "FRAUD_REVIEW") return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !`${r.id} ${r.code} ${r.referrerUserId} ${r.referredUserId ?? ""}`.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
}

export const referralsService = {
  async getReferrals(filters?: ReferralFilters): Promise<ReferralRecord[]> {
    assertOk();
    return structuredClone(filterReferrals(referrals, filters));
  },

  async getReferralById(id: string): Promise<ReferralRecord | null> {
    assertOk();
    const r = referrals.find((x) => x.id === id);
    return r ? structuredClone(r) : null;
  },

  /** Issue reward once — duplicate prevention via idempotency + status check. */
  async issueReward(
    id: string,
    input: { adminId: string; adminName: string; reason: string; idempotencyKey: string },
  ): Promise<ReferralRecord> {
    assertOk();
    const current = referrals.find((r) => r.id === id);
    if (!current) throw new Error("Referral not found.");
    if (current.status === "REWARDED" || current.rewardTransactionId) {
      return structuredClone(current);
    }
    if (current.status !== "QUALIFIED") {
      throw new Error("Referral must be QUALIFIED before reward.");
    }
    const wallet = await walletService.getWalletByUserId(current.referrerUserId);
    if (!wallet) throw new Error("Referrer wallet not found.");
    const now = new Date().toISOString();
    const txn = await transactionsService.createLedgerEntry({
      userId: current.referrerUserId,
      walletId: wallet.id,
      type: "REFERRAL_REWARD",
      direction: "CREDIT",
      amountPaise: current.rewardAmountPaise,
      currency: "INR",
      status: "COMPLETED",
      referenceType: "REFERRAL",
      referenceId: current.id,
      description: `Referral reward ${current.code}`,
      createdAt: now,
      completedAt: now,
      createdBy: input.adminId,
      idempotencyKey: input.idempotencyKey,
      reversesTransactionId: null,
      reversedByTransactionId: null,
      metadata: {},
    });
    const updated: ReferralRecord = {
      ...current,
      status: "REWARDED",
      rewardTransactionId: txn.id,
      rewardedAt: now,
      updatedAt: now,
    };
    referrals = referrals.map((r) => (r.id === id ? updated : r));
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "growth.referral_rewarded",
      targetType: "referral",
      targetId: id,
      oldValue: { status: current.status },
      newValue: { status: "REWARDED", rewardTransactionId: txn.id },
      reason: input.reason,
    });
    return structuredClone(updated);
  },

  async markFraudReview(
    id: string,
    input: { adminId: string; adminName: string; reason: string },
  ): Promise<ReferralRecord> {
    assertOk();
    const current = referrals.find((r) => r.id === id);
    if (!current) throw new Error("Referral not found.");
    const updated = {
      ...current,
      status: "FRAUD_REVIEW" as const,
      qualification: "MANUAL_REVIEW" as const,
      updatedAt: new Date().toISOString(),
    };
    referrals = referrals.map((r) => (r.id === id ? updated : r));
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "growth.referral_fraud_review",
      targetType: "referral",
      targetId: id,
      oldValue: { status: current.status },
      newValue: { status: "FRAUD_REVIEW" },
      reason: input.reason,
    });
    return structuredClone(updated);
  },

  __resetForTests() {
    referrals = structuredClone(MOCK_REFERRALS);
    forceError = null;
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
