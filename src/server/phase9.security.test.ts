import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  createServerSession,
  destroyServerSession,
  getServerSession,
  __resetServerSessionsForTests,
  safeEqualString,
} from "@/server/sessionStore";
import { verifyAdminCredentials } from "@/server/adminCredentials";
import {
  checkRateLimit,
  __resetRateLimitForTests,
  loginRateLimitKey,
} from "@/server/rateLimit";
import {
  requireAdminSession,
  requirePermission,
  AuthzError,
} from "@/server/authz";
import { scrubMeta } from "@/server/observability";
import {
  isIntegerPaise,
  isPositiveIntegerPaise,
  sanitizeId,
  assertEnum,
} from "@/server/validate";
import { __resetPermissionsForTests } from "@/services/permissions";
import { SESSION_COOKIE } from "@/config/constants";
import { TEST_LOGIN } from "@/test/credentials";

function req(path: string, token?: string) {
  const headers = new Headers();
  if (token) headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

describe("Phase 9 security boundaries", () => {
  beforeEach(() => {
    __resetServerSessionsForTests();
    __resetRateLimitForTests();
    __resetPermissionsForTests();
    process.env.ADMIN_LOGIN_ID = TEST_LOGIN.loginId;
    process.env.ADMIN_PASSWORD = TEST_LOGIN.password;
  });

  it("verifies credentials without returning secrets", () => {
    const ok = verifyAdminCredentials(TEST_LOGIN.loginId, TEST_LOGIN.password);
    expect(ok?.id).toBe("admin");
    expect(JSON.stringify(ok)).not.toMatch(/password/i);
    expect(verifyAdminCredentials(TEST_LOGIN.loginId, "wrong")).toBeNull();
  });

  it("uses timing-safe compare helper", () => {
    expect(safeEqualString("abc", "abc")).toBe(true);
    expect(safeEqualString("abc", "abd")).toBe(false);
    expect(safeEqualString("a", "ab")).toBe(false);
  });

  it("creates opaque server sessions and rejects missing/expired", () => {
    const session = createServerSession({ remember: false });
    expect(session.token.includes(".")).toBe(true);
    expect(getServerSession(session.token)?.adminId).toBe("admin");
    destroyServerSession(session.token);
    expect(getServerSession(session.token)).toBeNull();
    expect(getServerSession("forged_token")).toBeNull();
  });

  it("rate limits repeated login attempts", () => {
    const key = loginRateLimitKey("127.0.0.1", "admin");
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit(key, 20, 60_000).allowed).toBe(true);
    }
    expect(checkRateLimit(key, 20, 60_000).allowed).toBe(false);
  });

  it("requireAdminSession and requirePermission enforce authz", async () => {
    await expect(requireAdminSession(req("/api/authz/check"))).rejects.toBeInstanceOf(
      AuthzError,
    );

    const session = createServerSession();
    const authed = await requireAdminSession(req("/api/authz/check", session.token));
    expect(authed.adminId).toBe("admin");

    const allowed = await requirePermission(
      req("/api/authz/check", session.token),
      "dashboard.view",
    );
    expect(allowed.adminId).toBe("admin");

    // Unknown adminId has no roles/permissions → forbidden
    const analystSession = createServerSession({
      admin: {
        id: "analyst_mock",
        email: "analyst@bhaiway.local",
        name: "Analyst",
        role: "viewer",
        avatarInitials: "AN",
      },
    });
    await expect(
      requirePermission(req("/api/authz/check", analystSession.token), "wallet.view"),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("scrubs sensitive observability meta", () => {
    expect(
      scrubMeta({ password: "x", token: "y", adminId: "admin" }),
    ).toEqual({ password: "[redacted]", token: "[redacted]", adminId: "admin" });
  });

  it("validates money and ids", () => {
    expect(isIntegerPaise(100)).toBe(true);
    expect(isIntegerPaise(10.5)).toBe(false);
    expect(isPositiveIntegerPaise(0)).toBe(false);
    expect(sanitizeId("usr_001")).toBe("usr_001");
    expect(() => sanitizeId("../etc/passwd")).toThrow();
    expect(assertEnum("ACTIVE", ["ACTIVE", "DISABLED"] as const, "status")).toBe("ACTIVE");
    expect(() => assertEnum("NOPE", ["ACTIVE"] as const, "status")).toThrow();
  });
});
