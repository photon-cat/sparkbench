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
      return new Response("", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    const content = await downloadFile(rows[0].id, "libraries.txt");
    return new Response(content || "", {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to read libraries: ${message}` },
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
    const content = await request.text();

    await uploadFile(project.id, "libraries.txt", content);

    const manifest = new Set((project.fileManifest as string[]) || []);
    manifest.add("libraries.txt");
    await db
      .update(projects)
      .set({ fileManifest: Array.from(manifest), updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save libraries: ${message}` },
      { status: 500 },
    );
  }
}
