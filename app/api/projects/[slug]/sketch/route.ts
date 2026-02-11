import { NextResponse } from "next/server";
import { readFile, readdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const PROJECTS_DIR = path.join(process.cwd(), "projects");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Validate slug (prevent path traversal)
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid project slug" },
        { status: 400 }
      );
    }

    const projectDir = path.join(PROJECTS_DIR, slug);
    if (!existsSync(projectDir)) {
      return NextResponse.json(
        { error: `Project "${slug}" not found` },
        { status: 404 }
      );
    }

    // Read main sketch
    const sketchPath = path.join(projectDir, "sketch.ino");
    const sketch = await readFile(sketchPath, "utf-8");

    // Read any .h files in the project directory
    const files: { name: string; content: string }[] = [];
    const entries = await readdir(projectDir);
    for (const entry of entries) {
      if (entry.endsWith(".h")) {
        const content = await readFile(path.join(projectDir, entry), "utf-8");
        files.push({ name: entry, content });
      }
    }

    return NextResponse.json({ sketch, files });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to read sketch: ${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid project slug" },
        { status: 400 }
      );
    }

    const projectDir = path.join(PROJECTS_DIR, slug);
    if (!existsSync(projectDir)) {
      return NextResponse.json(
        { error: `Project "${slug}" not found` },
        { status: 404 }
      );
    }

    const { sketch } = await request.json();
    await writeFile(path.join(projectDir, "sketch.ino"), sketch, "utf-8");

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save sketch: ${message}` },
      { status: 500 }
    );
  }
}
