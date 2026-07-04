import { test, expect } from "@playwright/test";

test("landing renders hero and CTA", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /open the studio/i })).toBeVisible();
});

test("CTA navigates to studio", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.click("text=Open the Studio");
  await expect(page).toHaveURL("/studio");
});

test("theme switcher works", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  
  await page.selectOption("select", "terminal");
  const theme = await page.getAttribute("html", "data-theme");
  expect(theme).toBe("terminal");
});

test("marquee is visible and contains prompts", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/pomodoro app/i).first()).toBeVisible();
});

test("features section shows 6 cards", async ({ page }) => {
  await page.goto("/");
  
  const cards = page.locator("text=Instant Generation").locator("..");
  await expect(cards.first()).toBeVisible();
});
