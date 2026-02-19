import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const PROJECTS_DIR = path.join(process.cwd(), "projects");
const TEST_SLUG = "__vitest-sketch-test__";
const TEST_DIR = path.join(PROJECTS_DIR, TEST_SLUG);

async function cleanup() {
  if (existsSync(TEST_DIR)) {
    await rm(TEST_DIR, { recursive: true });
  }
}

describe("Sketch API routes", () => {
  beforeEach(async () => {
    await cleanup();
    await mkdir(TEST_DIR, { recursive: true });
    await writeFile(path.join(TEST_DIR, "sketch.ino"), "void setup() {}\nvoid loop() {}\n", "utf-8");
  });
  afterEach(cleanup);

  describe("GET /api/projects/[id]/sketch", () => {
    it("reads the sketch file", async () => {
      const { GET } = await import("../../api/projects/[id]/sketch/route");
      const response = await GET(
        new Request("http://localhost"),
        { params: Promise.resolve({ id: TEST_SLUG }) },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sketch).toContain("void setup()");
    });

    it("returns 404 for missing project", async () => {
      const { GET } = await import("../../api/projects/[id]/sketch/route");
      const response = await GET(
        new Request("http://localhost"),
        { params: Promise.resolve({ id: "nonexistent-project-xyz" }) },
      );
      expect(response.status).toBe(404);
    });

    it("validates id against path traversal", async () => {
      const { GET } = await import("../../api/projects/[id]/sketch/route");
      const response = await GET(
        new Request("http://localhost"),
        { params: Promise.resolve({ id: "../etc" }) },
      );
      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/projects/[id]/sketch", () => {
    it("writes the sketch file", async () => {
      const { PUT } = await import("../../api/projects/[id]/sketch/route");
      const newSketch = "void setup() { Serial.begin(9600); }\nvoid loop() {}\n";
      const response = await PUT(
        new Request("http://localhost", {
          method: "PUT",
          body: JSON.stringify({ sketch: newSketch }),
          headers: { "Content-Type": "application/json" },
        }),
        { params: Promise.resolve({ id: TEST_SLUG }) },
      );

      expect(response.status).toBe(200);
      const saved = await readFile(path.join(TEST_DIR, "sketch.ino"), "utf-8");
      expect(saved).toContain("Serial.begin(9600)");
    });
  });
});
