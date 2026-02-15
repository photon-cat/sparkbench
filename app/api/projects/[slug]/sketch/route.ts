import { NextResponse } from "next/server";
import { readFile, readdir, writeFile, unlink } from "fs/promises";
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

    // Read any extra source files (.h, .cpp, .c) in the project directory
    const files: { name: string; content: string }[] = [];
    const entries = await readdir(projectDir);
    for (const entry of entries) {
      if (entry !== "sketch.ino" && (entry.endsWith(".h") || entry.endsWith(".cpp") || entry.endsWith(".c"))) {
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

    const { sketch, files } = await request.json();
    await writeFile(path.join(projectDir, "sketch.ino"), sketch, "utf-8");

    // Save project files (e.g. .h files) if provided
    if (Array.isArray(files)) {
      // Get existing extra files to detect deletions
      const entries = await readdir(projectDir);
      const existingExtra = new Set(entries.filter((e) => e.endsWith(".h") || e.endsWith(".cpp") || e.endsWith(".c")));
      const newFileNames = new Set(files.map((f: { name: string }) => f.name));

      // Delete removed files
      for (const old of existingExtra) {
        if (!newFileNames.has(old)) {
          await unlink(path.join(projectDir, old));
        }
      }

      // Write current files
      for (const f of files as { name: string; content: string }[]) {
        // Validate filename (prevent path traversal)
        if (/^[a-zA-Z0-9_.-]+$/.test(f.name)) {
          await writeFile(path.join(projectDir, f.name), f.content, "utf-8");
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save sketch: ${message}` },
      { status: 500 }
    );
  }
}
