import {
  buildCompensationFromCase,
  calculatePerPassengerSecurityPaise,
  toPaise,
} from "@/lib/assuredRideMath";
import type { AssuredRideCase, CancellationCase, CompensationCase } from "@/types/assuredRide";
import type { RiskCase } from "@/types/risk";

function passengers(
  farePaise: number,
  list: { userId: string; name: string; cancelled?: boolean; cancelledAt?: string }[],
) {
  const per = calculatePerPassengerSecurityPaise(farePaise, list.length);
  return list.map((p) => ({
    userId: p.userId,
    name: p.name,
    securityPaise: per,
    cancelled: Boolean(p.cancelled),
    cancelledAt: p.cancelledAt ?? null,
    eligibleForCompensation: !p.cancelled,
    compensationPaise: 0,
  }));
}

function withCompensation(
  base: Omit<AssuredRideCase, "forfeitedPaise" | "compensationPoolPaise" | "passengers" | "securityPaise"> & {
    passengers: AssuredRideCase["passengers"];
  },
): AssuredRideCase {
  const calc = buildCompensationFromCase({
    cancellingParty: base.cancellingParty,
    passengers: base.passengers,
  });
  const securityPaise = base.passengers.reduce((s, p) => s + p.securityPaise, 0);
  const passengersUpdated = base.passengers.map((p) => {
    const alloc = calc.allocations.find((a) => a.userId === p.userId);
    return {
      ...p,
      eligibleForCompensation:
        base.cancellingParty === "DRIVER" ? true : !p.cancelled,
      compensationPaise: alloc?.amountPaise ?? 0,
    };
  });
  return {
    ...base,
    securityPaise,
    forfeitedPaise: calc.forfeitedPaise,
    compensationPoolPaise: calc.compensationPoolPaise,
    passengers: passengersUpdated,
  };
}

const fareA = toPaise(1000); // security total 50 rupees → 5000 paise; 3 pax → 1666 each floor
const fareB = toPaise(2000);
const fareC = toPaise(1500);
const fareD = toPaise(1800);
const fareE = toPaise(1200);

