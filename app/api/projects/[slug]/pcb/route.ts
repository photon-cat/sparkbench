import { NextResponse } from "next/server";
import { readFile, writeFile, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const PROJECTS_DIR = path.join(process.cwd(), "projects");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid project slug" },
        { status: 400 },
      );
    }

    const pcbPath = path.join(PROJECTS_DIR, slug, "board.kicad_pcb");
    if (!existsSync(pcbPath)) {
      return new NextResponse(null, { status: 404 });
    }

    const [content, fileStat] = await Promise.all([
      readFile(pcbPath, "utf-8"),
      stat(pcbPath),
    ]);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Last-Modified": fileStat.mtime.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to read PCB: ${message}` },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid project slug" },
        { status: 400 },
      );
    }

    const projectDir = path.join(PROJECTS_DIR, slug);
    if (!existsSync(projectDir)) {
      return NextResponse.json(
        { error: `Project "${slug}" not found` },
        { status: 404 },
      );
    }

    const body = await request.text();
    await writeFile(path.join(projectDir, "board.kicad_pcb"), body, "utf-8");

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save PCB: ${message}` },
      { status: 500 },
    );
  }
}
