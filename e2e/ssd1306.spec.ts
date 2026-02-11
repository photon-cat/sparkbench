import { test, expect } from "@playwright/test";

test("ssd1306-demo project page loads with OLED element", async ({ page }) => {
  // First verify the project appears on the home page
  await page.goto("/");
  await expect(page.locator("a[href='/projects/ssd1306-demo']")).toBeVisible({ timeout: 5_000 });

  // Navigate to project
  await page.goto("/projects/ssd1306-demo");
  await expect(page.locator("text=ssd1306-demo")).toBeVisible();

  // Wait for wokwi elements to load and diagram to render
  // The SSD1306 element wrapper should have data-part-id="oled1"
  await expect(page.locator("[data-part-id='oled1']")).toBeAttached({ timeout: 15_000 });
});
