import type {
  AnalyticsFilters,
  AnalyticsOverview,
  AnalyticsRange,
  MetricValue,
  NetworkSplit,
  TimeSeriesPoint,
} from "@/types/analytics";
import type { Ride } from "@/types/ride";
import type { User } from "@/types/user";
import { usersService } from "@/services/users";
import { driversService } from "@/services/drivers";
import { ridesService } from "@/services/rides";
import { safetyService } from "@/services/safety";
import { incidentsService } from "@/services/incidents";
import { verificationService } from "@/services/verification";
import { transactionsService } from "@/services/transactions";
import { refundsService } from "@/services/refunds";
import { creditsService } from "@/services/credits";
import { supportService } from "@/services/support";
import { notificationEngine } from "@/services/notificationEngine";
import { couponsService } from "@/services/coupons";
import { referralsService } from "@/services/referrals";
import { assuredRideService } from "@/services/assuredRide";

/** Deterministic mock clock so filters do not depend on wall time. */
export const ANALYTICS_REFERENCE_NOW = "2026-09-20T12:00:00.000Z";

let forceError = false;
let referenceNow = ANALYTICS_REFERENCE_NOW;

export function __resetAnalyticsForTests(): void {
  forceError = false;
  referenceNow = ANALYTICS_REFERENCE_NOW;
}

export function __setAnalyticsErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function __setAnalyticsReferenceNowForTests(iso: string): void {
  referenceNow = iso;
}

function metric(key: string, label: string, value: number | null, unavailableReason?: string): MetricValue {
  return value == null
    ? { key, label, value: null, unavailableReason: unavailableReason ?? "Not available" }
    : { key, label, value };
}

function rangeBounds(filters: AnalyticsFilters): { from: Date; to: Date } {
  const to = filters.customTo
    ? new Date(filters.customTo)
    : new Date(referenceNow);
  const from = (() => {
    if (filters.range === "CUSTOM" && filters.customFrom) {
      return new Date(filters.customFrom);
    }
    const d = new Date(to);
    switch (filters.range as AnalyticsRange) {
      case "TODAY":
        d.setUTCHours(0, 0, 0, 0);
        return d;
      case "7D":
        d.setUTCDate(d.getUTCDate() - 7);
        return d;
      case "30D":
        d.setUTCDate(d.getUTCDate() - 30);
        return d;
      case "90D":
        d.setUTCDate(d.getUTCDate() - 90);
        return d;
      default:
        d.setUTCDate(d.getUTCDate() - 30);
        return d;
    }
  })();
  return { from, to };
}