export const MOCK_ASSURED_RIDES: AssuredRideCase[] = [
  withCompensation({
    id: "ar_001",
    rideId: "BW20011",
    networkType: "OUTSTATION",
    driverId: "drv_05",
    driverName: "Imran Khan",
    farePaise: fareB,
    status: "ACTIVE",
    securityStatus: "HELD",
    cancellingParty: "NONE",
    cancelledByUserId: null,
    cancelledAt: null,
    riskCaseId: null,
    routeLabel: "Delhi → Jaipur",
    createdAt: "2026-09-20T01:00:00.000Z",
    updatedAt: "2026-09-20T02:00:00.000Z",
    passengers: passengers(fareB, [
      { userId: "usr_001", name: "Neha Kapoor" },
      { userId: "usr_010", name: "Vikram Rao" },
    ]),
    timeline: [
      { id: "ar_001_t1", label: "Booking confirmed", timestamp: "2026-09-20T01:00:00.000Z" },
      { id: "ar_001_t2", label: "Security collected", timestamp: "2026-09-20T01:01:00.000Z" },
    ],
  }),
  withCompensation({
    id: "ar_002",
    rideId: "BW20012",
    networkType: "OUTSTATION",
    driverId: "drv_06",
    driverName: "Karan Malhotra",
    farePaise: fareA,
    status: "COMPENSATION_PENDING",
    securityStatus: "PARTIAL_FORFEIT",
    cancellingParty: "RIDER",
    cancelledByUserId: "usr_004",
    cancelledAt: "2026-09-20T02:15:00.000Z",
    riskCaseId: "risk_001",
    routeLabel: "Delhi → Agra",
    createdAt: "2026-09-19T22:00:00.000Z",
    updatedAt: "2026-09-20T02:15:00.000Z",
    passengers: passengers(fareA, [
      { userId: "usr_001", name: "Neha Kapoor" },
      { userId: "usr_004", name: "Amit Shah", cancelled: true, cancelledAt: "2026-09-20T02:15:00.000Z" },
      { userId: "usr_010", name: "Vikram Rao" },
    ]),
    timeline: [
      { id: "ar_002_t1", label: "Booking confirmed", timestamp: "2026-09-19T22:00:00.000Z" },
      { id: "ar_002_t2", label: "Security collected", timestamp: "2026-09-19T22:01:00.000Z" },
      { id: "ar_002_t3", label: "Rider cancelled", timestamp: "2026-09-20T02:15:00.000Z" },
      { id: "ar_002_t4", label: "Compensation calculated", timestamp: "2026-09-20T02:15:30.000Z" },
    ],
  }),
  withCompensation({
    id: "ar_003",
    rideId: "BW20013",
    networkType: "OUTSTATION",
    driverId: "drv_07",
    driverName: "Priya Nair",
    farePaise: fareC,
    status: "CANCELLED",
    securityStatus: "FORFEITED",
    cancellingParty: "DRIVER",
    cancelledByUserId: null,
    cancelledAt: "2026-09-20T01:30:00.000Z",
    riskCaseId: "risk_002",
    routeLabel: "Gurugram → Chandigarh",
    createdAt: "2026-09-19T20:00:00.000Z",
    updatedAt: "2026-09-20T01:30:00.000Z",
    passengers: passengers(fareC, [
      { userId: "usr_001", name: "Neha Kapoor" },
      { userId: "usr_008", name: "Meera Joshi" },
    ]),
    timeline: [
      { id: "ar_003_t1", label: "Booking confirmed", timestamp: "2026-09-19T20:00:00.000Z" },
      { id: "ar_003_t2", label: "Driver cancelled", timestamp: "2026-09-20T01:30:00.000Z" },
      { id: "ar_003_t3", label: "Security forfeited", timestamp: "2026-09-20T01:30:10.000Z" },
    ],
  }),
  withCompensation({
    id: "ar_004",
    rideId: "BW20014",
    networkType: "OUTSTATION",
    driverId: "drv_05",
    driverName: "Imran Khan",
    farePaise: fareD,
    status: "COMPENSATED",
    securityStatus: "PARTIAL_FORFEIT",
    cancellingParty: "RIDER",
    cancelledByUserId: "usr_008",
    cancelledAt: "2026-09-19T16:00:00.000Z",
    riskCaseId: null,
    routeLabel: "Noida → Haridwar",
    createdAt: "2026-09-19T10:00:00.000Z",
    updatedAt: "2026-09-19T17:00:00.000Z",
    passengers: passengers(fareD, [
      { userId: "usr_001", name: "Neha Kapoor" },
      { userId: "usr_008", name: "Meera Joshi", cancelled: true, cancelledAt: "2026-09-19T16:00:00.000Z" },
    ]),
    timeline: [
      { id: "ar_004_t1", label: "Compensation paid (mock)", timestamp: "2026-09-19T17:00:00.000Z" },
    ],
  }),
  withCompensation({
    id: "ar_005",
    rideId: "BW20020",
    networkType: "OUTSTATION",
    driverId: "drv_06",
    driverName: "Karan Malhotra",
    farePaise: fareE,
    status: "COMPLETED",
    securityStatus: "REFUNDED",
    cancellingParty: "NONE",
    cancelledByUserId: null,
    cancelledAt: null,
    riskCaseId: null,
    routeLabel: "Delhi → Manali",
    createdAt: "2026-09-18T08:00:00.000Z",
    updatedAt: "2026-09-18T20:00:00.000Z",
    passengers: passengers(fareE, [
      { userId: "usr_010", name: "Vikram Rao" },
      { userId: "usr_001", name: "Neha Kapoor" },
    ]),
    timeline: [
      { id: "ar_005_t1", label: "Ride completed", timestamp: "2026-09-18T19:00:00.000Z" },
      { id: "ar_005_t2", label: "Security refunded", timestamp: "2026-09-18T20:00:00.000Z" },
    ],
  }),
  withCompensation({
    id: "ar_006",
    rideId: "BW20021",
    networkType: "OUTSTATION",
    driverId: "drv_07",
    driverName: "Priya Nair",
    farePaise: toPaise(3000),
    status: "DISPUTED",
    securityStatus: "HELD",
    cancellingParty: "RIDER",
    cancelledByUserId: "usr_004",
    cancelledAt: "2026-09-20T00:30:00.000Z",
    riskCaseId: "risk_003",
    routeLabel: "Delhi → Lucknow",
    createdAt: "2026-09-19T12:00:00.000Z",
    updatedAt: "2026-09-20T00:45:00.000Z",
    passengers: passengers(toPaise(3000), [
      { userId: "usr_004", name: "Amit Shah", cancelled: true, cancelledAt: "2026-09-20T00:30:00.000Z" },
      { userId: "usr_010", name: "Vikram Rao" },
      { userId: "usr_008", name: "Meera Joshi" },
    ]),
    timeline: [
      { id: "ar_006_t1", label: "Dispute opened", timestamp: "2026-09-20T00:45:00.000Z" },
    ],
  }),
  withCompensation({
    id: "ar_007",
    rideId: "BW10302",
    networkType: "OFFICE",
    driverId: "drv_02",
    driverName: "Sana Iqbal",
    farePaise: toPaise(500),
    status: "RISK_REVIEW",
    securityStatus: "PARTIAL_FORFEIT",
    cancellingParty: "RIDER",
    cancelledByUserId: "usr_004",
    cancelledAt: "2026-09-20T02:05:00.000Z",
    riskCaseId: "risk_001",
    routeLabel: "Office commute mock",
    createdAt: "2026-09-20T01:50:00.000Z",
    updatedAt: "2026-09-20T02:10:00.000Z",
    passengers: passengers(toPaise(500), [
      { userId: "usr_004", name: "Amit Shah", cancelled: true, cancelledAt: "2026-09-20T02:05:00.000Z" },
      { userId: "usr_001", name: "Neha Kapoor" },
    ]),
    timeline: [
      { id: "ar_007_t1", label: "Flagged for risk review", timestamp: "2026-09-20T02:10:00.000Z" },
    ],
  }),
];

