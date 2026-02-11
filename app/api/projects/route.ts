import { NextResponse } from "next/server";
import { readdir, mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const PROJECTS_DIR = path.join(process.cwd(), "projects");

export async function GET() {
  try {
    if (!existsSync(PROJECTS_DIR)) {
      return NextResponse.json([]);
    }

    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

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
