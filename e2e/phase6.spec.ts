import { expect, test } from "@playwright/test";
import { E2E_LOGIN } from "./credentials";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(E2E_LOGIN.loginId);
  await page.getByLabel("Password", { exact: true }).fill(E2E_LOGIN.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 20_000 });
}

test.describe("Phase 6 money + growth", () => {
  test("wallet page and detail show balances", async ({ page }) => {
    await login(page);
    await page.goto("/wallet");
    await expect(page.getByTestId("wallet-page")).toBeVisible();
    await expect(page.getByTestId("wallet-summary")).toBeVisible();
    await expect(page.getByTestId("wallet-table")).toBeVisible();
    await page.getByTestId("wallet-open-wal_001").click();
    await expect(page.getByTestId("wallet-detail")).toBeVisible();
    await expect(page.getByTestId("wallet-available")).toBeVisible();
    await expect(page.getByTestId("wallet-held")).toBeVisible();
  });

  test("transactions list, filter, detail, immutable, reversal", async ({ page }) => {
    await login(page);
    await page.goto("/transactions");
    await expect(page.getByTestId("transactions-page")).toBeVisible();
    await expect(page.getByTestId("transactions-table")).toBeVisible();
    await page.getByTestId("txn-search").fill("txn_001");
    await expect(page.getByTestId("txn-open-txn_001")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("txn-open-txn_001").click();
    const drawer = page.getByTestId("detail-drawer");
    await expect(drawer.getByTestId("txn-detail")).toBeVisible();
    await expect(drawer.getByTestId("txn-immutable-note")).toBeVisible();
    await page.getByTestId("txn-reverse").click();
    await page.getByTestId("reason-input").fill("E2E reversal");
    await page.getByTestId("reason-confirm").click();
    await expect
      .poll(
        async () =>
          page
            .getByTestId("detail-drawer")
            .getByTestId("transaction-status-badge")
            .getAttribute("data-status"),
        { timeout: 10_000 },
      )
      .toBe("REVERSED");
  });

  test("security deposits list and detail", async ({ page }) => {
    await login(page);
    await page.goto("/security-deposits");
    await expect(page.getByTestId("deposits-page")).toBeVisible();
    await expect(page.getByTestId("deposits-table")).toBeVisible();
    await page.getByTestId("deposit-open-dep_001").click();
    await expect(page.getByTestId("detail-drawer").getByTestId("deposit-detail")).toBeVisible();
    await expect(
      page.getByTestId("detail-drawer").getByTestId("deposit-status-badge"),
    ).toHaveAttribute("data-status", "HELD");
  });

  test("refunds approve flow", async ({ page }) => {
    await login(page);
    await page.goto("/refunds");
    await expect(page.getByTestId("refunds-page")).toBeVisible();
    await expect(page.getByTestId("refunds-table")).toBeVisible();
    await page.getByTestId("refund-open-ref_002").click();
    const drawer = page.getByTestId("detail-drawer");
    await expect(drawer.getByTestId("refund-detail")).toBeVisible();
    await page.getByTestId("refund-approve").click();
    await page.getByTestId("reason-input").fill("Approved in E2E");
    await page.getByTestId("reason-confirm").click();
    await expect
      .poll(async () => drawer.getByTestId("refund-status-badge").getAttribute("data-status"), {
        timeout: 10_000,
      })
      .toBe("APPROVED");
  });

  test("credits page and manual create", async ({ page }) => {
    await login(page);
    await page.goto("/credits");
    await expect(page.getByTestId("credits-page")).toBeVisible();
    await expect(page.getByTestId("credits-table")).toBeVisible();
    await page.getByTestId("credit-open-crd_001").click();
    await expect(page.getByTestId("detail-drawer").getByTestId("credit-detail")).toBeVisible();
    await page.getByTestId("detail-drawer").getByRole("button", { name: "Close", exact: true }).click();
    await page.getByTestId("credit-create-open").click();
    await expect(page.getByTestId("credit-create-form")).toBeVisible();
    await page.getByTestId("credit-create-form").locator("select").first().selectOption("usr_002");
    await page.getByLabel(/Amount/i).fill("25");
    await page.getByLabel(/Reason/i).fill("E2E promotional credit");
    await page.getByTestId("credit-create-submit").click();
    await expect(page.getByTestId("credit-create-form")).toBeHidden({ timeout: 10_000 });
  });

  test("coupons detail and pause", async ({ page }) => {
    await login(page);
    await page.goto("/coupons");
    await expect(page.getByTestId("coupons-page")).toBeVisible();
    await expect(page.getByTestId("coupons-table")).toBeVisible();
    await page.getByTestId("coupon-open-cpn_001").click();
    const drawer = page.getByTestId("detail-drawer");
    await expect(drawer.getByTestId("coupon-detail")).toBeVisible();
    await page.getByTestId("coupon-pause").click();
    await page.getByTestId("reason-input").fill("Pause for E2E");
    await page.getByTestId("reason-confirm").click();
    await expect
      .poll(async () => drawer.getByTestId("coupon-status-badge").getAttribute("data-status"), {
        timeout: 10_000,
      })
      .toBe("PAUSED");
  });

  test("referrals list and detail", async ({ page }) => {
    await login(page);
    await page.goto("/referrals");
    await expect(page.getByTestId("referrals-page")).toBeVisible();
    await expect(page.getByTestId("referrals-table")).toBeVisible();
    await page.getByTestId("referral-open-refc_001").click();
    await expect(page.getByTestId("detail-drawer").getByTestId("referral-detail")).toBeVisible();
    await expect(
      page.getByTestId("detail-drawer").getByTestId("referral-status-badge"),
    ).toHaveAttribute("data-status", "REWARDED");
  });

  test("financial realtime update without refresh", async ({ page }) => {
    await login(page);
    await page.goto("/transactions");
    await expect(page.getByTestId("transactions-page")).toBeVisible();
    await page.goto("/dashboard");
    await page.getByTestId("dev-event-simulator").getByText("DEV Events").click();
    await page.getByTestId("dev-money-adjust").click();
    await expect
      .poll(async () => page.getByTestId("recent-events").textContent(), { timeout: 15_000 })
      .toMatch(/Ledger|Wallet|txn_/i);
  });

  test("dark mode across Phase 6 money pages", async ({ page }) => {
    await login(page);
    await page.getByTestId("theme-dark").click();
    await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
    for (const path of [
      "/wallet",
      "/transactions",
      "/security-deposits",
      "/refunds",
      "/credits",
      "/coupons",
      "/referrals",
    ]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
  });
});
