/**
 * Ledger-first money service.
 *
 * Architecture:
 *   Business Action → Ledger Entry → Derived Wallet Balance
 * Never mutate wallet balances directly (no setBalance).
 *
 * Idempotency:
 * - Mutations that accept `idempotencyKey` must reuse the prior ledger row
 *   when the same key is presented.
 * - Production DB MUST enforce UNIQUE(idempotency_key) WHERE NOT NULL
 *   inside a serializable/transactional write path.
 */
import { MOCK_LEDGER_SEED, buildWalletsFromLedger } from "@/mock/money";
import { auditService } from "@/services/audit";
import {
  calculateWalletBalancesFromLedger,
  oppositeDirection,
} from "@/services/ledgerMath";
import type {
  CreateAdjustmentInput,
  CreateReversalInput,
  LedgerTransaction,
  TransactionFilters,
} from "@/types/transaction";
import type { Wallet } from "@/types/wallet";

let ledger: LedgerTransaction[] = structuredClone(MOCK_LEDGER_SEED);
let wallets: Wallet[] = buildWalletsFromLedger(ledger);
let forceError: string | null = null;
const idempotencyIndex = new Map<string, string>();

function reindexIdempotency() {
  idempotencyIndex.clear();
  for (const t of ledger) {
    if (t.idempotencyKey) idempotencyIndex.set(t.idempotencyKey, t.id);
  }
}
reindexIdempotency();

function refreshWallets() {
  wallets = buildWalletsFromLedger(ledger);
}

function assertOk() {
  if (forceError) throw new Error(forceError);
}

