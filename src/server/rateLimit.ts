/**
 * Rate limiting boundary.
 *
 * In-memory limiter is suitable for single-process local/dev only.
 * Production MUST use a shared store (Redis / edge gateway / WAF) so limits
 * work across multiple instances.
 */

import "server-only";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function __resetRateLimitForTests(): void {
  buckets.clear();
}

/**
 * Fixed-window counter. Not production-grade multi-instance protection.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: 0,
  };
}

export function loginRateLimitKey(ip: string, loginId: string): string {
  return `login:${ip}:${loginId.trim().toLowerCase() || "unknown"}`;
}