export function toCancellationCases(cases: AssuredRideCase[]): CancellationCase[] {
  return cases
    .filter((c) => c.cancellingParty !== "NONE")
    .map((c) => {
      const name =
        c.cancellingParty === "DRIVER"
          ? c.driverName
          : c.passengers.find((p) => p.userId === c.cancelledByUserId)?.name ?? "Unknown";
      return {
        id: `cancel_${c.id}`,
        assuredRideId: c.id,
        rideId: c.rideId,
        networkType: c.networkType,
        cancellingParty: c.cancellingParty as "DRIVER" | "RIDER",
        cancellingUserId: c.cancelledByUserId,
        cancellingName: name,
        cancelledAt: c.cancelledAt ?? c.updatedAt,
        securityPaise: c.securityPaise,
        forfeitedPaise: c.forfeitedPaise,
        compensationPoolPaise: c.compensationPoolPaise,
        riskStatus: c.riskCaseId ? "FLAGGED" : "NONE",
        caseStatus: c.status,
      };
    });
}

export function toCompensationCases(cases: AssuredRideCase[]): CompensationCase[] {
  return cases
    .filter((c) => c.forfeitedPaise > 0)
    .map((c) => {
      const eligible = c.passengers.filter((p) => p.compensationPaise > 0 || p.eligibleForCompensation);
      const withAmount = c.passengers.filter((p) => p.compensationPaise > 0);
      const per =
        withAmount.length > 0
          ? withAmount[0].compensationPaise
          : 0;
      return {
        id: `comp_${c.id}`,
        assuredRideId: c.id,
        rideId: c.rideId,
        forfeitedPaise: c.forfeitedPaise,
        compensationPoolPaise: c.compensationPoolPaise,
        eligibleCount: withAmount.length || eligible.filter((p) => !p.cancelled || c.cancellingParty === "DRIVER").length,
        perPassengerPaise: per,
        allocations: c.passengers
          .filter((p) => p.compensationPaise > 0)
          .map((p) => ({
            userId: p.userId,
            name: p.name,
            amountPaise: p.compensationPaise,
          })),
        status:
          c.status === "COMPENSATED"
            ? "PAID_MOCK"
            : c.status === "DISPUTED"
              ? "DISPUTED"
              : "PENDING",
        calculatedAt: c.cancelledAt ?? c.updatedAt,
        resolvedAt: c.status === "COMPENSATED" ? c.updatedAt : null,
      };
    });
}

