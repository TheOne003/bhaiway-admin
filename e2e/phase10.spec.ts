import { expect, test } from "@playwright/test";
import { E2E_LOGIN } from "./credentials";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(E2E_LOGIN.loginId);
  await page.getByLabel("Password", { exact: true }).fill(E2E_LOGIN.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 20_000 });
}

test.describe("Phase 10 operations UX", () => {
  test("shell keeps sidebar fixed while main scrolls", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    const sidebar = page.getByTestId("admin-sidebar");
    await expect(sidebar).toBeVisible();
    const before = await sidebar.boundingBox();
    await page.getByTestId("admin-main").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const after = await sidebar.boundingBox();
    expect(before?.y).toBe(after?.y);
    expect(before?.x).toBe(after?.x);
  });

  test("notification composer send flow", async ({ page }) => {
    await login(page);
    await page.goto("/notifications?compose=1&userId=usr_001");
    await expect(page.getByTestId("notifications-page")).toBeVisible();
    await expect(page.getByTestId("notif-composer")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("notif-compose-title").fill("Phase 10 ping");
    await page.getByTestId("notif-compose-body").fill("Hello from ops.");
    await page.getByTestId("notif-send-confirm").click();
    await page.getByRole("button", { name: /send now|confirm|send/i }).last().click();
  });

  test("vehicles list and detail", async ({ page }) => {
    await login(page);
    await page.goto("/vehicles");
    await expect(page.getByTestId("vehicles-page")).toBeVisible();
    const row = page.locator("[data-testid^='vehicle-row-']").first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();
    await expect(page.getByTestId("vehicle-detail")).toBeVisible();
  });

  test("fare management page", async ({ page }) => {
    await login(page);
    await page.goto("/fare-management");
    await expect(page.getByTestId("fare-page")).toBeVisible();
    await expect(page.locator("[data-testid^='fare-row-']").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("outstation and office commute lists navigate to ride detail", async ({ page }) => {
    await login(page);
    await page.goto("/outstation");
    await expect(page.getByTestId("outstation-page")).toBeVisible();
    const outLink = page.locator('a[href^="/rides/"]').first();
    if (await outLink.isVisible().catch(() => false)) {
      await outLink.click();
      await expect(page).toHaveURL(/\/rides\//);
    }

    await page.goto("/office-commute");
    await expect(page.getByTestId("office-commute-page")).toBeVisible();
  });

  test("incidents open with user link and analytics KPIs", async ({ page }) => {
    await login(page);
    await page.goto("/safety/incidents");
    await expect(page.getByTestId("incidents-page")).toBeVisible();
    const userLink = page.locator('a[href^="/users/"]').first();
    if (await userLink.isVisible().catch(() => false)) {
      await userLink.click();
      await expect(page).toHaveURL(/\/users\//);
      await expect(page.getByRole("link", { name: /send notification/i })).toBeVisible();
    }

    await page.goto("/analytics");
    await expect(page.getByTestId("analytics-kpi-revenue")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("analytics-kpi-completed")).toBeVisible();
    await expect(page.getByTestId("analytics-kpi-assured")).toBeVisible();
  });

  test("coupons create control visible", async ({ page }) => {
    await login(page);
    await page.goto("/coupons");
    await expect(page.getByTestId("coupon-create")).toBeVisible({ timeout: 15_000 });
  });
});
