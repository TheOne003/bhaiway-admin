import {
  ALL_PERMISSION_IDS,
  MOCK_ADMIN_ACCOUNTS,
  MOCK_ROLES,
  PERMISSION_CATALOG,
} from "@/mock/permissions";
import { auditService } from "@/services/audit";
import { emitAdminRealtime } from "@/services/realtimeBridge";
import type {
  AdminAccount,
  AdminAccountStatus,
  Permission,
  PermissionId,
  Role,
} from "@/types/permission";

let roles: Role[] = structuredClone(MOCK_ROLES);
let admins: AdminAccount[] = structuredClone(MOCK_ADMIN_ACCOUNTS);
let forceError = false;

export function __resetPermissionsForTests(): void {
  roles = structuredClone(MOCK_ROLES);
  admins = structuredClone(MOCK_ADMIN_ACCOUNTS);
  forceError = false;
}

export function __setPermissionsErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

const CRITICAL_ADMIN_PERMS: PermissionId[] = [
  "admin_users.manage",
  "roles.manage",
  "platform_settings.manage",
];

function activeAdmins(): AdminAccount[] {
  return admins.filter((a) => a.status === "ACTIVE");
}

function roleById(id: string): Role | undefined {
  return roles.find((r) => r.id === id);
}

export function getAdminPermissionIds(admin: AdminAccount): PermissionId[] {
  const set = new Set<PermissionId>();
  for (const roleId of admin.roleIds) {
    const role = roleById(roleId);
    if (!role || role.status !== "ACTIVE") continue;
    for (const p of role.permissionIds) set.add(p);
  }
  return [...set];
}

function assertCanChangeAdminAccess(adminId: string, next: AdminAccount): void {
  const onlyActive = activeAdmins();
  const isOnly =
    onlyActive.length === 1 && onlyActive[0]?.id === adminId && next.id === adminId;

  if (isOnly) {
    if (next.status !== "ACTIVE") {
      throw new Error("Cannot disable or suspend the only active admin.");
    }
    if (next.roleIds.length === 0) {
      throw new Error("Cannot remove all roles from the only active admin.");
    }
    const perms = getAdminPermissionIds(next);
    for (const required of CRITICAL_ADMIN_PERMS) {
      if (!perms.includes(required)) {
        throw new Error(
          `Cannot remove last administrative access (${required}) from the only active admin.`,
        );
      }
    }
  }
}

