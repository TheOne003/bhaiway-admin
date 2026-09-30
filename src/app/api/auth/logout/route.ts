import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/config/constants";
import { destroyServerSession } from "@/server/sessionStore";
import { clearSessionCookieOn } from "@/server/sessionCookie";
import { createRequestId } from "@/server/observability";

export async function POST(request: NextRequest) {
  const requestId = createRequestId(request);
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? null;
  destroyServerSession(token);
  const response = NextResponse.json(
    { ok: true },
    { status: 200, headers: { "x-request-id": requestId } },
  );
  clearSessionCookieOn(response);
  return response;
}
