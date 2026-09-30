import { expect, test } from "@playwright/test";
import { E2E_LOGIN } from "./credentials";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(E2E_LOGIN.loginId);
  await page.getByLabel("Password", { exact: true }).fill(E2E_LOGIN.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("admin-shell")).toBeVisible();
}

test.describe("Phase 2 command center", () => {
  test("dashboard loads with active now and attention", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
    await expect(page.getByTestId("active-now")).toBeVisible();
    await expect(page.getByTestId("needs-attention")).toBeVisible();
    await expect(page.getByTestId("kpi-revenue-today")).toBeVisible();
  });

  test("system health page loads", async ({ page }) => {
    await login(page);
    await page.goto("/system-health");
    await expect(page.getByTestId("system-health-page")).toBeVisible();
    await expect(page.getByTestId("system-health-table")).toBeVisible();
    await expect(page.getByTestId("service-row-svc_rc")).toHaveAttribute("data-status", "down");
  });

  test("alerts page loads and acknowledge/resolve works", async ({ page }) => {
    await login(page);
    await page.goto("/alerts");
    await expect(page.getByTestId("alerts-page")).toBeVisible();

    const ackButton = page.getByTestId("ack-alert_sms_degraded");
    if (await ackButton.count()) {
      await ackButton.click();
      await page.getByTestId("confirm-dialog-confirm").click();
    }

    const resolveButton = page.locator('[data-testid^="resolve-"]').first();
    await resolveButton.click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByText(/resolved/i).first()).toBeVisible();
  });

  test("notification drawer opens and unread count works", async ({ page }) => {
    await login(page);
    const badge = page.getByTestId("notification-unread-count");
    await expect(badge).toBeVisible();
    const before = await badge.textContent();
    await page.getByTestId("notification-bell").click();
    await expect(page.getByTestId("notification-drawer")).toBeVisible();
    await page.getByTestId("mark-all-read").click();
    await expect(page.getByTestId("notification-unread-count")).toHaveCount(0);
    expect(before).toBeTruthy();
  });

  test("theme works on system health page", async ({ page }) => {
    await login(page);
    await page.goto("/system-health");
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.getByTestId("admin-topbar").getByTestId("theme-dark").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByTestId("admin-topbar").getByTestId("theme-light").click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("mock SERVICE_DOWN and SERVICE_RECOVERED update UI without refresh", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/system-health");

    await page.getByTestId("dev-event-simulator").getByText("DEV Events").click();
    await page.getByTestId("dev-service-down").click();

    await expect(page.getByTestId("service-row-svc_payment")).toHaveAttribute(
      "data-status",
      "down",
      { timeout: 10_000 },
    );

    await page.getByTestId("dev-service-recovered").click();
    await expect(page.getByTestId("service-row-svc_rc")).toHaveAttribute(
      "data-status",
      "operational",
      { timeout: 10_000 },
    );

    await page.goto("/dashboard");
    await expect(page.getByTestId("needs-attention")).toBeVisible();
    await expect(page.getByTestId("notification-unread-count")).toBeVisible();
  });

  test("dashboard navigates to system health and alerts", async ({ page }) => {
    await login(page);
    await page.goto("/system-health");
    await expect(page).toHaveURL(/\/system-health/);
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "View all alerts" }).click();
    await expect(page).toHaveURL(/\/alerts/);
  });
});