function inRange(iso: string, from: Date, to: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function filterUsers(list: User[], filters: AnalyticsFilters, from: Date, to: Date): User[] {
  return list.filter((u) => {
    if (!inRange(u.joinedAt, from, to) && !inRange(u.lastActiveAt, from, to)) {
      // Include users active or joined in window
      return false;
    }
    if (filters.userType !== "ALL" && u.userType !== filters.userType) return false;
    return true;
  });
}

function filterRides(list: Ride[], filters: AnalyticsFilters, from: Date, to: Date): Ride[] {
  return list.filter((r) => {
    if (!inRange(r.createdAt, from, to) && !inRange(r.scheduledStart, from, to)) return false;
    if (filters.network !== "ALL" && r.networkType !== filters.network) return false;
    return true;
  });
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function buildTimeSeries(
  rides: Ride[],
  users: User[],
  sosCountByDay: Map<string, number>,
  supportByDay: Map<string, number>,
  from: Date,
  to: Date,
): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);

  const ridesByDay = new Map<string, number>();
  for (const r of rides) {
    const k = dayKey(r.createdAt);
    ridesByDay.set(k, (ridesByDay.get(k) ?? 0) + 1);
  }
  const usersByDay = new Map<string, number>();
  for (const u of users) {
    const k = dayKey(u.joinedAt);
    usersByDay.set(k, (usersByDay.get(k) ?? 0) + 1);
  }

  while (cursor.getTime() <= end.getTime()) {
    const k = cursor.toISOString().slice(0, 10);
    points.push({
      date: k,
      label: k.slice(5),
      rides: ridesByDay.get(k) ?? 0,
      users: usersByDay.get(k) ?? 0,
      sos: sosCountByDay.get(k) ?? 0,
      support: supportByDay.get(k) ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

export const analyticsService = {
  async getOverviewMetrics(filters: AnalyticsFilters): Promise<AnalyticsOverview> {
    if (forceError) throw new Error("Unable to load analytics.");
    const { from, to } = rangeBounds(filters);

    const [allUsers, allDrivers, allRides, sosCases, incidents, verifications, txns, refunds, credits, tickets, notifSummary, coupons, referrals, assured] =
      await Promise.all([
        usersService.getUsers(),
        driversService.getDrivers(),
        ridesService.getRides(),
        safetyService.getSOSCases(),
        incidentsService.getIncidents(),
        verificationService.getVerifications(),
        transactionsService.getTransactions(),
        refundsService.getRefunds(),
        creditsService.getCredits(),
        supportService.getTickets(),
        notificationEngine.getSummary(),
        couponsService.getCoupons(),
        referralsService.getReferrals(),
        assuredRideService.getAssuredRides(),
      ]);

    const users = filterUsers(allUsers, filters, from, to);
    const rides = filterRides(allRides, filters, from, to);

    const activeUsers = users.filter((u) => u.status === "ACTIVE").length;
    const riders = users.filter((u) => u.userType === "RIDER" || u.userType === "BOTH").length;
    const driversCount = users.filter((u) => u.userType === "DRIVER" || u.userType === "BOTH").length;
    const both = users.filter((u) => u.userType === "BOTH").length;
    const verified = users.filter(
      (u) =>
        u.governmentVerificationStatus === "APPROVED" ||
        u.corporateVerificationStatus === "APPROVED",
    ).length;

    const completed = rides.filter((r) => r.status === "completed").length;
    const cancelled = rides.filter((r) => r.status === "cancelled").length;
    const activeRides = rides.filter((r) => r.status === "active" || r.status === "delayed").length;
    const office = rides.filter((r) => r.networkType === "OFFICE").length;
    const outstation = rides.filter((r) => r.networkType === "OUTSTATION").length;

    const sosInRange = sosCases.filter((s) => inRange(s.triggeredAt ?? s.createdAt, from, to));
    const incidentsInRange = incidents.filter((i) => inRange(i.createdAt, from, to));
    const criticalIncidents = incidentsInRange.filter((i) => i.severity === "CRITICAL").length;
    const resolvedIncidents = incidentsInRange.filter(
      (i) => i.status === "RESOLVED" || i.status === "CLOSED",
    ).length;

    const verInRange = verifications.filter((v) => inRange(v.createdAt, from, to));
    const pendingV = verInRange.filter((v) => v.status === "PENDING").length;
    const approvedV = verInRange.filter((v) => v.status === "APPROVED").length;
    const failedV = verInRange.filter((v) => v.status === "FAILED").length;
    const manualV = verInRange.filter((v) => v.status === "MANUAL_REVIEW").length;

    const txInRange = txns.filter((t) => inRange(t.createdAt, from, to));
    const volume = txInRange.reduce((sum, t) => sum + Math.abs(t.amountPaise), 0);
    const creditSum = credits
      .filter((c) => inRange(c.createdAt, from, to))
      .reduce((sum, c) => sum + c.amountPaise, 0);
    const refundSum = refunds
      .filter((r) => inRange(r.createdAt, from, to))
      .reduce((sum, r) => sum + r.amountPaise, 0);

    const ticketsInRange = tickets.filter((t) => inRange(t.createdAt, from, to));
    const openTickets = ticketsInRange.filter(
      (t) => t.status !== "RESOLVED" && t.status !== "CLOSED",
    ).length;
    const resolvedTickets = ticketsInRange.filter(
      (t) => t.status === "RESOLVED" || t.status === "CLOSED",
    ).length;
    const urgentTickets = ticketsInRange.filter(
      (t) => t.priority === "URGENT" || t.priority === "HIGH",
    ).length;

    const couponUsage = coupons.reduce((sum, c) => sum + c.usedCount, 0);
    const referralRewards = referrals.filter((r) => r.status === "REWARDED").length;

    const assuredInRange = assured.filter((a) => inRange(a.createdAt, from, to));

    const activeDrivers = allDrivers.filter((d) => d.status === "ACTIVE").length;
    const verifiedDrivers = allDrivers.filter(
      (d) => d.licenceStatus === "APPROVED" && d.governmentIdStatus === "APPROVED",
    ).length;
    const ridesPerDriver =
      activeDrivers > 0 ? Math.round((rides.length / activeDrivers) * 10) / 10 : null;
    const cancelRate =
      rides.length > 0 ? Math.round((cancelled / rides.length) * 1000) / 10 : null;

    const networkSplit: NetworkSplit = {
      officeRides: office,
      outstationRides: outstation,
    };

    const sosByDay = new Map<string, number>();
    for (const s of sosInRange) {
      const k = dayKey(s.triggeredAt ?? s.createdAt);
      sosByDay.set(k, (sosByDay.get(k) ?? 0) + 1);
    }
    const supportByDay = new Map<string, number>();
    for (const t of ticketsInRange) {
      const k = dayKey(t.createdAt);
      supportByDay.set(k, (supportByDay.get(k) ?? 0) + 1);
    }

    const timeSeries = buildTimeSeries(rides, users, sosByDay, supportByDay, from, to);

    const summary: MetricValue[] = [
      metric("total_users", "Users (window)", users.length),
      metric("total_rides", "Rides (window)", rides.length),
      metric("active_rides", "Active rides", activeRides),
      metric("sos", "SOS events", sosInRange.length),
      metric("txn_volume", "Txn volume (paise)", volume),
      metric("open_tickets", "Open tickets", openTickets),
    ];

    return {
      filters,
      generatedAt: referenceNow,
      summary,
      networkSplit,
      timeSeries,
      users: [
        metric("total_users", "Total users", users.length),
        metric("active_users", "Active users", activeUsers),
        metric("riders", "Riders", riders),
        metric("drivers", "Drivers", driversCount),
        metric("both", "Both", both),
        metric("verified_users", "Verified users", verified),
      ],
      rides: [
        metric("total_rides", "Total rides", rides.length),
        metric("active_rides", "Active", activeRides),
        metric("completed", "Completed", completed),
        metric("cancelled", "Cancelled", cancelled),
        metric("office", "Office Commute", office),
        metric("outstation", "Outstation", outstation),
        metric("rides_per_driver", "Rides per driver", ridesPerDriver),
        metric("cancel_rate", "Cancellation rate %", cancelRate),
        metric("active_drivers", "Active drivers", activeDrivers),
        metric("verified_drivers", "Verified drivers", verifiedDrivers),
      ],
      safety: [
        metric("sos", "SOS count", sosInRange.length),
        metric("incidents", "Incidents", incidentsInRange.length),
        metric("critical_incidents", "Critical/high", criticalIncidents),
        metric("resolved_incidents", "Resolved", resolvedIncidents),
      ],
      verification: [
        metric("pending", "Pending", pendingV),
        metric("approved", "Approved", approvedV),
        metric("failed", "Failed", failedV),
        metric("manual_review", "Manual review", manualV),
      ],
      money: [
        metric("txn_volume", "Transaction volume (paise)", volume),
        metric("credits", "Credits (paise)", creditSum),
        metric("refunds", "Refunds (paise)", refundSum),
        metric("security_deposits", "Security deposits", null, "Not available as aggregate in window"),
        metric("compensation", "Compensation", null, "Not available as aggregate in window"),
      ],
      support: [
        metric("open_tickets", "Open tickets", openTickets),
        metric("resolved_tickets", "Resolved tickets", resolvedTickets),
        metric("urgent_tickets", "Urgent/high", urgentTickets),
        metric(
          "avg_resolution_hours",
          "Avg resolution (hours)",
          null,
          "Not available — tickets lack resolution timestamps",
        ),
      ],
      communication: [
        metric(
          "notifications",
          "Notifications (engine)",
          notifSummary.delivered + notifSummary.failed + notifSummary.queued + notifSummary.unread,
        ),
        metric("delivered", "Delivered", notifSummary.delivered),
        metric("failed", "Failed", notifSummary.failed),
        metric("unread", "Unread", notifSummary.unread),
        metric("campaigns", "Campaigns", null, "Not available in summary"),
      ],
      growth: [
        metric("coupon_usage", "Coupon redemptions", couponUsage),
        metric("referrals", "Referrals", referrals.length),
        metric("referral_rewards", "Referral rewards", referralRewards),
      ],
      assured: [
        metric("assured_cases", "Assured Ride cases", assuredInRange.length),
        metric("assured_total", "Assured Ride (all-time mock)", assured.length),
      ],
    };
  },

  async getUserMetrics(filters: AnalyticsFilters) {
    const overview = await this.getOverviewMetrics(filters);
    return overview.users;
  },

  async getRideMetrics(filters: AnalyticsFilters) {
    const overview = await this.getOverviewMetrics(filters);
    return overview.rides;
  },

  async getRevenueMetrics(filters: AnalyticsFilters) {
    const overview = await this.getOverviewMetrics(filters);
    return overview.money;
  },

  async getSafetyMetrics(filters: AnalyticsFilters) {
    const overview = await this.getOverviewMetrics(filters);
    return overview.safety;
  },

  async getVerificationMetrics(filters: AnalyticsFilters) {
    const overview = await this.getOverviewMetrics(filters);
    return overview.verification;
  },

  async getSupportMetrics(filters: AnalyticsFilters) {
    const overview = await this.getOverviewMetrics(filters);
    return overview.support;
  },

  async getNotificationMetrics(filters: AnalyticsFilters) {
    const overview = await this.getOverviewMetrics(filters);
    return overview.communication;
  },

  async getAssuredRideMetrics(filters: AnalyticsFilters) {
    const overview = await this.getOverviewMetrics(filters);
    return overview.assured;
  },

  async getGrowthMetrics(filters: AnalyticsFilters) {
    const overview = await this.getOverviewMetrics(filters);
    return overview.growth;
  },

  async getTimeSeries(filters: AnalyticsFilters) {
    const overview = await this.getOverviewMetrics(filters);
    return overview.timeSeries;
  },
};

export type AnalyticsService = typeof analyticsService;
