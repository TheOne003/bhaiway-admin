/**
 * Unit-test credentials — Vitest Node environment only.
 * Never import this module from client components or app UI.
 */
export const TEST_LOGIN = {
  loginId: process.env.ADMIN_LOGIN_ID ?? "admin",
  password: process.env.ADMIN_PASSWORD ?? "India@0192",
} as const;
