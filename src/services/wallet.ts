import { auditService } from "@/services/audit";
import { transactionsService } from "@/services/transactions";
import type { Wallet, WalletFilters, WalletStatus, WalletSummary } from "@/types/wallet";

let forceError: string | null = null;
const walletStatusOverrides = new Map<string, WalletStatus>();

function assertOk() {
  if (forceError) throw new Error(forceError);
}

function withOverrides(list: Wallet[]): Wallet[] {
  return list.map((w) => {
    const status = walletStatusOverrides.get(w.id);
    return status ? { ...w, status } : w;
  });
}

export function filterWallets(list: Wallet[], filters?: WalletFilters): Wallet[] {
  if (!filters) return list;
  return list.filter((w) => {
    if (filters.status && filters.status !== "ALL" && w.status !== filters.status) return false;
    if (filters.minAvailablePaise != null && w.availableBalancePaise < filters.minAvailablePaise)
      return false;
    if (filters.maxAvailablePaise != null && w.availableBalancePaise > filters.maxAvailablePaise)
      return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!`${w.id} ${w.userId}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export const walletService = {
  async getWallets(filters?: WalletFilters): Promise<Wallet[]> {
    assertOk();
    return filterWallets(withOverrides(transactionsService.getWalletsSnapshot()), filters);
  },

  async getWalletById(id: string): Promise<Wallet | null> {
    assertOk();
    return withOverrides(transactionsService.getWalletsSnapshot()).find((w) => w.id === id) ?? null;
  },

  async getWalletByUserId(userId: string): Promise<Wallet | null> {
    assertOk();
    return (
      withOverrides(transactionsService.getWalletsSnapshot()).find((w) => w.userId === userId) ??
      null
    );
  },

  async getWalletSummary(): Promise<WalletSummary> {
    assertOk();
    const list = withOverrides(transactionsService.getWalletsSnapshot());
    return {
      totalWallets: list.length,
      activeWallets: list.filter((w) => w.status === "ACTIVE").length,
      lockedWallets: list.filter((w) => w.status === "LOCKED").length,
      totalAvailablePaise: list.reduce((s, w) => s + w.availableBalancePaise, 0),
      totalHeldPaise: list.reduce((s, w) => s + w.heldBalancePaise, 0),
    };
  },

  async getWalletBalance(walletId: string) {
    assertOk();
    return transactionsService.calculateWalletBalanceFromLedger(walletId);
  },

  async getWalletActivity(walletId: string) {
    assertOk();
    const wallet = await this.getWalletById(walletId);
    if (!wallet) return [];
    const txns = await transactionsService.getUserTransactions(wallet.userId);
    return txns.filter((t) => t.walletId === walletId);
  },

  async setWalletStatus(
    walletId: string,
    status: WalletStatus,
    input: { adminId: string; adminName: string; reason: string },
  ): Promise<Wallet> {
    assertOk();
    const target = await this.getWalletById(walletId);
    if (!target) throw new Error("Wallet not found.");
    const old = target.status;
    walletStatusOverrides.set(walletId, status);
    const updated = { ...target, status, updatedAt: new Date().toISOString() };
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "money.wallet_status_changed",
      targetType: "wallet",
      targetId: walletId,
      oldValue: { status: old },
      newValue: { status },
      reason: input.reason,
    });
    return updated;
  },

  __resetForTests() {
    forceError = null;
    walletStatusOverrides.clear();
    transactionsService.__resetForTests();
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
