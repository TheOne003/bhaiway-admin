import { expect, test } from "@playwright/test";
import { E2E_LOGIN } from "./credentials";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(E2E_LOGIN.loginId);
  await page.getByLabel("Password", { exact: true }).fill(E2E_LOGIN.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 20_000 });
}

test.describe("Phase 4 people + verification", () => {
  test("users page loads, search, filter by type and status", async ({ page }) => {
    await login(page);
    await page.goto("/users");
    await expect(page.getByTestId("users-page")).toBeVisible();
    await expect(page.getByTestId("users-table")).toBeVisible();

    await page.getByTestId("users-search").fill("Neha");
    await expect(page.getByTestId("user-row-usr_001")).toBeVisible();

    await page.getByTestId("users-search").fill("");
    await page.getByTestId("users-type-DRIVER").click();
    const first = page.locator('[data-testid^="user-row-"]').first();
    await expect(first).toHaveAttribute("data-type", /DRIVER|BOTH/);

    await page.getByTestId("users-type-ALL").click();
    await page.getByTestId("users-status-filter").selectOption("SUSPENDED");
    await expect(page.locator('[data-testid^="user-row-"]').first()).toHaveAttribute(
      "data-status",
      "SUSPENDED",
    );
  });

  test("open user detail, suspend and reactivate", async ({ page }) => {
    await login(page);
    await page.goto("/users/usr_010");
    await expect(page.getByTestId("user-detail-page")).toBeVisible();

    await page.getByTestId("user-action-suspend").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByTestId("account-status-badge")).toHaveAttribute(
      "data-status",
      "SUSPENDED",
    );

    await page.getByTestId("user-action-reactivate").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByTestId("account-status-badge")).toHaveAttribute(
      "data-status",
      "ACTIVE",
    );
  });

  test("drivers page loads, search, open detail", async ({ page }) => {
    await login(page);
    await page.goto("/drivers");
    await expect(page.getByTestId("drivers-page")).toBeVisible();
    await expect(page.getByTestId("drivers-table")).toBeVisible();

    await page.getByTestId("drivers-search").fill("Rahul");
    await expect(page.getByTestId("driver-row-drv_usr_002")).toBeVisible();

    await page.getByTestId("driver-open-drv_usr_002").click();
    await expect(page.getByTestId("driver-detail-page")).toBeVisible();
    await expect(page.getByTestId("driver-vehicle-context")).toBeVisible();
  });

  test("verification queues, filters, detail, approve reject manual", async ({ page }) => {
    await login(page);
    await page.goto("/verification");
    await expect(page.getByTestId("verification-page")).toBeVisible();

    await page.getByTestId("verification-tab-GOVERNMENT_ID").click();
    await expect(page.getByTestId("verification-table")).toBeVisible();

    await page.getByTestId("verification-tab-CORPORATE").click();
    await expect(page.locator('[data-testid^="verification-row-"]').first()).toBeVisible();

    await page.getByTestId("verification-tab-VEHICLE_RC").click();
    await expect(page.locator('[data-testid^="verification-row-"]').first()).toBeVisible();

    await page.getByTestId("verification-tab-GOVERNMENT_ID").click();
    await page.getByTestId("verification-status-filter").selectOption("PENDING");
    await expect(page.getByTestId("verification-row-ver_gov_004")).toBeVisible();

    await page.getByTestId("verification-open-ver_gov_004").click();
    await expect(page.getByTestId("detail-drawer")).toBeVisible();
    await expect(page.getByTestId("verification-detail")).toBeVisible();

    await page.getByTestId("verification-approve").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect
      .poll(async () => page.getByTestId("verification-detail").textContent(), {
        timeout: 10_000,
      })
      .toMatch(/APPROVED/i);

    await page.getByTestId("verification-reject").click();
    await page.getByTestId("reason-input").fill("Invalid document");
    await page.getByTestId("reason-confirm").click();
    await expect
      .poll(async () => page.getByTestId("verification-detail").textContent(), {
        timeout: 10_000,
      })
      .toMatch(/FAILED/i);

    await page.getByTestId("verification-manual-review").click();
    await page.getByTestId("reason-input").fill("Needs ops review");
    await page.getByTestId("reason-confirm").click();
    await expect
      .poll(async () => page.getByTestId("verification-detail").textContent(), {
        timeout: 10_000,
      })
      .toMatch(/MANUAL REVIEW|MANUAL_REVIEW/i);
  });

  test("realtime verification update without refresh", async ({ page }) => {
    await login(page);
    await page.goto("/verification?id=ver_gov_004");
    await expect(page.getByTestId("verification-detail")).toBeVisible();

    await page.getByTestId("dev-event-simulator").getByText("DEV Events").click();
    await page.getByTestId("dev-verification-approve").click();

    await expect
      .poll(async () => page.getByTestId("verification-detail").textContent(), {
        timeout: 10_000,
      })
      .toMatch(/APPROVED/i);
  });

  test("dark mode works across people pages", async ({ page }) => {
    await login(page);
    await page.goto("/users");
    await page.getByTestId("theme-dark").click();
    await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("users-page")).toBeVisible();

    await page.goto("/drivers");
    await expect(page.getByTestId("drivers-page")).toBeVisible();
    await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");

    await page.goto("/verification");
    await expect(page.getByTestId("verification-page")).toBeVisible();
    await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
  });

  test("users to user detail navigation", async ({ page }) => {
    await login(page);
    await page.goto("/users");
    await page.getByTestId("user-open-usr_001").click();
    await expect(page).toHaveURL(/\/users\/usr_001/);
    await expect(page.getByTestId("user-detail-page")).toBeVisible();
  });
});
