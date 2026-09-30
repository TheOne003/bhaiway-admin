import {
  calculateCompensationPoolPaise,
  calculateForfeiturePaise,
  calculatePassengerCompensation,
  calculatePerPassengerSecurityPaise,
  calculateSecurityAmountPaise,
  buildCompensationFromCase,
  toPaise,
} from "@/lib/assuredRideMath";
import { describe, expect, it } from "vitest";
import { evaluateMockRiskScore } from "@/services/risk";
import { nextSosStatus, canTransitionSos } from "@/services/safetyTransitions";

describe("assured ride calculations", () => {
  it("security amount is 5% of fare", () => {
    expect(calculateSecurityAmountPaise(toPaise(1000))).toBe(5000);
    expect(calculateSecurityAmountPaise(0)).toBe(0);
    expect(calculateSecurityAmountPaise(-10)).toBe(0);
  });

  it("compensation pool is 60% of forfeited security", () => {
    expect(calculateCompensationPoolPaise(5000)).toBe(3000);
    expect(calculateCompensationPoolPaise(0)).toBe(0);
  });

  it("distributes equally among eligible passengers with remainder to first", () => {
    // Spec example: 50 INR forfeit → 30 pool → 2 eligible → 15 each
    const pool = calculateCompensationPoolPaise(toPaise(50));
    expect(pool).toBe(3000);
    const alloc = calculatePassengerCompensation(pool, ["a", "b"]);
    expect(alloc).toEqual([
      { userId: "a", amountPaise: 1500 },
      { userId: "b", amountPaise: 1500 },
    ]);
  });

  it("handles zero eligible passengers", () => {
    expect(calculatePassengerCompensation(3000, [])).toEqual([]);
  });

  it("handles rider cancellation forfeiture", () => {
    const passengers = [
      { userId: "a", securityPaise: 1666, cancelled: false },
      { userId: "b", securityPaise: 1666, cancelled: true },
      { userId: "c", securityPaise: 1666, cancelled: false },
    ];
    expect(
      calculateForfeiturePaise({ cancellingParty: "RIDER", passengers }),
    ).toBe(1666);
    const built = buildCompensationFromCase({
      cancellingParty: "RIDER",
      passengers: passengers.map((p, i) => ({
        ...p,
        name: `P${i}`,
      })),
    });
    expect(built.compensationPoolPaise).toBe(Math.round(1666 * 0.6));
    expect(built.allocations).toHaveLength(2);
  });

  it("handles driver cancellation — all securities forfeited", () => {
    const passengers = [
      { userId: "a", name: "A", securityPaise: 2500, cancelled: false },
      { userId: "b", name: "B", securityPaise: 2500, cancelled: false },
    ];
    const built = buildCompensationFromCase({
      cancellingParty: "DRIVER",
      passengers,
    });
    expect(built.forfeitedPaise).toBe(5000);
    expect(built.compensationPoolPaise).toBe(3000);
    expect(built.allocations.every((a) => a.amountPaise === 1500)).toBe(true);
  });

  it("per-passenger security floors evenly", () => {
    expect(calculatePerPassengerSecurityPaise(toPaise(1000), 3)).toBe(
      Math.floor(5000 / 3),
    );
  });
});

describe("SOS transitions", () => {
  it("allows valid SOS transitions", () => {
    expect(canTransitionSos("TRIGGERED", "ACKNOWLEDGED")).toBe(true);
    expect(canTransitionSos("ACKNOWLEDGED", "RESPONDING")).toBe(true);
    expect(canTransitionSos("RESPONDING", "RESOLVED")).toBe(true);
    expect(canTransitionSos("TRIGGERED", "FALSE_ALARM")).toBe(true);
    expect(canTransitionSos("RESOLVED", "TRIGGERED")).toBe(false);
  });

  it("maps next status helpers", () => {
    expect(nextSosStatus("acknowledge")).toBe("ACKNOWLEDGED");
    expect(nextSosStatus("respond")).toBe("RESPONDING");
    expect(nextSosStatus("resolve")).toBe("RESOLVED");
    expect(nextSosStatus("false_alarm")).toBe("FALSE_ALARM");
  });
});

describe("mock risk rules", () => {
  it("scores deterministically", () => {
    expect(evaluateMockRiskScore([{ code: "REPEAT_CANCEL" }, { code: "FAST_CANCEL" }])).toBe(65);
    expect(evaluateMockRiskScore([])).toBe(20);
  });
});