export const permissionsService = {
  async getPermissions(): Promise<Permission[]> {
    if (forceError) throw new Error("Unable to load permissions.");
    return structuredClone(PERMISSION_CATALOG);
  },

  async getRoles(): Promise<Role[]> {
    if (forceError) throw new Error("Unable to load roles.");
    return structuredClone(roles);
  },

  async getRoleById(id: string): Promise<Role | null> {
    return structuredClone(roleById(id) ?? null);
  },

  async getAdmins(): Promise<AdminAccount[]> {
    if (forceError) throw new Error("Unable to load admins.");
    return structuredClone(admins);
  },

  async getAdminById(id: string): Promise<AdminAccount | null> {
    return structuredClone(admins.find((a) => a.id === id) ?? null);
  },

  async getAdminPermissions(adminId: string): Promise<PermissionId[]> {
    const admin = admins.find((a) => a.id === adminId);
    if (!admin) return [];
    return getAdminPermissionIds(admin);
  },

  async hasPermission(adminId: string, permission: PermissionId): Promise<boolean> {
    const perms = await this.getAdminPermissions(adminId);
    return perms.includes(permission);
  },

  async updateAdminProfile(
    adminId: string,
    patch: Partial<Pick<AdminAccount, "displayName" | "emailMasked">>,
    actor: { adminId: string; adminName: string },
  ): Promise<AdminAccount> {
    const admin = admins.find((a) => a.id === adminId);
    if (!admin) throw new Error("Admin not found.");
    const old = structuredClone(admin);
    if (patch.displayName != null) admin.displayName = patch.displayName;
    if (patch.emailMasked != null) admin.emailMasked = patch.emailMasked;
    admin.updatedAt = new Date().toISOString();
    await auditService.record({
      adminId: actor.adminId,
      adminName: actor.adminName,
      action: "admin.profile_updated",
      targetType: "admin",
      targetId: adminId,
      oldValue: { displayName: old.displayName, emailMasked: old.emailMasked },
      newValue: { displayName: admin.displayName, emailMasked: admin.emailMasked },
      reason: "Profile metadata update",
    });
    emitAdminRealtime("admin.status_changed", {
      adminId,
      previousStatus: old.status,
      newStatus: admin.status,
      timestamp: admin.updatedAt,
    });
    return structuredClone(admin);
  },

  async updateAdminStatus(
    adminId: string,
    status: AdminAccountStatus,
    actor: { adminId: string; adminName: string },
    reason: string,
  ): Promise<AdminAccount> {
    const admin = admins.find((a) => a.id === adminId);
    if (!admin) throw new Error("Admin not found.");
    const next = { ...admin, status, updatedAt: new Date().toISOString() };
    assertCanChangeAdminAccess(adminId, next);
    const previous = admin.status;
    admin.status = status;
    admin.updatedAt = next.updatedAt;
    await auditService.record({
      adminId: actor.adminId,
      adminName: actor.adminName,
      action: "admin.status_changed",
      targetType: "admin",
      targetId: adminId,
      oldValue: { status: previous },
      newValue: { status },
      reason,
    });
    emitAdminRealtime("admin.status_changed", {
      adminId,
      previousStatus: previous,
      newStatus: status,
      timestamp: admin.updatedAt,
    });
    return structuredClone(admin);
  },

  async assignRole(
    adminId: string,
    roleId: string,
    actor: { adminId: string; adminName: string },
  ): Promise<AdminAccount> {
    const admin = admins.find((a) => a.id === adminId);
    if (!admin) throw new Error("Admin not found.");
    if (!roleById(roleId)) throw new Error("Role not found.");
    if (!admin.roleIds.includes(roleId)) {
      admin.roleIds = [...admin.roleIds, roleId];
      admin.updatedAt = new Date().toISOString();
    }
    await auditService.record({
      adminId: actor.adminId,
      adminName: actor.adminName,
      action: "admin.role_assigned",
      targetType: "admin",
      targetId: adminId,
      newValue: { roleId },
      reason: "Role assigned",
    });
    emitAdminRealtime("admin.role_updated", {
      adminId,
      roleIds: admin.roleIds,
      timestamp: admin.updatedAt,
    });
    return structuredClone(admin);
  },

  async removeRole(
    adminId: string,
    roleId: string,
    actor: { adminId: string; adminName: string },
  ): Promise<AdminAccount> {
    const admin = admins.find((a) => a.id === adminId);
    if (!admin) throw new Error("Admin not found.");
    const next: AdminAccount = {
      ...admin,
      roleIds: admin.roleIds.filter((id) => id !== roleId),
      updatedAt: new Date().toISOString(),
    };
    assertCanChangeAdminAccess(adminId, next);
    admin.roleIds = next.roleIds;
    admin.updatedAt = next.updatedAt;
    await auditService.record({
      adminId: actor.adminId,
      adminName: actor.adminName,
      action: "admin.role_removed",
      targetType: "admin",
      targetId: adminId,
      oldValue: { roleId },
      reason: "Role removed",
    });
    emitAdminRealtime("admin.role_updated", {
      adminId,
      roleIds: admin.roleIds,
      timestamp: admin.updatedAt,
    });
    return structuredClone(admin);
  },

  async updateRolePermissions(
    roleId: string,
    permissionIds: PermissionId[],
    actor: { adminId: string; adminName: string },
    reason: string,
  ): Promise<Role> {
    const role = roleById(roleId);
    if (!role) throw new Error("Role not found.");
    const unique = [...new Set(permissionIds)].filter((id) =>
      ALL_PERMISSION_IDS.includes(id),
    );

    // If this role is the only path for the only admin's critical perms, protect.
    for (const admin of activeAdmins()) {
      if (!admin.roleIds.includes(roleId)) continue;
      const simulated: AdminAccount = {
        ...admin,
        roleIds: admin.roleIds,
      };
      const otherPerms = new Set<PermissionId>();
      for (const rid of admin.roleIds) {
        if (rid === roleId) continue;
        const r = roleById(rid);
        if (r?.status === "ACTIVE") r.permissionIds.forEach((p) => otherPerms.add(p));
      }
      unique.forEach((p) => otherPerms.add(p));
      const nextAdmin: AdminAccount = { ...simulated, roleIds: admin.roleIds };
      // Temporarily evaluate via role mutation preview
      const previewRole = { ...role, permissionIds: unique };
      const previewPerms = new Set<PermissionId>(otherPerms);
      if (previewRole.status === "ACTIVE") {
        // replace: otherPerms already has other roles; add unique
      }
      const only = activeAdmins().length === 1 && activeAdmins()[0]?.id === admin.id;
      if (only) {
        for (const required of CRITICAL_ADMIN_PERMS) {
          const has =
            unique.includes(required) ||
            admin.roleIds.some((rid) => {
              if (rid === roleId) return false;
              return roleById(rid)?.permissionIds.includes(required) ?? false;
            });
          if (!has) {
            throw new Error(
              `Cannot remove last administrative access (${required}) from the only active admin.`,
            );
          }
        }
      }
      void nextAdmin;
      void previewPerms;
    }

    const old = [...role.permissionIds];
    role.permissionIds = unique;
    role.updatedAt = new Date().toISOString();
    await auditService.record({
      adminId: actor.adminId,
      adminName: actor.adminName,
      action: "role.permissions_updated",
      targetType: "role",
      targetId: roleId,
      oldValue: { permissionIds: old },
      newValue: { permissionIds: unique },
      reason,
    });
    emitAdminRealtime("admin.permission_updated", {
      roleId,
      permissionIds: unique,
      timestamp: role.updatedAt,
    });
    return structuredClone(role);
  },

  async countAdminsForRole(roleId: string): Promise<number> {
    return admins.filter((a) => a.roleIds.includes(roleId)).length;
  },
};

export type PermissionsService = typeof permissionsService;
