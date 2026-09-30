import { beforeEach, describe, expect, it } from "vitest";
import {
  addMoney,
  applyDiscountPaise,
  formatMoney,
  nonNegativePaise,
  paiseToRupees,
  percentOfPaise,
  rupeesToPaise,
  subtractMoney,
} from "@/lib/money";
import { calculateWalletBalancesFromLedger } from "@/services/ledgerMath";
import { transactionsService } from "@/services/transactions";
import { walletService } from "@/services/wallet";
import { securityDepositService } from "@/services/securityDeposits";
import { refundsService } from "@/services/refunds";
import { creditsService } from "@/services/credits";
import {
  calculateCouponDiscount,
  couponsService,
  validateCouponConfig,
} from "@/services/coupons";
import { referralsService } from "@/services/referrals";
import { auditService, __resetAuditForTests } from "@/services/audit";
import type { LedgerTransaction } from "@/types/transaction";

describe("money helpers", () => {
  it("converts rupees and paise", () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(paiseToRupees(10000)).toBe(100);
    expect(rupeesToPaise(10.555)).toBe(1056);
    expect(rupeesToPaise(NaN)).toBe(0);
  });

  it("formats and arithmetic", () => {
    expect(formatMoney(10000)).toMatch(/100/);
    expect(addMoney(100, 50)).toBe(150);
    expect(subtractMoney(100, 40)).toBe(60);
    expect(nonNegativePaise(-5)).toBe(0);
    expect(percentOfPaise(10000, 20)).toBe(2000);
    expect(applyDiscountPaise(10000, 5000, 3000)).toBe(3000);
    expect(applyDiscountPaise(1000, 5000, null)).toBe(1000);
  });
});

describe("ledger-derived wallet balances", () => {
  beforeEach(() => {
    walletService.__resetForTests();
    __resetAuditForTests();
  });

  it("derives available and held from completed ledger", () => {
    const bal = transactionsService.calculateWalletBalanceFromLedger("wal_001");
    // Seed: +50000 credit, -12000 fare, HOLD 2500, +5000 refund, +2500 promo credit
    expect(bal.availableBalancePaise).toBe(50000 - 12000 + 5000 + 2500);
    expect(bal.heldBalancePaise).toBe(2500);
  });

  it("ignores pending/failed/cancelled for balance", () => {
    const ledger: LedgerTransaction[] = [
      {
        id: "t1",
        userId: "u",
        walletId: "w",
        type: "CREDIT",
        direction: "CREDIT",
        amountPaise: 1000,
        currency: "INR",
        status: "COMPLETED",
        referenceType: "NONE",
        referenceId: null,
        description: "x",
        createdAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-01T00:00:00.000Z",
        createdBy: null,
        idempotencyKey: null,
        reversesTransactionId: null,
        reversedByTransactionId: null,
        metadata: {},
      },
      {
        id: "t2",
        userId: "u",
        walletId: "w",
        type: "ADJUSTMENT",
        direction: "CREDIT",
        amountPaise: 9999,
        currency: "INR",
        status: "PENDING",
        referenceType: "NONE",
        referenceId: null,
        description: "x",
        createdAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        createdBy: null,
        idempotencyKey: null,
        reversesTransactionId: null,
        reversedByTransactionId: null,
        metadata: {},
      },
    ];
    expect(calculateWalletBalancesFromLedger(ledger, "w").availableBalancePaise).toBe(1000);
  });

  it("wallet service exposes derived balances", async () => {
    const w = await walletService.getWalletById("wal_001");
    expect(w?.status).toBe("ACTIVE");
    expect(w!.availableBalancePaise).toBeGreaterThan(0);
    expect(w!.heldBalancePaise).toBe(2500);
    const locked = await walletService.getWalletById("wal_006");
    expect(locked?.status).toBe("LOCKED");
  });
});

