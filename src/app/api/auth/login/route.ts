import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminCredentials } from "@/server/adminCredentials";
import { createServerSession, safeEqualString } from "@/server/sessionStore";
import { applySessionCookie } from "@/server/sessionCookie";
import { checkRateLimit, loginRateLimitKey } from "@/server/rateLimit";
import { createRequestId, logServerEvent } from "@/server/observability";
import { isNonEmptyString } from "@/server/validate";

export async function POST(request: NextRequest) {
  const requestId = createRequestId(request);

  let body: { loginId?: string; email?: string; password?: string; remember?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_credentials", message: "Invalid request." },
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }

  const loginId = (body.loginId ?? body.email ?? "").trim();
  const password = typeof body.password === "string" ? body.password : "";
  const remember = Boolean(body.remember);

  if (!isNonEmptyString(loginId, 128) || !password || password.length > 256) {
    return NextResponse.json(
      {
        ok: false,
        requiresTwoFactor: false,
        reason: "invalid_credentials",
        message: "Invalid login ID or password.",
      },
      { status: 401, headers: { "x-request-id": requestId } },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const limit = checkRateLimit(loginRateLimitKey(ip, loginId), 100, 60_000);
  if (!limit.allowed) {
    logServerEvent({
      level: "warn",
      category: "auth",
      message: "Login rate limit exceeded",
      requestId,
      meta: { ip },
    });
    return NextResponse.json(
      {
        ok: false,
        requiresTwoFactor: false,
        reason: "unknown",
        message: "Too many login attempts. Try again shortly.",
      },
      {
        status: 429,
        headers: {
          "x-request-id": requestId,
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  const admin = verifyAdminCredentials(loginId, password);
  if (!admin) {
    void safeEqualString(password, password);
    logServerEvent({
      level: "info",
      category: "auth",
      message: "Login failed",
      requestId,
      meta: { loginId },
    });
    return NextResponse.json(
      {
        ok: false,
        requiresTwoFactor: false,
        reason: "invalid_credentials",
        message: "Invalid login ID or password.",
      },
      { status: 401, headers: { "x-request-id": requestId } },
    );
  }

  const session = createServerSession({ admin, remember });
  const response = NextResponse.json(
    {
      ok: true,
      requiresTwoFactor: false,
      admin: session.admin,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
      remember: session.remember,
    },
    { status: 200, headers: { "x-request-id": requestId } },
  );
  applySessionCookie(response, session.token, session.expiresAt);
  logServerEvent({
    level: "info",
    category: "auth",
    message: "Login success",
    requestId,
    meta: { adminId: admin.id },
  });
  return response;
}
