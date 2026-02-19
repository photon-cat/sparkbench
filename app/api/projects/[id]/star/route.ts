import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectStars } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth-middleware";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ starred: false });
  }

  const rows = await db
    .select()
    .from(projectStars)
    .where(
      and(
        eq(projectStars.projectId, projectId),
        eq(projectStars.userId, session.user.id),
      ),
    )
    .limit(1);

  return NextResponse.json({ starred: rows.length > 0 });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const userId = session.user.id;

  // Check if already starred
  const existing = await db
    .select()
    .from(projectStars)
    .where(
      and(
        eq(projectStars.projectId, projectId),
        eq(projectStars.userId, userId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    // Unstar
    await db
      .delete(projectStars)
      .where(
        and(
          eq(projectStars.projectId, projectId),
          eq(projectStars.userId, userId),
        ),
      );
    return NextResponse.json({ starred: false });
  } else {
    // Star
    await db.insert(projectStars).values({ projectId, userId });
    return NextResponse.json({ starred: true });
  }
}
