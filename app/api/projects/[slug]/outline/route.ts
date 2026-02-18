import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { uploadFile, downloadFile } from "@/lib/storage";

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

    const rows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);

    if (rows.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    const content = await downloadFile(rows[0].id, "outline.svg");
    if (content === null) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(content, {
      headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to read outline: ${message}` },
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

    const rows = await db
      .select({ id: projects.id, fileManifest: projects.fileManifest })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `Project "${slug}" not found` },
        { status: 404 },
      );
    }

    const project = rows[0];
    const body = await request.text();

    await uploadFile(project.id, "outline.svg", body);

    const manifest = new Set((project.fileManifest as string[]) || []);
    manifest.add("outline.svg");
    await db
      .update(projects)
      .set({ fileManifest: Array.from(manifest), updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save outline: ${message}` },
      { status: 500 },
    );
  }
}
