"use client";

import Link from "next/link";
import type { PermissionId } from "@/types/permission";

interface AccessDeniedProps {
  permission?: PermissionId;
  title?: string;
  message?: string;
}

export function AccessDenied({
  permission,
  title = "403 — Access Denied",
  message = "You do not have permission to view this page. Frontend checks are UX controls only; production authorization must be enforced by the backend.",
}: AccessDeniedProps) {
  return (
    <div
      className="mx-auto max-w-lg space-y-4 py-16 text-center"
      data-testid="access-denied"
      role="alert"
    >
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-[var(--bw-text-secondary)]">{message}</p>
      {permission ? (
        <p className="font-mono text-xs text-[var(--bw-text-muted)]">
          Required: {permission}
        </p>
      ) : null}
      <Link
        href="/dashboard"
        className="inline-flex text-sm font-medium text-[var(--bw-accent)] underline-offset-2 hover:underline"
        data-testid="access-denied-home"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
