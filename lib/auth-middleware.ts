import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { projects, projectOwners } from "./db/schema";

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

/**
 * Check if a user is an owner of a project.
 * Checks both the legacy `projects.ownerId` column and the `project_owners` table.
 */
export async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  // Check legacy single-owner column
  const rows = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (rows.length > 0 && rows[0].ownerId === userId) {
    return true;
  }

  // Check multi-owner table
  const ownerRows = await db
    .select({ userId: projectOwners.userId })
    .from(projectOwners)
    .where(and(eq(projectOwners.projectId, projectId), eq(projectOwners.userId, userId)))
    .limit(1);

  return ownerRows.length > 0;
}

/**
 * Check if the current user can read a project.
 * Public projects are readable by anyone. Private projects require ownership.
 * Returns the project row or a NextResponse error.
 */
export async function authorizeProjectRead(projectId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (rows.length === 0) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }

  const project = rows[0];

  if (project.isPublic) {
    return { project };
  }

  // Private project — must be an owner
  let userId: string | null = null;
  try {
    const session = await getServerSession();
    if (session?.user) userId = session.user.id;
  } catch { /* unauthenticated */ }

  if (!userId || !(await isProjectOwner(projectId, userId))) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }

  return { project };
}

/**
 * Check if the current user can write to a project.
 * Requires ownership. Unowned projects (ownerId=null) can be written by anyone (legacy).
 * Returns the project row or a NextResponse error.
 */
export async function authorizeProjectWrite(projectId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (rows.length === 0) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }

  const project = rows[0];

  // Unowned projects are writable by anyone (legacy/migration period)
  if (!project.ownerId) {
    return { project };
  }

  let userId: string | null = null;
  try {
    const session = await getServerSession();
    if (session?.user) userId = session.user.id;
  } catch { /* unauthenticated */ }

  if (!userId || !(await isProjectOwner(projectId, userId))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { project };
}
