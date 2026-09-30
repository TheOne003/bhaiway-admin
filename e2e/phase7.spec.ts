import { expect, test } from "@playwright/test";
import { E2E_LOGIN } from "./credentials";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(E2E_LOGIN.loginId);
  await page.getByLabel("Password", { exact: true }).fill(E2E_LOGIN.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("admin-shell")).toBeVisible({ timeout: 20_000 });
}

test.describe("Phase 7 support + notification engine", () => {
  test("notification center filters, detail, read/unread/all", async ({ page }) => {
    await login(page);
    await page.goto("/notifications");
    await expect(page.getByTestId("notifications-page")).toBeVisible();
    await expect(page.getByTestId("notif-summary")).toBeVisible();
    await expect(page.getByTestId("notif-table")).toBeVisible();
    await page.getByTestId("notif-search").fill("eng_notif_001");
    await expect(page.getByTestId("notif-open-eng_notif_001")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("notif-open-eng_notif_001").click();
    await expect(page.getByTestId("notification-detail")).toBeVisible();
    await page.goto("/notifications");
    await page.getByTestId("notif-search").fill("eng_notif_001");
    await page.getByText("SOS alert").first().click();
    await page.getByTestId("notif-mark-read").click();
    await page.getByTestId("notif-mark-unread").click();
    await page.getByTestId("notif-mark-all-read").click();
    await page.getByTestId("notification-bell").click();
    await expect(page.getByTestId("notification-drawer")).toBeVisible();
    await expect(page.getByTestId("notif-drawer-center-link")).toBeVisible();
  });

  test("templates preview and automations pause", async ({ page }) => {
    await login(page);
    await page.goto("/notifications/templates");
    await expect(page.getByTestId("templates-page")).toBeVisible();
    await page.getByTestId("template-open-tpl_001").click();
    await expect(page.getByTestId("detail-drawer").getByTestId("template-detail")).toBeVisible();
    await expect(page.getByTestId("template-preview-body")).toContainText(/Rahul|confirmed/i);

    await page.goto("/notifications/automations");
    await expect(page.getByTestId("automations-page")).toBeVisible();
    await page.getByTestId("automation-open-auto_001").click();
    const drawer = page.getByTestId("detail-drawer");
    await expect(drawer.getByTestId("automation-detail")).toBeVisible();
    await page.getByTestId("automation-pause").click();
    await page.getByTestId("reason-input").fill("Pause for E2E");
    await page.getByTestId("reason-confirm").click();
    await expect
      .poll(async () => drawer.getByTestId("automation-status-badge").getAttribute("data-status"), {
        timeout: 10_000,
      })
      .toBe("PAUSED");
  });

  test("campaigns validate and start", async ({ page }) => {
    await login(page);
    await page.goto("/notifications/campaigns");
    await expect(page.getByTestId("campaigns-page")).toBeVisible();
    await page.getByTestId("campaign-open-camp_001").click();
    const drawer = page.getByTestId("detail-drawer");
    await expect(drawer.getByTestId("campaign-detail")).toBeVisible();
    await page.getByTestId("campaign-start").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect
      .poll(async () => drawer.getByTestId("campaign-status-badge").getAttribute("data-status"), {
        timeout: 15_000,
      })
      .toBe("COMPLETED");
  });

  test("communications and history pages", async ({ page }) => {
    await login(page);
    await page.goto("/communications");
    await expect(page.getByTestId("communications-page")).toBeVisible();
    await expect(page.getByTestId("communications-table")).toBeVisible();
    await page.goto("/notifications/history");
    await expect(page.getByTestId("notification-history-page")).toBeVisible();
    await expect(page.getByTestId("delivery-history-table")).toBeVisible();
  });

  test("support workspace conversation and actions", async ({ page }) => {
    await login(page);
    await page.goto("/support?ticket=tkt_001");
    await expect(page.getByTestId("support-page")).toBeVisible();
    await expect(page.getByTestId("support-ticket-list")).toBeVisible();
    await expect(page.getByTestId("support-conversation")).toBeVisible();
    await expect(page.getByTestId("support-context")).toBeVisible();
    await expect(page.getByTestId("message-internal")).toBeVisible();

    await page.getByTestId("support-reply-input").fill("E2E admin reply");
    await page.getByTestId("support-reply-send").click();
    await expect(page.getByTestId("support-conversation")).toContainText("E2E admin reply");

    await page.getByTestId("support-note-input").fill("E2E internal note");
    await page.getByTestId("support-note-send").click();
    await expect(page.getByTestId("support-conversation").getByText("E2E internal note")).toBeVisible();

    await page.getByTestId("support-ticket-tkt_002").click();
    await page.getByTestId("support-assign").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByTestId("support-context")).toContainText(/admin/i);

    await page.getByTestId("support-escalate").click();
    await page.getByTestId("reason-input").fill("Escalate E2E");
    await page.getByTestId("reason-confirm").click();
    await expect
      .poll(
        async () =>
          page
            .getByTestId("support-conversation")
            .getByTestId("support-status-badge")
            .getAttribute("data-status"),
        { timeout: 10_000 },
      )
      .toBe("ESCALATED");

    await page.getByTestId("support-resolve").click();
    await page.getByTestId("reason-input").fill("Resolve E2E");
    await page.getByTestId("reason-confirm").click();
    await expect
      .poll(
        async () =>
          page
            .getByTestId("support-conversation")
            .getByTestId("support-status-badge")
            .getAttribute("data-status"),
        { timeout: 10_000 },
      )
      .toBe("RESOLVED");
  });

  test("realtime support message and notification without refresh", async ({ page }) => {
    await login(page);
    await page.goto("/support?ticket=tkt_002");
    await expect(page.getByTestId("support-conversation")).toBeVisible();
    await page.getByTestId("dev-event-simulator").getByText("DEV Events").click();
    await page.getByTestId("dev-support-message").click();
    await expect
      .poll(async () => page.getByTestId("support-conversation").textContent(), { timeout: 15_000 })
      .toMatch(/DEV simulator|reviewing your refund/i);

    // Assert without full navigation (in-memory mocks reset on hard reload)
    await page.getByTestId("notification-bell").click();
    await expect(page.getByTestId("notification-drawer")).toBeVisible();
    await expect
      .poll(async () => page.getByTestId("notification-drawer").textContent(), { timeout: 15_000 })
      .toMatch(/Support|ticket|reply|reviewing|Update on ticket/i);
  });

  test("dark mode across Phase 7", async ({ page }) => {
    await login(page);
    await page.getByTestId("theme-dark").click();
    await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
    for (const path of [
      "/notifications",
      "/notifications/templates",
      "/notifications/automations",
      "/notifications/campaigns",
      "/communications",
      "/support",
    ]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
  });
});
