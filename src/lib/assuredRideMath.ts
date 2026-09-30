/**
 * Assured Ride monetary calculations — integer paise only.
 * Security = 5% of fare. Compensation pool = 60% of forfeited security,
 * split equally among eligible non-cancelling passengers.
 */

export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) return 0;
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

export function formatInrFromPaise(paise: number): string {
  const rupees = fromPaise(paise);
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Security amount = 5% of total fare (paise). */
export function calculateSecurityAmountPaise(farePaise: number): number {
  if (!Number.isFinite(farePaise) || farePaise <= 0) return 0;
  return Math.round(farePaise * 0.05);
}

/** Per-passenger security when fare is shared equally (deterministic). */
export function calculatePerPassengerSecurityPaise(
  farePaise: number,
  passengerCount: number,
): number {
  if (passengerCount <= 0) return 0;
  const total = calculateSecurityAmountPaise(farePaise);
  return Math.floor(total / passengerCount);
}

export function calculateCompensationPoolPaise(forfeitedPaise: number): number {
  if (!Number.isFinite(forfeitedPaise) || forfeitedPaise <= 0) return 0;
  return Math.round(forfeitedPaise * 0.6);
}

export interface CompensationAllocation {
  userId: string;
  amountPaise: number;
}

/**
 * Distribute compensation pool equally among eligible passengers.
 * Remainder paise goes to the first eligible passenger (deterministic).
 */
export function calculatePassengerCompensation(
  compensationPoolPaise: number,
  eligibleUserIds: string[],
): CompensationAllocation[] {
  if (eligibleUserIds.length === 0 || compensationPoolPaise <= 0) {
    return eligibleUserIds.map((userId) => ({ userId, amountPaise: 0 }));
  }
  const base = Math.floor(compensationPoolPaise / eligibleUserIds.length);
  let remainder = compensationPoolPaise - base * eligibleUserIds.length;
  return eligibleUserIds.map((userId) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return { userId, amountPaise: base + extra };
  });
}

export function calculateForfeiturePaise(input: {
  cancellingParty: "DRIVER" | "RIDER" | "NONE";
  passengers: { userId: string; securityPaise: number; cancelled: boolean }[];
}): number {
  if (input.cancellingParty === "NONE") return 0;
  if (input.cancellingParty === "DRIVER") {
    return input.passengers.reduce((sum, p) => sum + p.securityPaise, 0);
  }
  return input.passengers
    .filter((p) => p.cancelled)
    .reduce((sum, p) => sum + p.securityPaise, 0);
}

export function buildCompensationFromCase(input: {
  cancellingParty: "DRIVER" | "RIDER" | "NONE";
  passengers: {
    userId: string;
    name: string;
    securityPaise: number;
    cancelled: boolean;
  }[];
}): {
  forfeitedPaise: number;
  compensationPoolPaise: number;
  allocations: { userId: string; name: string; amountPaise: number }[];
} {
  const forfeitedPaise = calculateForfeiturePaise(input);
  const compensationPoolPaise = calculateCompensationPoolPaise(forfeitedPaise);
  const eligible =
    input.cancellingParty === "DRIVER"
      ? input.passengers
      : input.passengers.filter((p) => !p.cancelled);
  const amounts = calculatePassengerCompensation(
    compensationPoolPaise,
    eligible.map((p) => p.userId),
  );
  const nameById = new Map(input.passengers.map((p) => [p.userId, p.name]));
  return {
    forfeitedPaise,
    compensationPoolPaise,
    allocations: amounts.map((a) => ({
      userId: a.userId,
      name: nameById.get(a.userId) ?? a.userId,
      amountPaise: a.amountPaise,
    })),
  };
}
