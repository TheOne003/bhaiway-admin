"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { Input } from "@/components/ui/Input";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import { permissionsService } from "@/services/permissions";
import type { AdminAccount, AdminAccountStatus, Role } from "@/types/permission";

function AdminsWorkspace() {
  const { session } = useAuth();
  const actor = {
    adminId: session?.admin.id ?? "admin",
    adminName: session?.admin.name ?? "BhaiWay Admin",
  };

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminAccount | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusPending, setStatusPending] = useState<{
    admin: AdminAccount;
    status: AdminAccountStatus;
  } | null>(null);

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) map.set(r.id, r.name);
    return map;
  }, [roles]);

  const load = useCallback(async (keepSelectedId?: string | null) => {
    setLoading(true);
    try {
      const [list, roleList] = await Promise.all([
        permissionsService.getAdmins(),
        permissionsService.getRoles(),
      ]);
      setAdmins(list);
      setRoles(roleList);
      setError(null);
      if (keepSelectedId) {
        const fresh = list.find((a) => a.id === keepSelectedId) ?? null;
        setSelected(fresh);
        if (fresh) setDisplayName(fresh.displayName);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load admins.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);
  function openDetail(admin: AdminAccount) {
    setSelected(admin);
    setDisplayName(admin.displayName);
    setEditing(false);
  }

  async function saveProfile() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await permissionsService.updateAdminProfile(
        selected.id,
        { displayName: displayName.trim() },
        actor,
      );
      setEditing(false);
      await load(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update profile.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmStatus(reason: string) {
    if (!statusPending) return;
    const id = statusPending.admin.id;
    setBusy(true);
    setError(null);
    try {
      await permissionsService.updateAdminStatus(
        id,
        statusPending.status,
        actor,
        reason,
      );
      setStatusPending(null);
      await load(selected?.id ?? id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to change admin status. Last active admin may be protected.",
      );
      setStatusPending(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading && admins.length === 0) {
    return <LoadingState label="Loading admin users…" />;
  }

  if (error && admins.length === 0) {
    return (
      <div className="max-w-xl space-y-3">
        <ErrorState title="Unable to load admins." message={error} />
        <Button variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="admin-users-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin users</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Single-admin mock directory. Profile metadata only — passwords are never shown.
        </p>
      </header>

      {error ? <ErrorState title="Admin action failed" message={error} /> : null}

      {admins.length === 0 ? (
        <EmptyState title="No admin accounts." description="No admins in the mock store." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--bw-border)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">Display name</th>
                <th className="px-3 py-2 font-medium">Roles</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Last login</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr
                  key={admin.id}
                  className="border-b border-[var(--bw-border)] last:border-0"
                  data-testid={`admin-row-${admin.id}`}
                >
                  <td className="px-3 py-3 font-mono text-xs">{admin.id}</td>
                  <td className="px-3 py-3 font-medium">{admin.displayName}</td>
                  <td className="px-3 py-3 text-[var(--bw-text-secondary)]">
                    {admin.roleIds
                      .map((id) => roleNameById.get(id) ?? id)
                      .join(", ")}
                  </td>
                  <td className="px-3 py-3">{admin.status}</td>
                  <td className="px-3 py-3 text-[var(--bw-text-secondary)]">
                    {admin.lastLoginAt
                      ? formatIstDateTime(new Date(admin.lastLoginAt))
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-[var(--bw-text-secondary)]">
                    {formatIstDateTime(new Date(admin.createdAt))}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openDetail(admin)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          openDetail(admin);
                          setEditing(true);
                        }}
                      >
                        Edit
                      </Button>
                      {admin.status === "ACTIVE" ? (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busy}
                          data-testid={`admin-deactivate-${admin.id}`}
                          onClick={() =>
                            setStatusPending({ admin, status: "DISABLED" })
                          }
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy}
                          data-testid={`admin-activate-${admin.id}`}
                          onClick={() =>
                            setStatusPending({ admin, status: "ACTIVE" })
                          }
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDrawer
        open={selected != null}
        title={selected?.displayName ?? "Admin"}
        onClose={() => {
          setSelected(null);
          setEditing(false);
        }}
      >
        {selected ? (
          <div className="space-y-4 text-sm">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">ID</dt>
                <dd className="font-mono">{selected.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Username</dt>
                <dd>{selected.username}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Email</dt>
                <dd>{selected.emailMasked}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Status</dt>
                <dd>{selected.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Roles</dt>
                <dd>
                  {selected.roleIds
                    .map((id) => roleNameById.get(id) ?? id)
                    .join(", ")}
                </dd>
              </div>
            </dl>

            {editing ? (
              <div className="space-y-3 border-t border-[var(--bw-border)] pt-4">
                <Input
                  label="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy || !displayName.trim()}
                    onClick={() => void saveProfile()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(false);
                      setDisplayName(selected.displayName);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                Edit profile
              </Button>
            )}
          </div>
        ) : null}
      </DetailDrawer>

      <ReasonConfirmDialog
        open={statusPending != null}
        title={
          statusPending?.status === "ACTIVE"
            ? "Activate admin"
            : "Deactivate admin"
        }
        description={
          statusPending?.status === "ACTIVE"
            ? `Activate ${statusPending?.admin.displayName}?`
            : `Deactivate ${statusPending?.admin.displayName}? The only active admin cannot be disabled.`
        }
        confirmLabel={statusPending?.status === "ACTIVE" ? "Activate" : "Deactivate"}
        danger={statusPending?.status !== "ACTIVE"}
        onCancel={() => setStatusPending(null)}
        onConfirm={(reason) => void confirmStatus(reason)}
      />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <PermissionGuard permission="admin_users.manage">
      <AdminsWorkspace />
    </PermissionGuard>
  );
}
