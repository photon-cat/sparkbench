import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { authorizeProjectWrite, getServerSession, isProjectOwner } from "@/lib/auth-middleware";
import { listProjectFiles, deleteFile } from "@/lib/storage";
import { logger, logActivity } from "@/lib/logger";
import { destroyProjectSandbox } from "@/lib/sandbox";

/**
 * GET /api/projects/:id/settings — project metadata (isPublic, isOwner, title)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
        isPublic: projects.isPublic,
        ownerId: projects.ownerId,
      })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = rows[0];

    let userId: string | null = null;
    try {
      const session = await getServerSession();
      if (session?.user) userId = session.user.id;
    } catch { /* unauthenticated */ }

    const isOwner = !!userId && await isProjectOwner(id, userId);

    // Non-owners can't see private projects
    if (!project.isPublic && !isOwner) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch owner username
    let ownerUsername: string | null = null;
    if (project.ownerId) {
      const ownerRows = await db
        .select({ username: users.username, name: users.name })
        .from(users)
        .where(eq(users.id, project.ownerId))
        .limit(1);
      if (ownerRows.length > 0) {
        ownerUsername = ownerRows[0].username || ownerRows[0].name;
      }
    }

    return NextResponse.json({
      id: project.id,
      slug: project.slug,
      title: project.title,
      isPublic: project.isPublic,
      isOwner,
      ownerUsername,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/:id/settings — update project settings (visibility, title)
 */
export async function PATCH(
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
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.isPublic === "boolean") {
      updates.isPublic = body.isPublic;
    }
    if (typeof body.title === "string" && body.title.trim()) {
      updates.title = body.title.trim();
    }

    await db.update(projects).set(updates).where(eq(projects.id, id));

    logActivity("project.update", {
      userId: result.project.ownerId,
      projectId: id,
      metadata: { fields: Object.keys(updates).filter(k => k !== "updatedAt") },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/:id/settings — delete project (owner only)
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const result = await authorizeProjectWrite(id);
    if (result.error) return result.error;

    // Destroy sandbox container + volume
    destroyProjectSandbox(id).catch(() => {});

    // Delete files from MinIO
    try {
      const files = await listProjectFiles(id);
      for (const file of files) {
        await deleteFile(id, file);
      }
    } catch (err) {
      logger.error("[delete-project] Failed to delete files", { projectId: id, error: String(err) });
    }

    logActivity("project.delete", {
      userId: result.project.ownerId,
      projectId: id,
    });

    // Delete from DB (cascades handle related tables)
    await db.delete(projects).where(eq(projects.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
