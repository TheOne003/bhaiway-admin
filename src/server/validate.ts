/**
 * Lightweight input validation helpers (no schema library dependency).
 * Frontend validation is UX only — always validate at API/service boundaries.
 */

export function isNonEmptyString(value: unknown, max = 500): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

export function isIntegerPaise(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
}

export function isPositiveIntegerPaise(value: unknown): value is number {
  return isIntegerPaise(value) && value > 0;
}

export function isIsoDateString(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

export function assertEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label = "value",
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`Invalid ${label}.`);
  }
  return value as T;
}

export function sanitizeId(value: unknown, label = "id"): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}