describe("transactions immutability + reversal + idempotency", () => {
  beforeEach(() => {
    walletService.__resetForTests();
    __resetAuditForTests();
  });

  it("rejects mutating completed entries", async () => {
    const txn = await transactionsService.getTransactionById("txn_001");
    expect(txn?.status).toBe("COMPLETED");
    expect(() => transactionsService.assertImmutable(txn!)).toThrow(/immutable/i);
  });

  it("reversal creates compensating entry and marks original REVERSED", async () => {
    const before = await walletService.getWalletByUserId("usr_001");
    const rev = await transactionsService.createReversalTransaction({
      originalTransactionId: "txn_009",
      reason: "Test correction",
      adminId: "adm_001",
      adminName: "Ops Admin",
      idempotencyKey: "test_rev_txn_009",
    });
    expect(rev.reversesTransactionId).toBe("txn_009");
    expect(rev.direction).toBe("DEBIT");
    const original = await transactionsService.getTransactionById("txn_009");
    expect(original?.status).toBe("REVERSED");
    expect(original?.reversedByTransactionId).toBe(rev.id);
    const after = await walletService.getWalletByUserId("usr_001");
    expect(after!.availableBalancePaise).toBe(before!.availableBalancePaise - 5000);
    const audits = await auditService.listForTarget("transaction", "txn_009");
    expect(audits.some((a) => a.action === "money.transaction_reversed")).toBe(true);
  });

  it("idempotency prevents duplicate adjustments", async () => {
    const a = await transactionsService.createAdjustment({
      userId: "usr_002",
      amountPaise: 100,
      direction: "CREDIT",
      reason: "Idempotent test",
      adminId: "adm_001",
      adminName: "Ops Admin",
      idempotencyKey: "idem_adj_unique_1",
    });
    const b = await transactionsService.createAdjustment({
      userId: "usr_002",
      amountPaise: 100,
      direction: "CREDIT",
      reason: "Idempotent test",
      adminId: "adm_001",
      adminName: "Ops Admin",
      idempotencyKey: "idem_adj_unique_1",
    });
    expect(b.id).toBe(a.id);
    const all = await transactionsService.getUserTransactions("usr_002");
    expect(all.filter((t) => t.idempotencyKey === "idem_adj_unique_1")).toHaveLength(1);
  });
});

describe("security deposits", () => {
  beforeEach(() => {
    securityDepositService.__resetForTests();
  });

  it("lists lifecycle statuses", async () => {
    const list = await securityDepositService.getDeposits();
    expect(list.find((d) => d.id === "dep_001")?.status).toBe("HELD");
    expect(list.find((d) => d.id === "dep_002")?.status).toBe("RELEASED");
    expect(list.find((d) => d.id === "dep_003")?.status).toBe("FORFEITED");
    expect(list.find((d) => d.id === "dep_004")?.status).toBe("REFUNDED");
    expect(list.find((d) => d.id === "dep_005")?.status).toBe("DISPUTED");
  });

  it("links to assured ride and transactions", async () => {
    const d = await securityDepositService.getDepositById("dep_003");
    expect(d?.relatedAssuredRideId).toBe("ar_002");
    expect(d?.relatedCancellationId).toBe("cancel_ar_002");
    expect(d?.relatedTransactionId).toBe("txn_007");
  });
});

describe("refunds lifecycle", () => {
  beforeEach(() => {
    walletService.__resetForTests();
    refundsService.__resetForTests();
    __resetAuditForTests();
  });

  it("approves then completes with refund ledger entry", async () => {
    const before = await walletService.getWalletByUserId("usr_002");
    await refundsService.transitionRefund("ref_002", "APPROVED", {
      adminId: "adm_001",
      adminName: "Ops Admin",
      reason: "Valid recovery",
    });
    let r = await refundsService.getRefundById("ref_002");
    expect(r?.status).toBe("APPROVED");
    await refundsService.transitionRefund("ref_002", "PROCESSING", {
      adminId: "adm_001",
      adminName: "Ops Admin",
      reason: "Start processing",
    });
    await refundsService.transitionRefund("ref_002", "COMPLETED", {
      adminId: "adm_001",
      adminName: "Ops Admin",
      reason: "Paid mock",
      idempotencyKey: "complete_ref_002",
    });
    r = await refundsService.getRefundById("ref_002");
    expect(r?.status).toBe("COMPLETED");
    expect(r?.refundTransactionId).toBeTruthy();
    const after = await walletService.getWalletByUserId("usr_002");
    expect(after!.availableBalancePaise).toBe(before!.availableBalancePaise + 3000);
  });

  it("rejects invalid transitions", async () => {
    await expect(
      refundsService.transitionRefund("ref_001", "APPROVED", {
        adminId: "adm_001",
        adminName: "Ops Admin",
        reason: "noop",
      }),
    ).rejects.toThrow(/Cannot transition/);
  });
});

