/**
 * Lightweight observability boundary.
 * Production: wire to structured logging / APM (Datadog, OpenTelemetry, etc.).
 * Do not log secrets, tokens, passwords, or raw PII.
 */

import type { NextRequest } from "next/server";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ServerLogEvent {
  level: LogLevel;
  category: string;
  message: string;
  requestId?: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
}

const SENSITIVE_KEY = /password|secret|token|authorization|cookie|api[_-]?key|credential|otp|aadhaar/i;

export function scrubMeta(
  meta?: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean | null | undefined> | undefined {
  if (!meta) return undefined;
  const out: Record<string, string | number | boolean | null | undefined> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : v;
  }
  return out;
}

export function createRequestId(request?: NextRequest): string {
  const incoming = request?.headers.get("x-request-id");
  if (incoming && /^[a-zA-Z0-9_-]{8,64}$/.test(incoming)) return incoming;
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function logServerEvent(event: ServerLogEvent): void {
  const payload = {
    ts: new Date().toISOString(),
    level: event.level,
    category: event.category,
    message: event.message,
    requestId: event.requestId,
    meta: scrubMeta(event.meta),
  };
  if (event.level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }
  if (event.level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(JSON.stringify(payload));
  }
}
