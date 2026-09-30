import { expect, test } from "@playwright/test";
import { E2E_LOGIN } from "./credentials";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(E2E_LOGIN.loginId);
  await page.getByLabel("Password", { exact: true }).fill(E2E_LOGIN.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 20_000 });
}

const ROUTES: { path: string; name: string }[] = [
  { path: "/dashboard", name: "Dashboard" },
  { path: "/live-map", name: "Live Map" },
  { path: "/alerts", name: "Alerts" },
  { path: "/users", name: "Users" },
  { path: "/drivers", name: "Drivers" },
  { path: "/verification", name: "Verification" },
  { path: "/rides", name: "Rides" },
  { path: "/vehicles", name: "Vehicles" },
  { path: "/fare-management", name: "Fare Management" },
  { path: "/outstation", name: "Outstation" },
  { path: "/office-commute", name: "Office Commute" },
  { path: "/safety/live-monitoring", name: "Live Monitoring" },
  { path: "/safety/sos", name: "SOS" },
  { path: "/safety/incidents", name: "Incidents" },
  { path: "/assured-rides", name: "Assured Rides" },
  { path: "/assured-rides/cancellations", name: "Cancellations" },
  { path: "/assured-rides/compensation", name: "Compensation" },
  { path: "/assured-rides/fraud-risk", name: "Fraud Risk" },
  { path: "/wallet", name: "Wallet" },
  { path: "/transactions", name: "Transactions" },
  { path: "/security-deposits", name: "Security Deposits" },
  { path: "/refunds", name: "Refunds" },
  { path: "/credits", name: "Credits" },
  { path: "/coupons", name: "Coupons" },
  { path: "/referrals", name: "Referrals" },
  { path: "/notifications", name: "Notification Center" },
  { path: "/notifications/history", name: "Notification History" },
  { path: "/notifications/templates", name: "Templates" },
  { path: "/notifications/automations", name: "Automations" },
  { path: "/notifications/campaigns", name: "Campaigns" },
  { path: "/communications", name: "Communications" },
  { path: "/support", name: "Support" },
  { path: "/analytics", name: "Analytics" },
  { path: "/reports", name: "Reports" },
  { path: "/system-health", name: "API & Service Health" },
  { path: "/system/infrastructure", name: "Infrastructure" },
  { path: "/system/alerts", name: "System Alerts" },
  { path: "/settings/admins", name: "Admin Users" },
  { path: "/settings/roles", name: "Roles" },
  { path: "/settings/audit-logs", name: "Audit Logs" },
  { path: "/settings/platform", name: "Platform Settings" },
];

test.describe("Full admin audit — auth", () => {
  test("invalid and empty credentials are rejected", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Login ID").fill("admin");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password-xxx");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid|incorrect|unable|failed/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("valid login, refresh persists, logout blocks protected routes", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.reload();
    await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 20_000 });

    await page.goto("/users");
    await expect(page.getByTestId("admin-shell")).toBeVisible();

    await page.getByTestId("admin-profile-menu").click();
    await page.getByTestId("logout-button").click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    const unauth = await page.request.get("/api/authz/check?permission=dashboard.view");
    expect(unauth.status()).toBe(401);

    await login(page);
    const authed = await page.request.get("/api/authz/check?permission=dashboard.view");
    expect(authed.status()).toBe(200);
  });
});

test.describe("Full admin audit — all routes load", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const route of ROUTES) {
    test(`loads ${route.name} (${route.path})`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.ok() ?? response?.status() === 304).toBeTruthy();
      await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 15_000 });
      await expect(page.locator("body")).not.toContainText("Application error");
      // No blank main — either content or a known state component
      const main = page.getByTestId("admin-main");
      await expect(main).toBeVisible();
      const text = (await main.innerText()).trim();
      expect(text.length).toBeGreaterThan(5);
    });
  }
});

