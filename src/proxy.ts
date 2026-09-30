import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/config/constants";
import { getServerSession } from "@/server/sessionStore";

/** Only explicitly public auth endpoints — do not open all /api/auth/*. */
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/session",
  "/api/auth/logout",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = getServerSession(token);
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!session && !isPublic && pathname !== "/") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, code: "unauthenticated", message: "Authentication required." },
        { status: 401 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("reason", "session_expired");
    return NextResponse.redirect(url);
  }

  if (session && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
