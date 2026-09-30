export type PermissionId =
  | "dashboard.view"
  | "users.view"
  | "users.update_status"
  | "drivers.view"
  | "drivers.update_status"
  | "verification.view"
  | "verification.review"
  | "rides.view"
  | "rides.manage"
  | "safety.view"
  | "safety.manage_sos"
  | "safety.manage_incidents"
  | "assured.view"
  | "assured.manage"
  | "wallet.view"
  | "transactions.view"
  | "refunds.manage"
  | "credits.manage"
  | "coupons.manage"
  | "referrals.view"
  | "notifications.view"
  | "notifications.send"
  | "templates.manage"
  | "automations.manage"
  | "campaigns.manage"
  | "support.view"
  | "support.manage"
  | "vehicles.view"
  | "vehicles.manage"
  | "fare.view"
  | "fare.manage"
  | "analytics.view"
  | "reports.view"
  | "system.health.view"
  | "system.alerts.manage"
  | "admin_users.manage"
  | "roles.manage"
  | "permissions.view"
  | "audit.view"
  | "platform_settings.manage";

export type PermissionDomain =
  | "Command Center"
  | "People"
  | "Mobility"
  | "Safety"
  | "Assured Ride"
  | "Money"
  | "Growth"
  | "Communication"
  | "Customer Operations"
  | "Insights"
  | "System"
  | "Settings";

export interface Permission {
  id: PermissionId;
  label: string;
  domain: PermissionDomain;
  description: string;
}

export type RoleStatus = "ACTIVE" | "DISABLED";

export interface Role {
  id: string;
  name: string;
  description: string;
  permissionIds: PermissionId[];
  status: RoleStatus;
  createdAt: string;
  updatedAt: string;
}

export type AdminAccountStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";

export interface AdminAccount {
  id: string;
  username: string;
  displayName: string;
  emailMasked: string;
  status: AdminAccountStatus;
  roleIds: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
