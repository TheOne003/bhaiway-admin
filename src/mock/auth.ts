import type { AdminUser } from "@/types/auth";

/** Public admin profile — never includes password. */
export const SINGLE_ADMIN: AdminUser = {
  id: "admin",
  email: "admin@bhaiway.local",
  name: "BhaiWay Admin",
  role: "super_admin",
  avatarInitials: "BA",
};

/** Public admin directory — no passwords. Single active login account. */
export const MOCK_ADMIN_DIRECTORY: AdminUser[] = [SINGLE_ADMIN];

/** @deprecated Prefer MOCK_ADMIN_DIRECTORY */
export const MOCK_ADMINS = MOCK_ADMIN_DIRECTORY;

export const MOCK_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const MOCK_SESSION_REMEMBER_TTL_MS = 14 * 24 * 60 * 60 * 1000;
