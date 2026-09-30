import { beforeEach, describe, expect, it } from "vitest";
import { authService } from "@/services/auth";
import { TEST_LOGIN } from "@/test/credentials";
import { __resetPermissionsForTests } from "@/services/permissions";

describe("authService", () => {
  beforeEach(async () => {
    __resetPermissionsForTests();
    await authService.logout();
  });

  it("rejects invalid credentials", async () => {
    const result = await authService.login({
      loginId: "admin",
      password: "wrong-password",
    });
    expect(result.ok).toBe(false);
    if (!result.ok && !result.requiresTwoFactor) {
      expect(result.reason).toBe("invalid_credentials");
    }
  });

  it("accepts valid single-admin credentials", async () => {
    const result = await authService.login({
      loginId: TEST_LOGIN.loginId,
      password: TEST_LOGIN.password,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.admin.id).toBe("admin");
      expect(result.session.token).toBeTruthy();
    }
  });

  it("persists session after login", async () => {
    await authService.login({
      loginId: TEST_LOGIN.loginId,
      password: TEST_LOGIN.password,
    });
    const session = await authService.getSession();
    expect(session?.admin.id).toBe("admin");
  });

  it("never returns password in session", async () => {
    const result = await authService.login({
      loginId: TEST_LOGIN.loginId,
      password: TEST_LOGIN.password,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.stringify(result.session)).not.toMatch(/password/i);
      expect(JSON.stringify(result.session)).not.toContain(TEST_LOGIN.password);
    }
  });
});
