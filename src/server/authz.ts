/**
 * Server-side authorization helpers.
 *
 * IMPORTANT: Frontend PermissionGuard is UX only.
 * Production security requires these (or equivalent) checks on every mutation API.
 * Canonical permission IDs live in src/types/permission.ts — do not fork a second catalog.
 */

import "server-only";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/config/constants";
import { permissionsService } from "@/services/permissions";
import { getServerSession, type ServerSession } from "@/server/sessionStore";
import type { PermissionId } from "@/types/permission";
import { createRequestId, logServerEvent } from "@/server/observability";

export class AuthzError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function readSessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export async function requireAdminSession(
  request: NextRequest,
): Promise<ServerSession> {
  const requestId = createRequestId(request);
  const token = readSessionToken(request);
  const session = getServerSession(token);
  if (!session) {
    logServerEvent({
      level: "warn",
      category: "auth",
      message: "Unauthorized — missing or expired session",
      requestId,
    });
    throw new AuthzError("Authentication required.", 401, "unauthenticated");
  }
  return session;
}

export async function requirePermission(
  request: NextRequest,
  permission: PermissionId,
): Promise<ServerSession> {
  const session = await requireAdminSession(request);
  const allowed = await permissionsService.hasPermission(session.adminId, permission);
  if (!allowed) {
    logServerEvent({
      level: "warn",
      category: "authz",
      message: "Forbidden — missing permission",
      requestId: createRequestId(request),
      meta: { adminId: session.adminId, permission },
    });
    throw new AuthzError("Forbidden.", 403, "forbidden");
  }
  return session;
}

export async function requireAnyPermission(
  request: NextRequest,
  permissions: PermissionId[],
): Promise<ServerSession> {
  const session = await requireAdminSession(request);
  for (const permission of permissions) {
    if (await permissionsService.hasPermission(session.adminId, permission)) {
      return session;
    }
  }
  throw new AuthzError("Forbidden.", 403, "forbidden");
}

export async function requireAllPermissions(
  request: NextRequest,
  permissions: PermissionId[],
): Promise<ServerSession> {
  const session = await requireAdminSession(request);
  for (const permission of permissions) {
    if (!(await permissionsService.hasPermission(session.adminId, permission))) {
      throw new AuthzError("Forbidden.", 403, "forbidden");
    }
  }
  return session;
}

export function authzErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthzError) {
    return NextResponse.json(
      { ok: false, code: error.code, message: error.message },
      { status: error.status },
    );
  }
  logServerEvent({
    level: "error",
    category: "api",
    message: "Unhandled authorization path error",
  });
  return NextResponse.json(
    { ok: false, code: "unknown", message: "Unable to process request." },
    { status: 500 },
  );
}
