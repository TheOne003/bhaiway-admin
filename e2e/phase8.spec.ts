import { expect, test } from "@playwright/test";
import { E2E_LOGIN } from "./credentials";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(E2E_LOGIN.loginId);
  await page.getByLabel("Password", { exact: true }).fill(E2E_LOGIN.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 20_000 });
}

test.describe("Phase 8 analytics, reports, system, settings", () => {
  test("analytics filters and network split", async ({ page }) => {
    await login(page);
    await page.goto("/analytics");
    await expect(page.getByTestId("analytics-page")).toBeVisible();
    await expect(page.getByTestId("analytics-filters")).toBeVisible();
    await expect(page.getByTestId("network-split")).toBeVisible();

    await page.getByTestId("analytics-range").selectOption("90D");
    await page.getByTestId("analytics-network").selectOption("OFFICE");
    await expect(page.getByTestId("network-split")).toBeVisible();
    await expect(page.getByTestId("analytics-page")).toContainText(/Office|Outstation|SOS|ticket/i);
  });

  test("reports generate, detail, and export", async ({ page }) => {
    await login(page);
    await page.goto("/reports");
    await expect(page.getByTestId("reports-page")).toBeVisible();

    await page.getByTestId("report-generate-rpt_def_rides").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByTestId("report-detail")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("report-detail").getByTestId("report-export").click();
  });

  test("system health, infrastructure, and alerts ack/resolve", async ({ page }) => {
    await login(page);

    await page.goto("/system-health");
    await expect(page.getByTestId("system-health-page")).toBeVisible();

    await page.goto("/system/infrastructure");
    await expect(page.getByTestId("infrastructure-page")).toBeVisible();
    await expect(page.getByTestId("infra-row-infra_app")).toBeVisible();
    await expect(page.getByTestId("infrastructure-page")).toContainText(/HEALTHY|DEGRADED|DOWN|NOT_CONFIGURED/i);

    await page.goto("/system/alerts");
    await expect(page.getByTestId("system-alerts-page")).toBeVisible();
    const ack = page.locator('[data-testid^="alert-ack-"]').first();
    const resolve = page.locator('[data-testid^="alert-resolve-"]').first();
    if (await ack.count()) {
      await ack.click();
      await page.getByTestId("confirm-dialog-confirm").click();
    } else if (await resolve.count()) {
      await resolve.click();
      await page.getByTestId("confirm-dialog-confirm").click();
    }
  });

  test("admin users: no password and last-admin deactivate blocked", async ({ page }) => {
    await login(page);
    await page.goto("/settings/admins");
    await expect(page.getByTestId("admin-users-page")).toBeVisible();
    await expect(page.getByTestId("admin-row-admin")).toBeVisible();

    const body = await page.getByTestId("admin-users-page").innerText();
    expect(body).not.toContain(E2E_LOGIN.password);
    expect(body).not.toContain("India@0192");

    await page.getByTestId("admin-deactivate-admin").click();
    await page.getByTestId("reason-input").fill("Attempt deactivate only admin");
    await page.getByTestId("reason-confirm").click();
    await expect(page.getByTestId("error-state")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("error-state")).toContainText(/only active admin/i);
  });

  test("roles permission matrix and audit logs", async ({ page }) => {
    await login(page);
    await page.goto("/settings/roles");
    await expect(page.getByTestId("roles-page")).toBeVisible();
    await page.getByTestId("role-open-role_analyst").click();
    await expect(page.getByTestId("permission-matrix")).toBeVisible();

    await page.goto("/settings/audit-logs");
    await expect(page.getByTestId("audit-logs-page")).toBeVisible();
    await expect(page.getByTestId("audit-filters")).toBeVisible();
    await page.getByTestId("audit-search").fill("login");
    const firstRow = page.locator('[data-testid^="audit-row-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    await page.locator('[data-testid^="audit-view-"]').first().click();
    await expect(page.getByTestId("audit-detail")).toBeVisible();
    await expect(page.getByTestId("audit-logs-page").getByRole("button", { name: /Delete/i })).toHaveCount(0);
    const auditText = await page.getByTestId("audit-logs-page").innerText();
    expect(auditText).not.toContain("India@0192");
  });

  test("platform settings assured locked and critical confirm", async ({ page }) => {
    await login(page);
    await page.goto("/settings/platform");
    await expect(page.getByTestId("platform-settings-page")).toBeVisible();
    await expect(page.getByTestId("settings-group-assuredRide")).toContainText(/locked|5%|60%/i);

    const securityInput = page.getByTestId("settings-group-assuredRide").locator('input[type="number"]').first();
    await expect(securityInput).toBeDisabled();

    await page.getByTestId("settings-group-system").getByLabel(/Maintenance mode/i).check();
    await page.getByTestId("settings-save-system").click();
    await expect(page.getByTestId("confirm-dialog")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("confirm-dialog-confirm").click();
  });

  test("dark mode across Phase 8 pages", async ({ page }) => {
    await login(page);
    await page.getByTestId("theme-dark").click();
    await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
    for (const path of [
      "/analytics",
      "/reports",
      "/system/infrastructure",
      "/system/alerts",
      "/system-health",
      "/settings/admins",
      "/settings/roles",
      "/settings/audit-logs",
      "/settings/platform",
    ]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
  });
});
