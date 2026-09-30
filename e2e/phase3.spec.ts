import { expect, test } from "@playwright/test";
import { E2E_LOGIN } from "./credentials";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(E2E_LOGIN.loginId);
  await page.getByLabel("Password", { exact: true }).fill(E2E_LOGIN.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 20_000 });
}

test.describe("Phase 3 live map + rides", () => {
  test("live map loads with active markers", async ({ page }) => {
    await login(page);
    await page.goto("/live-map");
    await expect(page.getByTestId("live-map-page")).toBeVisible();
    await expect(page.getByTestId("mock-map")).toBeVisible();
    await expect(page.getByTestId("map-marker-BW10291")).toBeVisible();
    await expect(page.getByTestId("map-marker-BW20011")).toBeVisible();
    await expect(page.getByTestId("map-marker-BW10291")).toHaveAttribute(
      "data-network",
      "OFFICE",
    );
    await expect(page.getByTestId("map-marker-BW20011")).toHaveAttribute(
      "data-network",
      "OUTSTATION",
    );
    await expect(page.getByTestId("map-legend")).toBeVisible();
  });

  test("clicking marker opens ride drawer and close works", async ({ page }) => {
    await login(page);
    await page.goto("/live-map");
    await page.getByTestId("map-marker-BW10291").dispatchEvent("click");
    await expect(page).toHaveURL(/ride=BW10291/);
    await expect(page.getByTestId("detail-drawer")).toBeVisible();
    await expect(page.getByTestId("ride-detail-content")).toBeVisible();
    await page.getByTestId("detail-drawer").getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByTestId("detail-drawer")).toHaveCount(0);
  });

  test("rides page filters and search", async ({ page }) => {
    await login(page);
    await page.goto("/rides");
    await expect(page.getByTestId("rides-page")).toBeVisible();
    await expect(page.getByTestId("rides-table")).toBeVisible();

    await page.getByTestId("rides-network-OFFICE").click();
    const officeRows = page.locator('[data-testid^="ride-row-"]');
    await expect(officeRows.first()).toHaveAttribute("data-network", "OFFICE");

    await page.getByTestId("rides-network-OUTSTATION").click();
    await expect(page.locator('[data-testid^="ride-row-"]').first()).toHaveAttribute(
      "data-network",
      "OUTSTATION",
    );

    await page.getByTestId("rides-network-ALL").click();
    await page.getByTestId("rides-search").fill("BW10291");
    await expect(page.getByTestId("ride-row-BW10291")).toBeVisible();
  });

  test("ride detail page opens", async ({ page }) => {
    await login(page);
    await page.goto("/rides/BW10291");
    await expect(page.getByTestId("ride-detail-page")).toBeVisible();
    await expect(page.getByText(/Rahul Verma/i)).toBeVisible();
  });

  test("mock location and status updates without refresh", async ({ page }) => {
    await login(page);
    await page.goto("/live-map?ride=BW10291");
    await expect(page.getByTestId("detail-drawer")).toBeVisible();
    const beforeLoc = await page.getByTestId("ride-current-location").textContent();

    await page.getByTestId("dev-event-simulator").getByText("DEV Events").click();
    await page.getByTestId("dev-ride-move").click();
    await expect
      .poll(async () => page.getByTestId("ride-current-location").textContent(), {
        timeout: 10_000,
      })
      .not.toBe(beforeLoc);

    await page.getByTestId("dev-ride-delay").click();
    await expect(page.getByTestId("map-marker-BW10291")).toHaveAttribute(
      "data-status",
      "DELAYED",
      { timeout: 10_000 },
    );
    await expect(page.getByTestId("ride-status-badge")).toHaveText(/Delayed/i);

    await page.getByTestId("detail-drawer").getByRole("button", { name: "Close", exact: true }).click();
    // Full remount used to reseed mocks; session store must keep DELAYED across goto.
    await page.goto("/rides");
    await expect(page.getByTestId("rides-page")).toBeVisible();
    await expect(page.getByTestId("ride-row-BW10291")).toHaveAttribute(
      "data-status",
      "delayed",
      { timeout: 10_000 },
    );
  });

  test("dark mode works on live map and rides", async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/live-map");
    await page.getByTestId("admin-topbar").getByTestId("theme-dark").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.goto("/rides");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByTestId("admin-topbar").getByTestId("theme-light").click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("drawer opens full ride details", async ({ page }) => {
    await login(page);
    await page.goto("/live-map?ride=BW10291");
    await page.getByTestId("open-full-ride").click();
    await expect(page).toHaveURL(/\/rides\/BW10291/);
    await expect(page.getByTestId("ride-detail-page")).toBeVisible();
  });
});
