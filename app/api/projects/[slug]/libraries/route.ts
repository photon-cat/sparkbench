import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const PROJECTS_DIR = path.join(process.cwd(), "projects");

export async function GET(
  _request: Request,
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

    const libPath = path.join(PROJECTS_DIR, slug, "libraries.txt");
    if (!existsSync(libPath)) {
      return new Response("", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    const content = await readFile(libPath, "utf-8");
    return new Response(content, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to read libraries: ${message}` },
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

    const content = await request.text();
    await writeFile(path.join(projectDir, "libraries.txt"), content, "utf-8");

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save libraries: ${message}` },
      { status: 500 }
    );
  }
}
