"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PermissionMatrix } from "@/components/settings/PermissionMatrix";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useAuth } from "@/providers/AuthProvider";
import { permissionsService } from "@/services/permissions";
import type { Permission, PermissionId, Role } from "@/types/permission";

function RolesWorkspace() {
  const { session } = useAuth();
  const actor = {
    adminId: session?.admin.id ?? "admin",
    adminName: session?.admin.name ?? "BhaiWay Admin",
  };

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftPerms, setDraftPerms] = useState<PermissionId[]>([]);
  const [pendingToggle, setPendingToggle] = useState<{
    permissionId: PermissionId;
    nextChecked: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => roles.find((r) => r.id === selectedId) ?? null,
    [roles, selectedId],
  );

  const load = useCallback(async (keepSelectedId?: string | null) => {
    setLoading(true);
    try {
      const [roleList, permList] = await Promise.all([
        permissionsService.getRoles(),
        permissionsService.getPermissions(),
      ]);
      setRoles(roleList);
      setPermissions(permList);
      const nextCounts: Record<string, number> = {};
      await Promise.all(
        roleList.map(async (r) => {
          nextCounts[r.id] = await permissionsService.countAdminsForRole(r.id);
        }),
      );
      setCounts(nextCounts);
      setError(null);
      if (keepSelectedId) {
        const fresh = roleList.find((r) => r.id === keepSelectedId);
        if (fresh) setDraftPerms([...fresh.permissionIds]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);
  function openRole(role: Role) {
    setSelectedId(role.id);
    setDraftPerms([...role.permissionIds]);
  }

  function requestToggle(permissionId: PermissionId, nextChecked: boolean) {
    setPendingToggle({ permissionId, nextChecked });
  }

  async function confirmToggle(reason: string) {
    if (!selected || !pendingToggle) return;
    const next = pendingToggle.nextChecked
      ? [...new Set([...draftPerms, pendingToggle.permissionId])]
      : draftPerms.filter((id) => id !== pendingToggle.permissionId);

    setBusy(true);
    setError(null);
    try {
      const updated = await permissionsService.updateRolePermissions(
        selected.id,
        next,
        actor,
        reason,
      );
      setDraftPerms([...updated.permissionIds]);
      setPendingToggle(null);
      await load(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update permissions.");
      setPendingToggle(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading && roles.length === 0) {
    return <LoadingState label="Loading roles…" />;
  }

  if (error && roles.length === 0) {
    return (
      <div className="max-w-xl space-y-3">
        <ErrorState title="Unable to load roles." message={error} />
        <Button variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="roles-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Roles & permissions</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Role catalog and permission matrix. Critical admin access is protected for the only
          active admin.
        </p>
      </header>

      {error ? <ErrorState title="Roles error" message={error} /> : null}

      {roles.length === 0 ? (
        <EmptyState title="No roles." description="Role catalog is empty." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--bw-border)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Permissions</th>
                <th className="px-3 py-2 font-medium">Admins</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr
                  key={role.id}
                  className="border-b border-[var(--bw-border)] last:border-0"
                >
                  <td className="px-3 py-3 font-medium">{role.name}</td>
                  <td className="max-w-xs px-3 py-3 text-[var(--bw-text-secondary)]">
                    {role.description}
                  </td>
                  <td className="px-3 py-3">{role.status}</td>
                  <td className="px-3 py-3 tabular-nums">{role.permissionIds.length}</td>
                  <td className="px-3 py-3 tabular-nums">{counts[role.id] ?? 0}</td>
                  <td className="px-3 py-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      data-testid={`role-open-${role.id}`}
                      onClick={() => openRole(role)}
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDrawer
        open={selected != null}
        title={selected?.name ?? "Role"}
        onClose={() => setSelectedId(null)}
        className="max-w-lg"
      >
        {selected ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--bw-text-secondary)]">{selected.description}</p>
            <p className="text-xs text-[var(--bw-text-muted)]">
              Status: {selected.status} · Assigned admins: {counts[selected.id] ?? 0}
            </p>
            <PermissionMatrix
              permissions={permissions}
              selectedIds={draftPerms}
              disabled={busy || selected.status !== "ACTIVE"}
              onToggle={requestToggle}
            />
          </div>
        ) : null}
      </DetailDrawer>

      <ReasonConfirmDialog
        open={pendingToggle != null}
        title={
          pendingToggle?.nextChecked ? "Grant permission" : "Revoke permission"
        }
        description={
          pendingToggle
            ? `${pendingToggle.nextChecked ? "Grant" : "Revoke"} ${pendingToggle.permissionId} on role ${selected?.name ?? ""}?`
            : ""
        }
        confirmLabel={pendingToggle?.nextChecked ? "Grant" : "Revoke"}
        danger={!pendingToggle?.nextChecked}
        onCancel={() => setPendingToggle(null)}
        onConfirm={(reason) => void confirmToggle(reason)}
      />
    </div>
  );
}

export default function RolesPage() {
  return (
    <PermissionGuard permission="roles.manage">
      <RolesWorkspace />
    </PermissionGuard>
  );
}
