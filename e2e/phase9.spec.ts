import { expect, test } from "@playwright/test";
import { E2E_LOGIN } from "./credentials";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(E2E_LOGIN.loginId);
  await page.getByLabel("Password", { exact: true }).fill(E2E_LOGIN.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 20_000 });
}

test.describe("Phase 9 hardening", () => {
  test("login sets session and protected API requires auth", async ({ page, request }) => {
    const unauth = await request.get("/api/authz/check?permission=dashboard.view");
    expect(unauth.status()).toBe(401);

    await login(page);

    const authed = await page.request.get("/api/authz/check?permission=dashboard.view");
    expect(authed.status()).toBe(200);
    const body = await authed.json();
    expect(body.ok).toBe(true);
    expect(body.adminId).toBe("admin");

    await page.getByTestId("admin-profile-menu").click();
    await page.getByTestId("logout-button").click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("security headers present", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response).toBeTruthy();
    const headers = response!.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toMatch(/strict-origin/);
    expect(headers["content-security-policy"]).toMatch(/default-src/);
  });
});
