import { expect, test } from "@playwright/test";
import { E2E_LOGIN } from "./credentials";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(E2E_LOGIN.loginId);
  await page.getByLabel("Password", { exact: true }).fill(E2E_LOGIN.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 20_000 });
}

test.describe("Phase 5 safety + assured ride", () => {
  test("live monitoring loads with safety events", async ({ page }) => {
    await login(page);
    await page.goto("/safety/live-monitoring");
    await expect(page.getByTestId("safety-live-page")).toBeVisible();
    await expect(page.getByTestId("safety-summary")).toBeVisible();
    await expect(page.getByTestId("safety-sos-list")).toBeVisible();
  });

  test("SOS queue, detail, acknowledge, respond, resolve", async ({ page }) => {
    await login(page);
    await page.goto("/safety/sos");
    await expect(page.getByTestId("sos-page")).toBeVisible();
    await expect(page.getByTestId("sos-table")).toBeVisible();

    await page.getByTestId("sos-open-sos_001").click();
    const drawer = page.getByTestId("detail-drawer");
    await expect(drawer.getByTestId("sos-detail")).toBeVisible();

    await page.getByTestId("sos-acknowledge").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect
      .poll(async () => drawer.getByTestId("sos-status-badge").getAttribute("data-status"), {
        timeout: 10_000,
      })
      .toBe("ACKNOWLEDGED");

    await page.getByTestId("sos-start-response").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect
      .poll(async () => drawer.getByTestId("sos-status-badge").getAttribute("data-status"), {
        timeout: 10_000,
      })
      .toBe("RESPONDING");

    await page.getByTestId("sos-resolve").click();
    await page.getByTestId("reason-confirm").click();
    await page.getByTestId("detail-drawer").getByRole("button", { name: "Close", exact: true }).click();
    await page.getByTestId("sos-status-filter").selectOption("ALL");
    await page.getByTestId("sos-open-sos_001").click();
    await expect
      .poll(
        async () =>
          page.getByTestId("detail-drawer").getByTestId("sos-status-badge").getAttribute("data-status"),
        { timeout: 10_000 },
      )
      .toBe("RESOLVED");
  });

  test("incidents list, detail, escalate", async ({ page }) => {
    await login(page);
    await page.goto("/safety/incidents");
    await expect(page.getByTestId("incidents-page")).toBeVisible();
    await expect(page.getByTestId("incidents-table")).toBeVisible();
    await page.getByTestId("incident-open-inc_003").click();
    const drawer = page.getByTestId("detail-drawer");
    await expect(drawer.getByTestId("incident-detail")).toBeVisible();
    await page.getByTestId("incident-escalate").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect
      .poll(async () => drawer.getByTestId("incident-status-badge").getAttribute("data-status"), {
        timeout: 10_000,
      })
      .toBe("ESCALATED");
  });

  test("live map shows safety markers and command center gets SOS", async ({ page }) => {
    await login(page);
    await page.goto("/live-map");
    await expect(page.getByTestId("live-map-page")).toBeVisible();
    await page.getByTestId("map-layer-filter-SOS").click();
    await expect(page.getByTestId("mock-map")).toBeVisible();

    await page.goto("/dashboard");
    await page.getByTestId("dev-event-simulator").getByText("DEV Events").click();
    await page.getByTestId("dev-sos-trigger").click();
    await expect
      .poll(async () => page.getByTestId("needs-attention").textContent(), { timeout: 15_000 })
      .toMatch(/SOS/i);
    // Prefer in-page link so DEV simulator overlay does not intercept sidebar clicks.
    await page.getByRole("link", { name: "Open all alerts" }).click();
    await expect(page.getByTestId("alerts-page")).toBeVisible();
    await expect(page.getByTestId("alerts-page").getByText(/SOS/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("assured rides, cancellations, compensation calculation, risk review", async ({ page }) => {
    await login(page);
    await page.goto("/assured-rides");
    await expect(page.getByTestId("assured-rides-page")).toBeVisible();
    await expect(page.getByTestId("assured-rides-table")).toBeVisible();
    await page.getByTestId("assured-open-ar_002").click();
    await expect(page.getByTestId("assured-detail")).toBeVisible();

    await page.goto("/assured-rides/cancellations");
    await expect(page.getByTestId("cancellations-page")).toBeVisible();
    await expect(page.getByTestId("cancellations-table")).toBeVisible();

    await page.goto("/assured-rides/compensation");
    await expect(page.getByTestId("compensation-page")).toBeVisible();
    await expect(page.getByTestId("compensation-table")).toBeVisible();
    await page.getByTestId("comp-open-comp_ar_002").click();
    await expect(page.getByTestId("compensation-detail")).toBeVisible();

    await page.goto("/assured-rides/fraud-risk");
    await expect(page.getByTestId("risk-page")).toBeVisible();
    await page.getByTestId("risk-open-risk_001").click();
    const drawer = page.getByTestId("detail-drawer");
    await expect(drawer.getByTestId("risk-detail")).toBeVisible();
    await page.getByTestId("risk-review").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect
      .poll(async () => drawer.getByTestId("risk-status-badge").getAttribute("data-status"), {
        timeout: 10_000,
      })
      .toBe("UNDER_REVIEW");
  });

  test("dark mode across Phase 5", async ({ page }) => {
    await login(page);
    await page.goto("/safety/live-monitoring");
    await page.getByTestId("theme-dark").click();
    await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
    await page.goto("/safety/sos");
    await expect(page.getByTestId("sos-page")).toBeVisible();
    await page.goto("/assured-rides");
    await expect(page.getByTestId("assured-rides-page")).toBeVisible();
    await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
  });
});
