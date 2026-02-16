import { NextResponse } from "next/server";
import { readdir, mkdir, writeFile, readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const PROJECTS_DIR = path.join(process.cwd(), "projects");

interface ProjectMeta {
  slug: string;
  partCount: number;
  partTypes: string[];
  lineCount: number;
  hasPCB: boolean;
  hasTests: boolean;
  modifiedAt: string;
}

async function getProjectMeta(slug: string): Promise<ProjectMeta> {
  const dir = path.join(PROJECTS_DIR, slug);
  let partCount = 0;
  let partTypes: string[] = [];
  let lineCount = 0;
  let hasPCB = false;
  let hasTests = false;
  let modifiedAt = new Date().toISOString();

  try {
    const diagramPath = path.join(dir, "diagram.json");
    const raw = await readFile(diagramPath, "utf-8");
    const diagram = JSON.parse(raw);
    const parts = diagram.parts || [];
    partCount = parts.length;
    // Get unique part types, strip wokwi-/board- prefix for display
    const typeSet = new Set<string>();
    for (const p of parts) {
      const t = (p.type || "")
        .replace(/^wokwi-/, "")
        .replace(/^board-/, "")
        .replace(/^sb-/, "");
      if (t && t !== "arduino-uno" && t !== "arduino-nano" && t !== "arduino-mega") {
        typeSet.add(t);
      }
    }
    partTypes = Array.from(typeSet).slice(0, 6);

    const s = await stat(diagramPath);
    modifiedAt = s.mtime.toISOString();
  } catch { /* ignore */ }

  try {
    const sketch = await readFile(path.join(dir, "sketch.ino"), "utf-8");
    lineCount = sketch.split("\n").length;
  } catch { /* ignore */ }

  hasPCB = existsSync(path.join(dir, "board.kicad_pcb"));
  hasTests = existsSync(path.join(dir, "test.scenario.yaml"));

  return { slug, partCount, partTypes, lineCount, hasPCB, hasTests, modifiedAt };
}

export async function GET() {
  try {
    if (!existsSync(PROJECTS_DIR)) {
      return NextResponse.json([]);
    }

    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    const slugs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    const projects = await Promise.all(slugs.map(getProjectMeta));

    // Sort by modified date, newest first
    projects.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return NextResponse.json(projects);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to list projects: ${message}` },
      { status: 500 },
    );
  }
}

const DEFAULT_SKETCH = `void setup() {
  // put your setup code here
}

void loop() {
  // put your main code here
}
`;

const DEFAULT_DIAGRAM = {
  version: 1,
  author: "",
  editor: "sparkbench",
  parts: [
    {
      type: "wokwi-arduino-uno",
      id: "uno",
      top: 0,
      left: 0,
      attrs: {},
    },
  ],
  connections: [],
};

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 },
      );
    }

    // Slugify: lowercase, replace spaces/special chars with hyphens
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      return NextResponse.json(
        { error: "Invalid project name" },
        { status: 400 },
      );
    }

    const projectDir = path.join(PROJECTS_DIR, slug);
    if (existsSync(projectDir)) {
      return NextResponse.json(
        { error: "Project already exists" },
        { status: 409 },
      );
    }

    await mkdir(projectDir, { recursive: true });
    await writeFile(
      path.join(projectDir, "sketch.ino"),
      DEFAULT_SKETCH,
      "utf-8",
    );
    await writeFile(
      path.join(projectDir, "diagram.json"),
      JSON.stringify(DEFAULT_DIAGRAM, null, 2),
      "utf-8",
    );

    return NextResponse.json({ slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to create project: ${message}` },
      { status: 500 },
    );
  }
}
