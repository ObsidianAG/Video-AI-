import { test, expect } from "@playwright/test";

test("studio loads and shows LIVE mode by default", async ({ page }) => {
  await page.goto("/studio");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("LIVE", { exact: true })).toBeVisible({ timeout: 10000 });
});

test("loading template sets DEMO mode", async ({ page }) => {
  await page.goto("/studio");
  
  await page.click('[title="Load DEMO template"]');
  await page.click("text=Aurora Landing");
  
  await expect(page.getByText(/DEMO.*fixture output.*verdict cap: HOLD/)).toBeVisible();
});

test("template loads code into editor", async ({ page }) => {
  await page.goto("/studio");
  await page.waitForLoadState("networkidle");
  
  await page.click('[title="Load DEMO template"]');
  await page.click("text=Pomodoro App");
  
  // Loading a template sets DEMO mode and commits a snapshot with code
  await expect(page.getByText(/DEMO — fixture output/)).toBeVisible({ timeout: 5000 });
  // StatusBar char count should be non-zero (code was loaded)
  await expect(page.locator("text=/\\d+ chars/")).toBeVisible();
});

test("back to landing button works", async ({ page }) => {
  await page.goto("/studio");
  await page.click('[title="Back to landing"]');
  await expect(page).toHaveURL("/");
});

test("history rail shows no snapshots initially", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByText(/No snapshots yet/i)).toBeVisible();
});

test("refresh preview button is visible", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByText(/Refresh Preview/i)).toBeVisible();
});
