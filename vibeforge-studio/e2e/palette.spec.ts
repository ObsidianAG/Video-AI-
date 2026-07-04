import { test, expect } from "@playwright/test";

test("command palette opens with Ctrl+K", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator("body").press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("command palette shows commands", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator("body").press("Control+k");
  
  await expect(page.getByText(/Open Studio/i)).toBeVisible();
  await expect(page.getByText(/Theme:/i).first()).toBeVisible();
});

test("command palette filters commands", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator("body").press("Control+k");
  
  await page.fill("input[placeholder*='command']", "theme");
  
  await expect(page.getByText(/Theme: Aurora/i)).toBeVisible();
  await expect(page.getByText(/Open Studio/i)).not.toBeVisible();
});

test("command palette works on studio page", async ({ page }) => {
  await page.goto("/studio");
  await page.waitForLoadState("networkidle");
  await page.locator("body").press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
});
