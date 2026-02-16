import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { cp, readdir } from "fs/promises";
import path from "path";

const PROJECTS_DIR = path.join(process.cwd(), "projects");

export async function POST(request: Request) {
  try {
    const { sourceSlug } = await request.json();

    if (!sourceSlug || typeof sourceSlug !== "string") {
      return NextResponse.json({ error: "sourceSlug is required" }, { status: 400 });
    }

    const sourceDir = path.join(PROJECTS_DIR, sourceSlug);
    if (!existsSync(sourceDir)) {
      return NextResponse.json({ error: "Source project not found" }, { status: 404 });
    }

    // Find available slug: slug-copy, slug-copy-2, slug-copy-3, ...
    let newSlug = `${sourceSlug}-copy`;
    let attempt = 1;
    while (existsSync(path.join(PROJECTS_DIR, newSlug))) {
      attempt++;
      newSlug = `${sourceSlug}-copy-${attempt}`;
    }

    const destDir = path.join(PROJECTS_DIR, newSlug);
    await cp(sourceDir, destDir, { recursive: true });

    return NextResponse.json({ slug: newSlug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to copy project: ${message}` }, { status: 500 });
  }
}