function matchesFilters(t: LedgerTransaction, filters?: TransactionFilters): boolean {
  if (!filters) return true;
  if (filters.type && filters.type !== "ALL" && t.type !== filters.type) return false;
  if (filters.direction && filters.direction !== "ALL" && t.direction !== filters.direction)
    return false;
  if (filters.status && filters.status !== "ALL" && t.status !== filters.status) return false;
  if (filters.userId && t.userId !== filters.userId) return false;
  if (
    filters.referenceType &&
    filters.referenceType !== "ALL" &&
    t.referenceType !== filters.referenceType
  )
    return false;
  if (filters.referenceId && t.referenceId !== filters.referenceId) return false;
  if (filters.from && t.createdAt < filters.from) return false;
  if (filters.to && t.createdAt > filters.to) return false;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    const hay = `${t.id} ${t.userId} ${t.referenceId ?? ""} ${t.description}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function filterTransactions(
  list: LedgerTransaction[],
  filters?: TransactionFilters,
): LedgerTransaction[] {
  return list.filter((t) => matchesFilters(t, filters));
}

export const transactionsService = {
  async getTransactions(filters?: TransactionFilters): Promise<LedgerTransaction[]> {
    assertOk();
    return structuredClone(filterTransactions(ledger, filters));
  },

  async getTransactionById(id: string): Promise<LedgerTransaction | null> {
    assertOk();
    const t = ledger.find((x) => x.id === id);
    return t ? structuredClone(t) : null;
  },

  async getUserTransactions(userId: string): Promise<LedgerTransaction[]> {
    return this.getTransactions({ userId });
  },

  async getTransactionsByRide(rideId: string): Promise<LedgerTransaction[]> {
    assertOk();
    return structuredClone(
      ledger.filter(
        (t) =>
          (t.referenceType === "RIDE" && t.referenceId === rideId) ||
          String(t.metadata.rideId ?? "") === rideId,
      ),
    );
  },

  async getTransactionsByReference(
    referenceType: string,
    referenceId: string,
  ): Promise<LedgerTransaction[]> {
    assertOk();
    return structuredClone(
      ledger.filter((t) => t.referenceType === referenceType && t.referenceId === referenceId),
    );
  },

  calculateWalletBalanceFromLedger(walletId: string) {
    return calculateWalletBalancesFromLedger(ledger, walletId);
  },

  /** Internal: append completed txn; respects idempotency. */
  async createLedgerEntry(
    input: Omit<LedgerTransaction, "id"> & { id?: string },
  ): Promise<LedgerTransaction> {
    assertOk();
    if (input.idempotencyKey) {
      const existingId = idempotencyIndex.get(input.idempotencyKey);
      if (existingId) {
        const existing = ledger.find((t) => t.id === existingId);
        if (existing) return structuredClone(existing);
      }
    }
    const id = input.id ?? `txn_${Date.now()}_${ledger.length}`;
    const entry: LedgerTransaction = { ...input, id };
    ledger = [entry, ...ledger];
    if (entry.idempotencyKey) idempotencyIndex.set(entry.idempotencyKey, entry.id);
    refreshWallets();
    return structuredClone(entry);
  },

  async createAdjustment(input: CreateAdjustmentInput): Promise<LedgerTransaction> {
    assertOk();
    if (input.amountPaise <= 0) throw new Error("Adjustment amount must be positive.");
    if (!input.reason.trim()) throw new Error("Reason is required.");
    if (input.idempotencyKey && idempotencyIndex.has(input.idempotencyKey)) {
      const id = idempotencyIndex.get(input.idempotencyKey)!;
      return structuredClone(ledger.find((t) => t.id === id)!);
    }
    const wallet = wallets.find((w) => w.userId === input.userId);
    if (!wallet) throw new Error("Wallet not found for user.");
    if (wallet.status === "LOCKED" || wallet.status === "CLOSED") {
      throw new Error(`Wallet is ${wallet.status}; cannot adjust.`);
    }
    const now = new Date().toISOString();
    const entry = await this.createLedgerEntry({
      userId: input.userId,
      walletId: wallet.id,
      type: "ADJUSTMENT",
      direction: input.direction,
      amountPaise: input.amountPaise,
      currency: "INR",
      status: "COMPLETED",
      referenceType: input.referenceType ?? "ADJUSTMENT",
      referenceId: input.referenceId ?? null,
      description: `Admin adjustment: ${input.reason}`,
      createdAt: now,
      completedAt: now,
      createdBy: input.adminId,
      idempotencyKey: input.idempotencyKey,
      reversesTransactionId: null,
      reversedByTransactionId: null,
      metadata: { reason: input.reason },
    });
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "money.adjustment_created",
      targetType: "transaction",
      targetId: entry.id,
      oldValue: null,
      newValue: { amountPaise: entry.amountPaise, direction: entry.direction },
      reason: input.reason,
    });
    return entry;
  },

  async createReversalTransaction(input: CreateReversalInput): Promise<LedgerTransaction> {
    assertOk();
    if (input.idempotencyKey && idempotencyIndex.has(input.idempotencyKey)) {
      const id = idempotencyIndex.get(input.idempotencyKey)!;
      return structuredClone(ledger.find((t) => t.id === id)!);
    }
    const original = ledger.find((t) => t.id === input.originalTransactionId);
    if (!original) throw new Error("Original transaction not found.");
    if (original.status !== "COMPLETED") {
      throw new Error("Only completed transactions can be reversed.");
    }
    if (original.reversedByTransactionId) {
      throw new Error("Transaction already reversed.");
    }
    // Immutability: never edit original amount — create compensating entry
    const now = new Date().toISOString();
    const reversal = await this.createLedgerEntry({
      userId: original.userId,
      walletId: original.walletId,
      type: original.type === "REFUND" ? "ADJUSTMENT" : "ADJUSTMENT",
      direction: oppositeDirection(original.direction),
      amountPaise: original.amountPaise,
      currency: original.currency,
      status: "COMPLETED",
      referenceType: "ADJUSTMENT",
      referenceId: original.id,
      description: `Reversal of ${original.id}: ${input.reason}`,
      createdAt: now,
      completedAt: now,
      createdBy: input.adminId,
      idempotencyKey: input.idempotencyKey,
      reversesTransactionId: original.id,
      reversedByTransactionId: null,
      metadata: { reason: input.reason },
    });
    ledger = ledger.map((t) =>
      t.id === original.id
        ? { ...t, status: "REVERSED" as const, reversedByTransactionId: reversal.id }
        : t,
    );
    refreshWallets();
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "money.transaction_reversed",
      targetType: "transaction",
      targetId: original.id,
      oldValue: { status: "COMPLETED" },
      newValue: { status: "REVERSED", reversalId: reversal.id },
      reason: input.reason,
    });
    return reversal;
  },

  /** Completed entries are immutable — attempt to mutate throws. */
  assertImmutable(txn: LedgerTransaction): void {
    if (txn.status === "COMPLETED" || txn.status === "REVERSED") {
      throw new Error("Completed ledger entries are immutable. Create a reversal instead.");
    }
  },

  getWalletsSnapshot(): Wallet[] {
    return structuredClone(wallets);
  },

  __getLedger(): LedgerTransaction[] {
    return ledger;
  },

  __resetForTests() {
    ledger = structuredClone(MOCK_LEDGER_SEED);
    refreshWallets();
    reindexIdempotency();
    forceError = null;
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
