import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { uploadFile } from "@/lib/storage";
import { authorizeProjectRead, authorizeProjectWrite } from "@/lib/auth-middleware";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const result = await authorizeProjectRead(id);
    if (result.error) return result.error;

    const project = result.project;
    return NextResponse.json({
      diagram: project.diagramJson,
      lastModified: project.updatedAt.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to read diagram: ${message}` }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const result = await authorizeProjectWrite(id);
    if (result.error) return result.error;

    const body = await request.json();

    await db
      .update(projects)
      .set({ diagramJson: body, updatedAt: new Date() })
      .where(eq(projects.id, id));

    await uploadFile(id, "diagram.json", JSON.stringify(body, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to save diagram: ${message}` }, { status: 500 });
  }
}
