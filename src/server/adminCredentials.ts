/**
 * Timing-safe credential verification (server-only).
 */

import "server-only";

import { SINGLE_ADMIN } from "@/mock/auth";
import type { AdminUser } from "@/types/auth";
import { safeEqualString } from "@/server/sessionStore";

function expectedLoginId(): string {
  return (process.env.ADMIN_LOGIN_ID ?? "admin").trim().toLowerCase();
}

function expectedPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

/**
 * Validates temporary single-admin credentials.
 * Password must come from environment — never from UI or client bundles.
 */
export function verifyAdminCredentials(
  loginId: string,
  password: string,
): AdminUser | null {
  const id = loginId.trim().toLowerCase();
  const expectedId = expectedLoginId();
  const expectedPw = expectedPassword();
  if (!expectedPw) return null;
  const idOk = safeEqualString(id, expectedId);
  const pwOk = safeEqualString(password, expectedPw);
  if (!idOk || !pwOk) return null;
  return { ...SINGLE_ADMIN };
}

export function getAdminPublicProfile(): AdminUser {
  return { ...SINGLE_ADMIN };
}
