import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/config/constants";
import { getServerSession, touchServerSession } from "@/server/sessionStore";
import { applySessionCookie, clearSessionCookieOn } from "@/server/sessionCookie";
import { createRequestId } from "@/server/observability";

export async function GET(request: NextRequest) {
  const requestId = createRequestId(request);
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? null;
  const session = getServerSession(token);
  if (!session) {
    const response = NextResponse.json(
      { ok: false, session: null },
      { status: 401, headers: { "x-request-id": requestId } },
    );
    clearSessionCookieOn(response);
    return response;
  }

  const refreshed = touchServerSession(session.token) ?? session;
  const response = NextResponse.json(
    {
      ok: true,
      session: {
        admin: refreshed.admin,
        issuedAt: refreshed.issuedAt,
        expiresAt: refreshed.expiresAt,
        remember: refreshed.remember,
      },
    },
    { status: 200, headers: { "x-request-id": requestId } },
  );
  applySessionCookie(response, refreshed.token, refreshed.expiresAt);
  return response;
}
