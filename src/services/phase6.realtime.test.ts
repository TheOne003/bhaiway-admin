import { beforeEach, describe, expect, it } from "vitest";
import { applyRealtimeEvent } from "@/services/realtimeBridge";
import { __resetAlertsForTests } from "@/services/alerts";
import { __resetNotificationsForTests, notificationsService } from "@/services/notifications";
import { __resetDashboardForTests, dashboardService } from "@/services/dashboard";
import { walletService } from "@/services/wallet";
import { transactionsService } from "@/services/transactions";
import { refundsService } from "@/services/refunds";
import { creditsService } from "@/services/credits";
import { couponsService } from "@/services/coupons";
import { referralsService } from "@/services/referrals";
import { securityDepositService } from "@/services/securityDeposits";
import { __resetAuditForTests } from "@/services/audit";

describe("Phase 6 money realtime", () => {
  beforeEach(() => {
    __resetAlertsForTests();
    __resetNotificationsForTests();
    __resetDashboardForTests();
    walletService.__resetForTests();
    refundsService.__resetForTests();
    creditsService.__resetForTests();
    couponsService.__resetForTests();
    referralsService.__resetForTests();
    securityDepositService.__resetForTests();
    __resetAuditForTests();
  });

  it("transaction_created updates timeline and notification without duplicating ledger", async () => {
    const before = (await transactionsService.getTransactions()).length;
    await applyRealtimeEvent({
      id: "evt_money_txn_1",
      type: "money.transaction_created",
      timestamp: "2026-09-20T06:00:00.000Z",
      payload: {
        transactionId: "txn_001",
        userId: "usr_001",
        walletId: "wal_001",
        amountPaise: 50000,
        type: "CREDIT",
        direction: "CREDIT",
        status: "COMPLETED",
        timestamp: "2026-09-20T06:00:00.000Z",
      },
    });
    const after = (await transactionsService.getTransactions()).length;
    expect(after).toBe(before);
    const notifs = await notificationsService.getNotifications();
    expect(notifs.some((n) => n.id === "notif_money_evt_money_txn_1")).toBe(true);
    const dash = await dashboardService.getDashboard();
    expect(dash.recentEvents.some((e) => e.id === "evt_money_evt_money_txn_1")).toBe(true);
  });

  it("wallet_updated notifies without inventing balances", async () => {
    const wallet = await walletService.getWalletById("wal_001");
    await applyRealtimeEvent({
      id: "evt_wal_1",
      type: "money.wallet_updated",
      timestamp: "2026-09-20T06:01:00.000Z",
      payload: {
        walletId: "wal_001",
        userId: "usr_001",
        availableBalancePaise: wallet!.availableBalancePaise,
        heldBalancePaise: wallet!.heldBalancePaise,
        status: "ACTIVE",
        timestamp: "2026-09-20T06:01:00.000Z",
      },
    });
    const again = await walletService.getWalletById("wal_001");
    expect(again!.availableBalancePaise).toBe(wallet!.availableBalancePaise);
  });

  it("refund_updated and credit_updated timeline events", async () => {
    await applyRealtimeEvent({
      id: "evt_ref",
      type: "money.refund_updated",
      timestamp: "2026-09-20T06:02:00.000Z",
      payload: {
        refundId: "ref_002",
        userId: "usr_002",
        previousStatus: "REQUESTED",
        newStatus: "APPROVED",
        amountPaise: 3000,
        timestamp: "2026-09-20T06:02:00.000Z",
      },
    });
    await applyRealtimeEvent({
      id: "evt_crd",
      type: "money.credit_created",
      timestamp: "2026-09-20T06:03:00.000Z",
      payload: {
        creditId: "crd_001",
        userId: "usr_001",
        amountPaise: 2500,
        status: "ACTIVE",
        timestamp: "2026-09-20T06:03:00.000Z",
      },
    });
    const dash = await dashboardService.getDashboard();
    expect(dash.recentEvents.some((e) => e.id === "evt_ref_ref_002_APPROVED")).toBe(true);
    expect(dash.recentEvents.some((e) => e.id === "evt_crd_crd_001_ACTIVE")).toBe(true);
  });

  it("deposit coupon referral growth events", async () => {
    await applyRealtimeEvent({
      id: "evt_dep",
      type: "money.deposit_updated",
      timestamp: "2026-09-20T06:04:00.000Z",
      payload: {
        depositId: "dep_001",
        rideId: "BW20011",
        userId: "usr_001",
        status: "HELD",
        amountPaise: 2500,
        timestamp: "2026-09-20T06:04:00.000Z",
      },
    });
    await applyRealtimeEvent({
      id: "evt_cpn",
      type: "growth.coupon_updated",
      timestamp: "2026-09-20T06:05:00.000Z",
      payload: {
        couponId: "cpn_001",
        code: "BHAI50",
        previousStatus: "ACTIVE",
        newStatus: "PAUSED",
        timestamp: "2026-09-20T06:05:00.000Z",
      },
    });
    await applyRealtimeEvent({
      id: "evt_refc",
      type: "growth.referral_updated",
      timestamp: "2026-09-20T06:06:00.000Z",
      payload: {
        referralId: "refc_002",
        referrerUserId: "usr_001",
        previousStatus: "QUALIFIED",
        newStatus: "REWARDED",
        timestamp: "2026-09-20T06:06:00.000Z",
        rewardTransactionId: null,
      },
    });
    const dash = await dashboardService.getDashboard();
    expect(dash.recentEvents.some((e) => e.id.includes("dep_001"))).toBe(true);
    expect(dash.recentEvents.some((e) => e.id.includes("cpn_001"))).toBe(true);
    expect(dash.recentEvents.some((e) => e.id.includes("refc_002"))).toBe(true);
  });
});
