import { MOCK_REFUNDS } from "@/mock/refunds";
import { auditService } from "@/services/audit";
import { transactionsService } from "@/services/transactions";
import { walletService } from "@/services/wallet";
import type { RefundFilters, RefundRecord, RefundStatus } from "@/types/refund";

let refunds: RefundRecord[] = structuredClone(MOCK_REFUNDS);
let forceError: string | null = null;

function assertOk() {
  if (forceError) throw new Error(forceError);
}

const TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PROCESSING", "REJECTED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: ["PROCESSING"],
  REJECTED: [],
};

export function filterRefunds(list: RefundRecord[], filters?: RefundFilters): RefundRecord[] {
  if (!filters) return list;
  return list.filter((r) => {
    if (filters.status && filters.status !== "ALL" && r.status !== filters.status) return false;
    if (filters.userId && r.userId !== filters.userId) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!`${r.id} ${r.userId} ${r.originalTransactionId}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export const refundsService = {
  async getRefunds(filters?: RefundFilters): Promise<RefundRecord[]> {
    assertOk();
    return structuredClone(filterRefunds(refunds, filters));
  },

  async getRefundById(id: string): Promise<RefundRecord | null> {
    assertOk();
    const r = refunds.find((x) => x.id === id);
    return r ? structuredClone(r) : null;
  },

  async transitionRefund(
    id: string,
    next: RefundStatus,
    input: { adminId: string; adminName: string; reason: string; idempotencyKey?: string },
  ): Promise<RefundRecord> {
    assertOk();
    const current = refunds.find((r) => r.id === id);
    if (!current) throw new Error("Refund not found.");
    const allowed = TRANSITIONS[current.status];
    if (!allowed.includes(next)) {
      throw new Error(`Cannot transition refund from ${current.status} to ${next}.`);
    }
    const now = new Date().toISOString();
    let refundTransactionId = current.refundTransactionId;

    if (next === "COMPLETED") {
      const wallet = await walletService.getWalletByUserId(current.userId);
      if (!wallet) throw new Error("Wallet not found.");
      const txn = await transactionsService.createLedgerEntry({
        userId: current.userId,
        walletId: wallet.id,
        type: "REFUND",
        direction: "CREDIT",
        amountPaise: current.amountPaise,
        currency: "INR",
        status: "COMPLETED",
        referenceType: "REFUND",
        referenceId: current.id,
        description: `Refund ${current.id}: ${input.reason}`,
        createdAt: now,
        completedAt: now,
        createdBy: input.adminId,
        idempotencyKey: input.idempotencyKey ?? `refund_complete_${current.id}`,
        reversesTransactionId: null,
        reversedByTransactionId: null,
        metadata: { originalTransactionId: current.originalTransactionId },
      });
      refundTransactionId = txn.id;
    }

    const updated: RefundRecord = {
      ...current,
      status: next,
      refundTransactionId,
      processedAt: ["COMPLETED", "FAILED", "REJECTED"].includes(next) ? now : current.processedAt,
      processedBy: input.adminId,
      updatedAt: now,
    };
    refunds = refunds.map((r) => (r.id === id ? updated : r));
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: `money.refund_${next.toLowerCase()}`,
      targetType: "refund",
      targetId: id,
      oldValue: { status: current.status },
      newValue: { status: next, refundTransactionId },
      reason: input.reason,
    });
    return structuredClone(updated);
  },

  __resetForTests() {
    refunds = structuredClone(MOCK_REFUNDS);
    forceError = null;
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
