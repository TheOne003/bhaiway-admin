/**
 * Integer-paise money helpers. Never use floating-point for financial math.
 * ₹1 = 100 paise.
 */

export type MoneyPaise = number;

export function rupeesToPaise(rupees: number): MoneyPaise {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: MoneyPaise): number {
  if (!Number.isFinite(paise)) return 0;
  return paise / 100;
}

export function formatMoney(paise: MoneyPaise, currency = "INR"): string {
  const rupees = paiseToRupees(paise);
  if (currency === "INR") {
    return `₹${rupees.toLocaleString("en-IN", {
      minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${currency} ${rupees.toFixed(2)}`;
}

export function addMoney(a: MoneyPaise, b: MoneyPaise): MoneyPaise {
  return (Number.isFinite(a) ? a : 0) + (Number.isFinite(b) ? b : 0);
}

export function subtractMoney(a: MoneyPaise, b: MoneyPaise): MoneyPaise {
  return (Number.isFinite(a) ? a : 0) - (Number.isFinite(b) ? b : 0);
}

/** Clamp to non-negative paise (wallet available balance rule). */
export function nonNegativePaise(paise: MoneyPaise): MoneyPaise {
  if (!Number.isFinite(paise) || paise < 0) return 0;
  return Math.trunc(paise);
}

/** Percentage of amount in paise, rounded to nearest paise. */
export function percentOfPaise(amountPaise: MoneyPaise, percent: number): MoneyPaise {
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return 0;
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.round((amountPaise * percent) / 100);
}

/** Cap discount so it never exceeds max or the base amount. */
export function applyDiscountPaise(
  basePaise: MoneyPaise,
  discountPaise: MoneyPaise,
  maxDiscountPaise?: MoneyPaise | null,
): MoneyPaise {
  let d = Math.max(0, Math.trunc(discountPaise));
  if (maxDiscountPaise != null && Number.isFinite(maxDiscountPaise)) {
    d = Math.min(d, Math.max(0, Math.trunc(maxDiscountPaise)));
  }
  return Math.min(d, Math.max(0, Math.trunc(basePaise)));
}
