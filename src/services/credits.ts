import { MOCK_CREDITS } from "@/mock/credits";
import { auditService } from "@/services/audit";
import { transactionsService } from "@/services/transactions";
import { walletService } from "@/services/wallet";
import type {
  CreateCreditInput,
  CreditFilters,
  CreditRecord,
  CreditStatus,
} from "@/types/credit";

let credits: CreditRecord[] = structuredClone(MOCK_CREDITS);
let forceError: string | null = null;

function assertOk() {
  if (forceError) throw new Error(forceError);
}

export function filterCredits(list: CreditRecord[], filters?: CreditFilters): CreditRecord[] {
  if (!filters) return list;
  return list.filter((c) => {
    if (filters.status && filters.status !== "ALL" && c.status !== filters.status) return false;
    if (filters.source && filters.source !== "ALL" && c.source !== filters.source) return false;
    if (filters.userId && c.userId !== filters.userId) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!`${c.id} ${c.userId} ${c.reason}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export const creditsService = {
  async getCredits(filters?: CreditFilters): Promise<CreditRecord[]> {
    assertOk();
    return structuredClone(filterCredits(credits, filters));
  },

  async getCreditById(id: string): Promise<CreditRecord | null> {
    assertOk();
    const c = credits.find((x) => x.id === id);
    return c ? structuredClone(c) : null;
  },

  async createCredit(input: CreateCreditInput): Promise<CreditRecord> {
    assertOk();
    if (input.amountPaise <= 0) throw new Error("Credit amount must be positive.");
    if (!input.reason.trim()) throw new Error("Reason is required.");
    const wallet = await walletService.getWalletByUserId(input.userId);
    if (!wallet) throw new Error("Wallet not found for user.");

    // Idempotent: if key already used, return existing credit linked to that txn
    const existingTxn = (await transactionsService.getTransactions()).find(
      (t) => t.idempotencyKey === input.idempotencyKey,
    );
    if (existingTxn?.referenceId) {
      const existing = credits.find((c) => c.id === existingTxn.referenceId);
      if (existing) return structuredClone(existing);
    }

    const now = new Date().toISOString();
    const creditId = `crd_${Date.now()}_${credits.length}`;
    const txn = await transactionsService.createLedgerEntry({
      userId: input.userId,
      walletId: wallet.id,
      type: "CREDIT",
      direction: "CREDIT",
      amountPaise: input.amountPaise,
      currency: "INR",
      status: "COMPLETED",
      referenceType: "CREDIT",
      referenceId: creditId,
      description: `Credit: ${input.reason}`,
      createdAt: now,
      completedAt: now,
      createdBy: input.adminId,
      idempotencyKey: input.idempotencyKey,
      reversesTransactionId: null,
      reversedByTransactionId: null,
      metadata: { source: input.source },
    });
    const record: CreditRecord = {
      id: creditId,
      userId: input.userId,
      amountPaise: input.amountPaise,
      remainingPaise: input.amountPaise,
      reason: input.reason,
      source: input.source,
      status: "ACTIVE",
      expiresAt: input.expiresAt,
      relatedTransactionId: txn.id,
      createdAt: now,
      updatedAt: now,
      createdBy: input.adminId,
    };
    credits = [record, ...credits];
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "money.credit_created",
      targetType: "credit",
      targetId: record.id,
      oldValue: null,
      newValue: { amountPaise: record.amountPaise, userId: record.userId },
      reason: input.reason,
    });
    return structuredClone(record);
  },

  async revokeCredit(
    id: string,
    input: { adminId: string; adminName: string; reason: string; idempotencyKey: string },
  ): Promise<CreditRecord> {
    assertOk();
    const current = credits.find((c) => c.id === id);
    if (!current) throw new Error("Credit not found.");
    if (current.status === "REVOKED" || current.status === "USED") {
      throw new Error(`Cannot revoke credit in status ${current.status}.`);
    }
    const wallet = await walletService.getWalletByUserId(current.userId);
    if (!wallet) throw new Error("Wallet not found.");
    const now = new Date().toISOString();
    if (current.remainingPaise > 0) {
      await transactionsService.createLedgerEntry({
        userId: current.userId,
        walletId: wallet.id,
        type: "CREDIT_REVERSAL",
        direction: "DEBIT",
        amountPaise: current.remainingPaise,
        currency: "INR",
        status: "COMPLETED",
        referenceType: "CREDIT",
        referenceId: current.id,
        description: `Credit revoke: ${input.reason}`,
        createdAt: now,
        completedAt: now,
        createdBy: input.adminId,
        idempotencyKey: input.idempotencyKey,
        reversesTransactionId: current.relatedTransactionId,
        reversedByTransactionId: null,
        metadata: {},
      });
    }
    const updated: CreditRecord = {
      ...current,
      remainingPaise: 0,
      status: "REVOKED",
      updatedAt: now,
    };
    credits = credits.map((c) => (c.id === id ? updated : c));
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "money.credit_revoked",
      targetType: "credit",
      targetId: id,
      oldValue: { status: current.status, remainingPaise: current.remainingPaise },
      newValue: { status: "REVOKED", remainingPaise: 0 },
      reason: input.reason,
    });
    return structuredClone(updated);
  },

  async markPartialUse(id: string, usedPaise: number): Promise<CreditRecord> {
    assertOk();
    const current = credits.find((c) => c.id === id);
    if (!current) throw new Error("Credit not found.");
    const remaining = Math.max(0, current.remainingPaise - usedPaise);
    let status: CreditStatus = remaining === 0 ? "USED" : "PARTIALLY_USED";
    if (remaining === current.amountPaise) status = "ACTIVE";
    const updated = {
      ...current,
      remainingPaise: remaining,
      status,
      updatedAt: new Date().toISOString(),
    };
    credits = credits.map((c) => (c.id === id ? updated : c));
    return structuredClone(updated);
  },

  __resetForTests() {
    credits = structuredClone(MOCK_CREDITS);
    forceError = null;
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