export const MOCK_RISK_CASES: RiskCase[] = [
  {
    id: "risk_001",
    rideId: "BW20012",
    assuredRideId: "ar_002",
    userId: "usr_004",
    driverId: "drv_06",
    networkType: "OUTSTATION",
    riskType: "REPEATED_CANCELLATION",
    severity: "WARNING",
    score: 72,
    status: "OPEN",
    reason: "Mock rule: repeated cancellations by same rider within 7 days.",
    signals: [
      {
        code: "REPEAT_CANCEL",
        label: "Repeated cancellation",
        detail: "usr_004 cancelled 3 Assured Rides in mock window",
      },
      {
        code: "FAST_CANCEL",
        label: "Fast cancel after booking",
        detail: "Cancel within 15 minutes of booking (mock)",
      },
    ],
    detectedAt: "2026-09-20T02:16:00.000Z",
    reviewedAt: null,
    reviewedBy: null,
    resolution: null,
    metadata: { engine: "mock_rules_v1" },
    timeline: [
      {
        id: "risk_001_t1",
        label: "Risk case opened (mock rules)",
        timestamp: "2026-09-20T02:16:00.000Z",
        actorId: "system",
      },
    ],
  },
  {
    id: "risk_002",
    rideId: "BW20013",
    assuredRideId: "ar_003",
    userId: null,
    driverId: "drv_07",
    networkType: "OUTSTATION",
    riskType: "ABNORMAL_ASSURED_BEHAVIOR",
    severity: "CRITICAL",
    score: 88,
    status: "ESCALATED",
    reason: "Mock rule: driver cancellation with elevated Assured Ride forfeiture.",
    signals: [
      {
        code: "DRIVER_CANCEL_FORFEIT",
        label: "Driver cancellation",
        detail: "Full passenger security forfeited",
      },
    ],
    detectedAt: "2026-09-20T01:31:00.000Z",
    reviewedAt: "2026-09-20T01:45:00.000Z",
    reviewedBy: "adm_001",
    resolution: null,
    metadata: { engine: "mock_rules_v1" },
    timeline: [
      {
        id: "risk_002_t1",
        label: "Detected",
        timestamp: "2026-09-20T01:31:00.000Z",
        actorId: "system",
      },
      {
        id: "risk_002_t2",
        label: "Escalated",
        timestamp: "2026-09-20T01:50:00.000Z",
        actorId: "adm_001",
      },
    ],
  },
  {
    id: "risk_003",
    rideId: "BW20021",
    assuredRideId: "ar_006",
    userId: "usr_004",
    driverId: "drv_07",
    networkType: "OUTSTATION",
    riskType: "COMPENSATION_PATTERN",
    severity: "WARNING",
    score: 65,
    status: "UNDER_REVIEW",
    reason: "Mock rule: compensation pattern involving disputed cancellation.",
    signals: [
      {
        code: "COMP_PATTERN",
        label: "Compensation pattern",
        detail: "Repeated compensation claims (mock)",
      },
    ],
    detectedAt: "2026-09-20T00:46:00.000Z",
    reviewedAt: "2026-09-20T01:00:00.000Z",
    reviewedBy: "adm_001",
    resolution: null,
    metadata: { engine: "mock_rules_v1" },
    timeline: [
      {
        id: "risk_003_t1",
        label: "Under review",
        timestamp: "2026-09-20T01:00:00.000Z",
        actorId: "adm_001",
      },
    ],
  },
  {
    id: "risk_004",
    rideId: "BW20014",
    assuredRideId: "ar_004",
    userId: "usr_008",
    driverId: "drv_05",
    networkType: "OUTSTATION",
    riskType: "FAST_CANCEL_AFTER_BOOKING",
    severity: "INFO",
    score: 40,
    status: "RESOLVED",
    reason: "Mock rule reviewed — no further action.",
    signals: [
      {
        code: "FAST_CANCEL",
        label: "Fast cancel",
        detail: "Single fast cancel — cleared",
      },
    ],
    detectedAt: "2026-09-19T16:05:00.000Z",
    reviewedAt: "2026-09-19T17:30:00.000Z",
    reviewedBy: "adm_001",
    resolution: "False positive cleared",
    metadata: { engine: "mock_rules_v1" },
    timeline: [
      {
        id: "risk_004_t1",
        label: "Resolved as false positive",
        timestamp: "2026-09-19T17:30:00.000Z",
        actorId: "adm_001",
      },
    ],
  },
  {
    id: "risk_005",
    rideId: "BW10302",
    assuredRideId: "ar_007",
    userId: "usr_004",
    driverId: "drv_02",
    networkType: "OFFICE",
    riskType: "SHARED_ACTOR_PATTERN",
    severity: "INFO",
    score: 35,
    status: "FALSE_POSITIVE",
    reason: "Mock low-risk shared actor pattern — marked false positive.",
    signals: [
      {
        code: "SHARED_ACTOR",
        label: "Shared actor",
        detail: "Same user across cancellations (mock)",
      },
    ],
    detectedAt: "2026-09-20T02:11:00.000Z",
    reviewedAt: "2026-09-20T02:30:00.000Z",
    reviewedBy: "adm_001",
    resolution: "False positive",
    metadata: { engine: "mock_rules_v1" },
    timeline: [
      {
        id: "risk_005_t1",
        label: "Marked false positive",
        timestamp: "2026-09-20T02:30:00.000Z",
        actorId: "adm_001",
      },
    ],
  },
];
