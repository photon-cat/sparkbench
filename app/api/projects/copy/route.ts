import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { generateProjectId } from "@/lib/db/projects";
import { copyProjectFiles } from "@/lib/storage";
import { getServerSession } from "@/lib/auth-middleware";

export async function POST(request: Request) {
  try {
    const { sourceSlug } = await request.json();

    if (!sourceSlug || typeof sourceSlug !== "string") {
      return NextResponse.json(
        { error: "sourceSlug is required" },
        { status: 400 },
      );
    }

    // Find source project
    const sourceRows = await db
      .select()
      .from(projects)
      .where(eq(projects.slug, sourceSlug))
      .limit(1);

    if (sourceRows.length === 0) {
      return NextResponse.json(
        { error: "Source project not found" },
        { status: 404 },
      );
    }

    const source = sourceRows[0];

    // Find available slug
    let newSlug = `${sourceSlug}-copy`;
    let attempt = 1;
    while (true) {
      const existing = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.slug, newSlug))
        .limit(1);
      if (existing.length === 0) break;
      attempt++;
      newSlug = `${sourceSlug}-copy-${attempt}`;
    }

    // Get owner from session
    let ownerId: string | null = null;
    try {
      const session = await getServerSession();
      if (session?.user) ownerId = session.user.id;
    } catch { /* unauthenticated is fine */ }

    const newId = generateProjectId();

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

    return NextResponse.json({ slug: newSlug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to copy project: ${message}` },
      { status: 500 },
    );
  }
}
