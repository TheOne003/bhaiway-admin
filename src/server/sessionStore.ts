/**
 * Signed session tokens (HMAC).
 *
 * Opaque server Maps are NOT shared across Next.js proxy vs route workers,
 * so production-shaped auth uses a signed cookie payload instead.
 *
 * Production: prefer Redis/DB sessions or short-lived JWT + rotation + revocation list.
 */

import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { SINGLE_ADMIN } from "@/mock/auth";
import type { AdminRole, AdminUser } from "@/types/auth";

export interface ServerSession {
  token: string;
  adminId: string;
  admin: AdminUser;
  issuedAt: string;
  expiresAt: string;
  remember: boolean;
}

interface SessionPayload {
  adminId: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarInitials: string;
  issuedAt: string;
  expiresAt: string;
  remember: boolean;
  nonce: string;
}

/** Test-only revocation set (same process). Production needs shared store. */
const revoked = new Set<string>();

export function __resetServerSessionsForTests(): void {
  revoked.clear();
}

function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "dev-only-session-secret-change-me"
  );
}

function ttlMs(remember: boolean): number {
  return remember ? 14 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", sessionSecret()).update(payloadB64).digest("base64url");
}

function encodeToken(payload: SessionPayload): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

function decodeToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const raw = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!raw.adminId || !raw.issuedAt || !raw.expiresAt || !raw.name) return null;
    return raw;
  } catch {
    return null;
  }
}

function toAdmin(payload: SessionPayload): AdminUser {
  return {
    id: payload.adminId,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    avatarInitials: payload.avatarInitials,
  };
}

export function createServerSession(options: {
  admin?: AdminUser;
  remember?: boolean;
} = {}): ServerSession {
  const admin = options.admin ?? { ...SINGLE_ADMIN };
  const remember = Boolean(options.remember);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + ttlMs(remember));
  const payload: SessionPayload = {
    adminId: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    avatarInitials: admin.avatarInitials,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    remember,
    nonce: randomBytes(8).toString("hex"),
  };
  const token = encodeToken(payload);
  return {
    token,
    adminId: admin.id,
    admin: { ...admin },
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    remember,
  };
}

export function getServerSession(token: string | undefined | null): ServerSession | null {
  if (!token) return null;
  if (revoked.has(token)) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  if (new Date(payload.expiresAt).getTime() <= Date.now()) return null;
  const admin = toAdmin(payload);
  return {
    token,
    adminId: admin.id,
    admin,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    remember: payload.remember,
  };
}

export function destroyServerSession(token: string | undefined | null): void {
  if (!token) return;
  revoked.add(token);
}

export function touchServerSession(token: string): ServerSession | null {
  // Do not rotate/revoke on read — concurrent /api/auth/session calls would
  // invalidate each other. Extend TTL only via explicit re-login/refresh APIs.
  return getServerSession(token);
}

/** Constant-time string compare for secrets. */
export function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
