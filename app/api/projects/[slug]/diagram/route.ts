import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { uploadFile } from "@/lib/storage";

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
      .select()
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `Diagram not found for project "${slug}"` },
        { status: 404 },
      );
    }

    const project = rows[0];
    return NextResponse.json({
      diagram: project.diagramJson,
      lastModified: project.updatedAt.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to read diagram: ${message}` },
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
      .select({ id: projects.id })
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
    const body = await request.json();

    // Update DB column (fast reads) + MinIO (durable store)
    await db
      .update(projects)
      .set({ diagramJson: body, updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    await uploadFile(project.id, "diagram.json", JSON.stringify(body, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save diagram: ${message}` },
      { status: 500 },
    );
  }
}
