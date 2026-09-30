/**
 * E2E credentials — Node/Playwright process only (not imported by Next client bundles).
 * Prefer ADMIN_* environment variables. Fallback is synthetic local/dev only.
 */
export const E2E_LOGIN = {
  loginId: process.env.ADMIN_LOGIN_ID ?? "admin",
  password: process.env.ADMIN_PASSWORD ?? "India@0192",
} as const;
