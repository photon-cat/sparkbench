import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// The API routes use process.cwd()/projects, so we test against the real projects dir
// We create a temp test project and clean it up after

const PROJECTS_DIR = path.join(process.cwd(), "projects");
const TEST_SLUG = "vitest-test-project";
const TEST_DIR = path.join(PROJECTS_DIR, TEST_SLUG);

async function cleanup() {
  if (existsSync(TEST_DIR)) {
    await rm(TEST_DIR, { recursive: true });
  }
}

describe("Projects API routes", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  describe("GET /api/projects", () => {
    it("returns project list as JSON array", async () => {
      const { GET } = await import("../../api/projects/route");
      const response = await GET();
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      // Should have at least a few projects from the repo
      expect(data.length).toBeGreaterThan(0);
      // Each project should have expected fields
      const first = data[0];
      expect(first).toHaveProperty("slug");
      expect(first).toHaveProperty("partCount");
      expect(first).toHaveProperty("lineCount");
    });
  });

  describe("POST /api/projects", () => {
    it("creates a new project with default files", async () => {
      const { POST } = await import("../../api/projects/route");
      const request = new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "vitest test project" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slug).toBe(TEST_SLUG);
      expect(existsSync(path.join(TEST_DIR, "sketch.ino"))).toBe(true);
      expect(existsSync(path.join(TEST_DIR, "diagram.json"))).toBe(true);
    });

    it("rejects missing name", async () => {
      const { POST } = await import("../../api/projects/route");
      const request = new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("rejects duplicate project name", async () => {
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(path.join(TEST_DIR, "sketch.ino"), "void setup(){}", "utf-8");

      const { POST } = await import("../../api/projects/route");
      const request = new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "vitest test project" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
    });
  });
});
