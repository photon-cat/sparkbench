import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("home page loads and lists projects", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=SparkBench")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

    // At least the "blink" project should appear
    await expect(page.locator("a[href='/projects/blink']")).toBeVisible();
  });

  test("project page loads with editor and canvas", async ({ page }) => {
    await page.goto("/projects/blink");

    // Toolbar shows project name
    await expect(page.getByText("blink", { exact: true }).first()).toBeVisible();

    // Code editor panel loads (Monaco)
    await expect(page.getByRole("code")).toBeVisible({ timeout: 15_000 });

    // Schematic canvas renders (SVG overlay with wires/parts)
    await expect(page.locator("svg").first()).toBeVisible();
  });

  test("new project form is visible on home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=New Project")).toBeVisible();
    await expect(page.locator("input[placeholder='Project name...']")).toBeVisible();
    await expect(page.locator("button:text('Create')")).toBeVisible();
  });
});
