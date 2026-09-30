"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { permissionsService } from "@/services/permissions";
import type { PermissionId } from "@/types/permission";
import { AccessDenied } from "@/components/auth/AccessDenied";

interface PermissionGuardProps {
  permission: PermissionId;
  children: ReactNode;
  /** When true, show 403. When false, hide children. */
  fallback?: "deny" | "hide" | "disable";
  /** Optional override for tests */
  forceDenied?: boolean;
}

/**
 * Frontend UX permission gate ONLY.
 *
 * This component is NOT a production security boundary.
 * Server/API layers must enforce the same PermissionId values via
 * `requirePermission` / `requireAdminSession` in `src/server/authz.ts`.
 */
export function PermissionGuard({
  permission,
  children,
  fallback = "deny",
  forceDenied,
}: PermissionGuardProps) {
  const { session } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      async function run() {
        if (forceDenied) {
          if (!cancelled) setAllowed(false);
          return;
        }
        const adminId = session?.admin.id;
        if (!adminId) {
          if (!cancelled) setAllowed(false);
          return;
        }
        const ok = await permissionsService.hasPermission(adminId, permission);
        if (!cancelled) setAllowed(ok);
      }
      void run();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [session?.admin.id, permission, forceDenied]);

  if (allowed === null) {
    return (
      <div className="text-sm text-[var(--bw-text-muted)]" role="status">
        Checking access…
      </div>
    );
  }

  if (allowed) return <>{children}</>;

  if (fallback === "hide") return null;
  if (fallback === "disable") {
    return (
      <div aria-disabled="true" className="pointer-events-none opacity-50">
        {children}
      </div>
    );
  }
  return <AccessDenied permission={permission} />;
}

export function useHasPermission(permission: PermissionId): boolean | null {
  const { session } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      async function run() {
        const adminId = session?.admin.id;
        if (!adminId) {
          if (!cancelled) setAllowed(false);
          return;
        }
        const ok = await permissionsService.hasPermission(adminId, permission);
        if (!cancelled) setAllowed(ok);
      }
      void run();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [session?.admin.id, permission]);

  return allowed;
}
