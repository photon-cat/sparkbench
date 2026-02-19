import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const PROJECTS_DIR = path.join(process.cwd(), "projects");
const TEST_SLUG = "__vitest-diagram-test__";
const TEST_DIR = path.join(PROJECTS_DIR, TEST_SLUG);

const SAMPLE_DIAGRAM = {
  version: 1,
  author: "test",
  editor: "sparkbench",
  parts: [{ type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0, attrs: {} }],
  connections: [],
};

async function cleanup() {
  if (existsSync(TEST_DIR)) {
    await rm(TEST_DIR, { recursive: true });
  }
}

describe("Diagram API routes", () => {
  beforeEach(async () => {
    await cleanup();
    await mkdir(TEST_DIR, { recursive: true });
    await writeFile(
      path.join(TEST_DIR, "diagram.json"),
      JSON.stringify(SAMPLE_DIAGRAM, null, 2),
      "utf-8",
    );
  });
  afterEach(cleanup);

  describe("GET /api/projects/[id]/diagram", () => {
    it("reads the diagram file", async () => {
      const { GET } = await import("../../api/projects/[id]/diagram/route");
      const response = await GET(
        new Request("http://localhost"),
        { params: Promise.resolve({ id: TEST_SLUG }) },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.diagram.version).toBe(1);
      expect(data.diagram.parts).toHaveLength(1);
      expect(data).toHaveProperty("lastModified");
    });

    it("returns 404 for missing diagram", async () => {
      const { GET } = await import("../../api/projects/[id]/diagram/route");
      const response = await GET(
        new Request("http://localhost"),
        { params: Promise.resolve({ id: "nonexistent-project-xyz" }) },
      );
      expect(response.status).toBe(404);
    });

    it("validates id against path traversal", async () => {
      const { GET } = await import("../../api/projects/[id]/diagram/route");
      const response = await GET(
        new Request("http://localhost"),
        { params: Promise.resolve({ id: "../../etc" }) },
      );
      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/projects/[id]/diagram", () => {
    it("writes the diagram file", async () => {
      const { PUT } = await import("../../api/projects/[id]/diagram/route");
      const updated = { ...SAMPLE_DIAGRAM, author: "updated" };
      const response = await PUT(
        new Request("http://localhost", {
          method: "PUT",
          body: JSON.stringify(updated),
          headers: { "Content-Type": "application/json" },
        }),
        { params: Promise.resolve({ id: TEST_SLUG }) },
      );

      expect(response.status).toBe(200);
      const saved = JSON.parse(await readFile(path.join(TEST_DIR, "diagram.json"), "utf-8"));
      expect(saved.author).toBe("updated");
    });

    it("returns 404 for missing project", async () => {
      const { PUT } = await import("../../api/projects/[id]/diagram/route");
      const response = await PUT(
        new Request("http://localhost", {
          method: "PUT",
          body: JSON.stringify(SAMPLE_DIAGRAM),
          headers: { "Content-Type": "application/json" },
        }),
        { params: Promise.resolve({ id: "nonexistent-project-xyz" }) },
      );
      expect(response.status).toBe(404);
    });
  });
});
