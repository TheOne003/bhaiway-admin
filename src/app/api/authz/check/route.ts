/**
 * Example protected API surface for authorization contract tests.
 * Demonstrates requireAdminSession + requirePermission using canonical PermissionIds.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  authzErrorResponse,
  requirePermission,
} from "@/server/authz";
import { createRequestId } from "@/server/observability";
import type { PermissionId } from "@/types/permission";

export async function GET(request: NextRequest) {
  const requestId = createRequestId(request);
  try {
    const permission = (request.nextUrl.searchParams.get("permission") ??
      "dashboard.view") as PermissionId;
    const session = await requirePermission(request, permission);
    return NextResponse.json(
      {
        ok: true,
        adminId: session.adminId,
        permission,
        message: "Authorized.",
      },
      { status: 200, headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    const res = authzErrorResponse(error);
    res.headers.set("x-request-id", requestId);
    return res;
  }
}
