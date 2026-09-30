import type { CurrencyCode } from "./money";

export type WalletStatus = "ACTIVE" | "LOCKED" | "SUSPENDED" | "CLOSED";

export interface Wallet {
  id: string;
  userId: string;
  currency: CurrencyCode;
  /** Derived from completed ledger CREDITS − DEBITS (cash). */
  availableBalancePaise: number;
  /** Derived from open HOLD − RELEASE entries (security deposits etc.). */
  heldBalancePaise: number;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WalletSummary {
  totalWallets: number;
  activeWallets: number;
  lockedWallets: number;
  totalAvailablePaise: number;
  totalHeldPaise: number;
}

export interface WalletFilters {
  status?: WalletStatus | "ALL";
  search?: string;
  minAvailablePaise?: number;
  maxAvailablePaise?: number;
}
