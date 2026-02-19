import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { generateProjectId } from "@/lib/db/projects";
import { copyProjectFiles } from "@/lib/storage";
import { getServerSession, authorizeProjectRead } from "@/lib/auth-middleware";
import { logActivity } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    // Require authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Sign in to copy projects" },
        { status: 401 },
      );
    }

    const { sourceId } = await request.json();

    if (!sourceId || typeof sourceId !== "string") {
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 },
      );
    }

    // Verify read access to source project
    const readResult = await authorizeProjectRead(sourceId);
    if (readResult.error) return readResult.error;

    const source = readResult.project;

    const newId = generateProjectId();
    // Append first 4 chars of ID for URL uniqueness
    const baseSlug = source.slug.replace(/-[a-z0-9]{4}$/, ""); // strip old suffix if present
    const newSlug = `${baseSlug}-copy-${newId.slice(0, 4)}`;

    const ownerId = session.user.id;

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

    logActivity("project.copy", { userId: ownerId, projectId: newId, metadata: { sourceId, slug: newSlug } });

    return NextResponse.json({ id: newId, slug: newSlug });
  } catch (err) {
    console.error("Failed to copy project:", err);
    return NextResponse.json(
      { error: "Failed to copy project" },
      { status: 500 },
    );
  }
}
