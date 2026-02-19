import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { generateProjectId } from "@/lib/db/projects";
import { copyProjectFiles } from "@/lib/storage";
import { getServerSession } from "@/lib/auth-middleware";

export async function POST(request: Request) {
  try {
    const { sourceId } = await request.json();

    if (!sourceId || typeof sourceId !== "string") {
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 },
      );
    }

    // Find source project
    const sourceRows = await db
      .select()
      .from(projects)
      .where(eq(projects.id, sourceId))
      .limit(1);

    if (sourceRows.length === 0) {
      return NextResponse.json(
        { error: "Source project not found" },
        { status: 404 },
      );
    }

    const source = sourceRows[0];

    const newId = generateProjectId();
    // Append first 4 chars of ID for URL uniqueness
    const baseSlug = source.slug.replace(/-[a-z0-9]{4}$/, ""); // strip old suffix if present
    const newSlug = `${baseSlug}-copy-${newId.slice(0, 4)}`;

    // Get owner from session
    let ownerId: string | null = null;
    try {
      const session = await getServerSession();
      if (session?.user) ownerId = session.user.id;
    } catch { /* unauthenticated is fine */ }

    // Insert new row
    await db.insert(projects).values({
      id: newId,
      slug: newSlug,
      ownerId,
      title: source.title ? `${source.title} (copy)` : newSlug,
      isPublic: source.isPublic,
      boardType: source.boardType,
      diagramJson: source.diagramJson,
      fileManifest: source.fileManifest,
    });

    // Copy all files in MinIO
    await copyProjectFiles(source.id, newId);

    return NextResponse.json({ id: newId, slug: newSlug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to copy project: ${message}` },
      { status: 500 },
    );
  }
}
