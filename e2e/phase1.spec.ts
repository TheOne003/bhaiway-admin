import { expect, test } from "@playwright/test";
import { E2E_LOGIN } from "./credentials";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(E2E_LOGIN.loginId);
  await page.getByLabel("Password", { exact: true }).fill(E2E_LOGIN.password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 20_000 });
}

test.describe("Phase 1 auth & shell", () => {
  test("admin login failure shows invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Login ID").fill("ops@bhaiway.admin");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toContainText(/Invalid login ID or password/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin login success redirects to dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
    await expect(page.getByTestId("kpi-revenue-today")).toBeVisible();
  });

  test("session logout returns to login", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("admin-profile-menu").click();
    await page.getByTestId("logout-button").click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("theme switches light → dark → light", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("theme-dark").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByTestId("theme-light").click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("live clock updates without refresh", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByTestId("live-clock")).toBeVisible();

    const first = await page.getByTestId("live-clock").textContent();
    await page.waitForTimeout(1100);
    const second = await page.getByTestId("live-clock").textContent();
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toEqual(first);
  });

  test("dashboard loads within admin shell", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByTestId("admin-sidebar")).toBeVisible();
    await expect(page.getByTestId("admin-topbar")).toBeVisible();
    await expect(page.getByTestId("admin-main")).toBeVisible();
    await expect(page.getByTestId("live-clock")).toBeVisible();
  });
});
