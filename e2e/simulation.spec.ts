import { test, expect } from "@playwright/test";

test.describe("Simulation tests", () => {
  test("project page loads sketch content via API", async ({ page }) => {
    // Test that the API returns sketch data for a known project
    const response = await page.request.get("/api/projects/demo-guide/sketch");
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("sketch");
    expect(data.sketch.length).toBeGreaterThan(0);
  });

  test("project page loads diagram via API", async ({ page }) => {
    const response = await page.request.get("/api/projects/demo-guide/diagram");
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("diagram");
    expect(data.diagram).toHaveProperty("parts");
    expect(data.diagram.parts.length).toBeGreaterThan(0);
  });

  test("projects list API returns data", async ({ page }) => {
    const response = await page.request.get("/api/projects");
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Each project should have required metadata
    const first = data[0];
    expect(first).toHaveProperty("slug");
    expect(first).toHaveProperty("partCount");
  });
});
