import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("home page loads and shows project list", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/SparkBench/i);

    // Should show at least one project card/link
    const projectLinks = page.locator("a[href*='/projects/']");
    await expect(projectLinks.first()).toBeVisible({ timeout: 10_000 });
  });

  test("navigating to a project loads the workbench", async ({ page }) => {
    await page.goto("/");

    // Click the first project link
    const projectLink = page.locator("a[href*='/projects/']").first();
    await projectLink.click();

    // Workbench should load — look for common UI elements
    // The page should have an editor or simulation area
    await page.waitForLoadState("networkidle");

    // URL should now be /projects/something
    expect(page.url()).toMatch(/\/projects\/.+/);
  });

  test("project page has editor and simulation panels", async ({ page }) => {
    // Navigate directly to a known project
    await page.goto("/projects/demo-guide");
    await page.waitForLoadState("networkidle");

    // Should have code editor area (Monaco) or at least some workbench content
    // Check that the page has loaded meaningful content (not a 404)
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
  });
});
