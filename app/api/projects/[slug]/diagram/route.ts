import { NextResponse } from "next/server";
import { readFile, writeFile, stat } from "fs/promises";
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

    const diagramPath = path.join(PROJECTS_DIR, slug, "diagram.json");
    if (!existsSync(diagramPath)) {
      return NextResponse.json(
        { error: `Diagram not found for project "${slug}"` },
        { status: 404 }
      );
    }

    const [content, fileStat] = await Promise.all([
      readFile(diagramPath, "utf-8"),
      stat(diagramPath),
    ]);
    const diagram = JSON.parse(content);

    return NextResponse.json({ diagram, lastModified: fileStat.mtime.toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to read diagram: ${message}` },
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

    const diagramPath = path.join(PROJECTS_DIR, slug, "diagram.json");
    if (!existsSync(path.join(PROJECTS_DIR, slug))) {
      return NextResponse.json(
        { error: `Project "${slug}" not found` },
        { status: 404 }
      );
    }

    const body = await request.json();
    await writeFile(diagramPath, JSON.stringify(body, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save diagram: ${message}` },
      { status: 500 }
    );
  }
}