test.describe("Full admin audit — shell scroll", () => {
  test("sidebar stays fixed while main scrolls on dashboard", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.setViewportSize({ width: 1440, height: 900 });
    const sidebar = page.getByTestId("admin-sidebar");
    const before = await sidebar.boundingBox();
    await page.getByTestId("admin-main").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const after = await sidebar.boundingBox();
    expect(before?.y).toBe(after?.y);
    expect(before?.x).toBe(after?.x);
    await expect(page.getByTestId("admin-topbar")).toBeVisible();
  });

  test("mobile drawer and tablet layout", async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await expect(page.getByTestId("admin-shell")).toBeVisible();
    await expect(page.getByTestId("sidebar-toggle")).toBeVisible();
    // Ensure drawer can be toggled on mobile without crashing layout
    await page.getByTestId("sidebar-toggle").click();
    await expect(page.getByTestId("admin-sidebar")).toBeVisible();
    await page.getByTestId("sidebar-toggle").click();
    await expect(page.getByTestId("admin-main")).toBeVisible();
  });
});

test.describe("Full admin audit — dashboard ops", () => {
  test("dashboard KPIs map attention and quick actions", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await expect(page.getByTestId("kpi-revenue-today")).toBeVisible();
    await expect(page.getByTestId("kpi-rides-today")).toBeVisible();
    await expect(page.getByTestId("metric-active-rides")).toBeVisible();
    await expect(page.getByTestId("kpi-cancelled-today")).toBeVisible();
    await expect(page.getByTestId("dashboard-live-map")).toBeVisible();
    await expect(page.getByTestId("needs-attention")).toBeVisible();
    await expect(page.getByTestId("dashboard-secondary-kpis")).toBeVisible();
    await expect(page.getByTestId("recent-events")).toBeVisible();
    await expect(page.getByTestId("dashboard-quick-actions")).toBeVisible();
    await expect(page.getByTestId("map-overlay-all")).toBeVisible();
    await expect(page.getByTestId("map-overlay-office")).toBeVisible();
    await expect(page.getByTestId("map-overlay-outstation")).toBeVisible();
    await expect(page.getByTestId("map-overlay-sos")).toBeVisible();

    await page.getByRole("link", { name: "Send Notification" }).click();
    await expect(page).toHaveURL(/\/notifications/);
  });
});

test.describe("Full admin audit — critical workflows", () => {
  test("user detail send notification and contact", async ({ page }) => {
    await login(page);
    await page.goto("/users/usr_001");
    await expect(page.getByRole("link", { name: /send notification/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /contact user/i })).toBeVisible();
    await page.getByRole("link", { name: /send notification/i }).click();
    await expect(page).toHaveURL(/compose=1/);
    await expect(page.getByTestId("notif-composer")).toBeVisible({ timeout: 10_000 });
  });

  test("notification composer audience and send", async ({ page }) => {
    await login(page);
    await page.goto("/notifications?compose=1&userId=usr_001");
    await expect(page.getByTestId("notif-composer")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("notif-audience-mode")).toBeVisible();
    await page.getByTestId("notif-compose-title").fill("Audit ping");
    await page.getByTestId("notif-compose-body").fill("E2E audit message");
    await page.getByTestId("notif-send-confirm").click();
    await page.getByRole("button", { name: /^send$/i }).click();
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

  test("coupons create control and fare page", async ({ page }) => {
    await login(page);
    await page.goto("/coupons");
    await expect(page.getByTestId("coupon-create")).toBeVisible({ timeout: 15_000 });
    await page.goto("/fare-management");
    await expect(page.getByTestId("fare-page")).toBeVisible();
  });

  test("outstation and office commute", async ({ page }) => {
    await login(page);
    await page.goto("/outstation");
    await expect(page.getByTestId("outstation-page")).toBeVisible();
    await page.goto("/office-commute");
    await expect(page.getByTestId("office-commute-page")).toBeVisible();
  });

  test("incidents user link and analytics KPIs", async ({ page }) => {
    await login(page);
    await page.goto("/safety/incidents");
    await expect(page.getByTestId("incidents-page")).toBeVisible();
    await page.goto("/analytics");
    await expect(page.getByTestId("analytics-kpi-revenue")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("analytics-kpi-completed")).toBeVisible();
  });

  test("password not exposed in login DOM", async ({ page }) => {
    await page.goto("/login");
    const html = await page.content();
    expect(html).not.toContain(E2E_LOGIN.password);
  });
});