describe("credits", () => {
  beforeEach(() => {
    walletService.__resetForTests();
    creditsService.__resetForTests();
    __resetAuditForTests();
  });

  it("creates credit with ledger + idempotency", async () => {
    const c1 = await creditsService.createCredit({
      userId: "usr_002",
      amountPaise: 500,
      reason: "Manual recovery",
      source: "ADMIN_ADJUSTMENT",
      expiresAt: "2026-12-31T00:00:00.000Z",
      adminId: "adm_001",
      adminName: "Ops Admin",
      idempotencyKey: "credit_idem_1",
    });
    expect(c1.status).toBe("ACTIVE");
    expect(c1.remainingPaise).toBe(500);
    const c2 = await creditsService.createCredit({
      userId: "usr_002",
      amountPaise: 500,
      reason: "Manual recovery",
      source: "ADMIN_ADJUSTMENT",
      expiresAt: "2026-12-31T00:00:00.000Z",
      adminId: "adm_001",
      adminName: "Ops Admin",
      idempotencyKey: "credit_idem_1",
    });
    expect(c2.id).toBe(c1.id);
  });

  it("partial use and revoke", async () => {
    const partial = await creditsService.markPartialUse("crd_001", 1000);
    expect(partial.status).toBe("PARTIALLY_USED");
    expect(partial.remainingPaise).toBe(1500);
    const revoked = await creditsService.revokeCredit("crd_001", {
      adminId: "adm_001",
      adminName: "Ops Admin",
      reason: "Abuse",
      idempotencyKey: "revoke_crd_001",
    });
    expect(revoked.status).toBe("REVOKED");
    expect(revoked.remainingPaise).toBe(0);
  });
});

describe("coupons", () => {
  beforeEach(() => {
    couponsService.__resetForTests();
  });

  it("validates configuration", () => {
    expect(
      validateCouponConfig({
        discountType: "PERCENTAGE",
        discountValue: 150,
        maxDiscountPaise: 1000,
        usageLimit: 10,
        validFrom: "2026-01-01",
        validUntil: "2026-02-01",
      }).valid,
    ).toBe(false);
    expect(
      validateCouponConfig({
        discountType: "FIXED",
        discountValue: -1,
        maxDiscountPaise: null,
        usageLimit: -1,
        validFrom: "2026-02-01",
        validUntil: "2026-01-01",
      }).errors.length,
    ).toBeGreaterThan(0);
  });

  it("fixed and percentage discounts with max cap", async () => {
    const fixed = await couponsService.getCouponById("cpn_001");
    const f = calculateCouponDiscount(fixed!, 20000);
    expect(f.discountPaise).toBe(5000);
    const pct = await couponsService.getCouponById("cpn_002");
    // 20% of 100000 = 20000 but max 15000
    const p = calculateCouponDiscount(pct!, 100000);
    expect(p.discountPaise).toBe(15000);
  });
});

describe("referrals", () => {
  beforeEach(() => {
    walletService.__resetForTests();
    referralsService.__resetForTests();
    __resetAuditForTests();
  });

  it("issues reward once for qualified referral", async () => {
    const before = await walletService.getWalletByUserId("usr_001");
    const rewarded = await referralsService.issueReward("refc_002", {
      adminId: "adm_001",
      adminName: "Ops Admin",
      reason: "First ride verified",
      idempotencyKey: "reward_refc_002",
    });
    expect(rewarded.status).toBe("REWARDED");
    expect(rewarded.rewardTransactionId).toBeTruthy();
    const again = await referralsService.issueReward("refc_002", {
      adminId: "adm_001",
      adminName: "Ops Admin",
      reason: "First ride verified",
      idempotencyKey: "reward_refc_002_dup",
    });
    expect(again.rewardTransactionId).toBe(rewarded.rewardTransactionId);
    const after = await walletService.getWalletByUserId("usr_001");
    expect(after!.availableBalancePaise).toBe(before!.availableBalancePaise + 10000);
  });

  it("blocks reward when not qualified", async () => {
    await expect(
      referralsService.issueReward("refc_003", {
        adminId: "adm_001",
        adminName: "Ops Admin",
        reason: "too early",
        idempotencyKey: "bad_reward",
      }),
    ).rejects.toThrow(/QUALIFIED/);
  });
});
