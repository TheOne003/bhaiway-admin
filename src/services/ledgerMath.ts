import type { LedgerTransaction } from "@/types/transaction";
import { nonNegativePaise } from "@/lib/money";

/**
 * Derive wallet available + held balances from completed ledger entries.
 * Available: CREDIT − DEBIT (completed only).
 * Held: HOLD − RELEASE (completed only).
 */
export function calculateWalletBalancesFromLedger(
  ledger: LedgerTransaction[],
  walletId: string,
): { availableBalancePaise: number; heldBalancePaise: number } {
  let available = 0;
  let held = 0;
  for (const txn of ledger) {
    if (txn.walletId !== walletId) continue;
    // COMPLETED and REVERSED both remain on the ledger; compensating entries adjust net.
    if (txn.status !== "COMPLETED" && txn.status !== "REVERSED") continue;
    if (txn.direction === "CREDIT") available += txn.amountPaise;
    else if (txn.direction === "DEBIT") available -= txn.amountPaise;
    else if (txn.direction === "HOLD") held += txn.amountPaise;
    else if (txn.direction === "RELEASE") held -= txn.amountPaise;
  }
  return {
    availableBalancePaise: nonNegativePaise(available),
    heldBalancePaise: nonNegativePaise(held),
  };
}

export function oppositeDirection(
  direction: LedgerTransaction["direction"],
): LedgerTransaction["direction"] {
  if (direction === "CREDIT") return "DEBIT";
  if (direction === "DEBIT") return "CREDIT";
  if (direction === "HOLD") return "RELEASE";
  return "HOLD";
}
