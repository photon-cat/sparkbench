import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, projects } from "@/lib/db/schema";
import { downloadFile } from "@/lib/storage";

/**
 * GET /api/builders/:username — public profile: user info + public projects
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;

    // Find user by username
    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (userRows.length === 0) {
      return NextResponse.json({ error: "Builder not found" }, { status: 404 });
    }

    const user = userRows[0];

    // Get their public projects
    const publicProjects = await db
      .select({
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
        diagramJson: projects.diagramJson,
        fileManifest: projects.fileManifest,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(and(eq(projects.ownerId, user.id), eq(projects.isPublic, true)));

    // Build project summaries
    const projectList = await Promise.all(
      publicProjects.map(async (p) => {
        const diagram = p.diagramJson as { parts?: { type: string }[] } | null;
        const parts = diagram?.parts ?? [];
        const partTypes = [...new Set(parts.map((pt) => pt.type.replace(/^wokwi-/, "").replace(/^sb-/, "")))];

        let lineCount = 0;
        try {
          const sketch = await downloadFile(p.id, "sketch.ino");
          if (sketch) lineCount = sketch.split("\n").length;
        } catch { /* ignore */ }

        const hasPCB = (p.fileManifest ?? []).includes("board.kicad_pcb");

        return {
          id: p.id,
          slug: p.slug,
          title: p.title,
          partCount: parts.length,
          partTypes: partTypes.slice(0, 6),
          lineCount,
          hasPCB,
          modifiedAt: p.updatedAt?.toISOString() ?? "",
        };
      }),
    );

    return NextResponse.json({
      user: {
        name: user.name,
        username: user.username,
        image: user.image,
      },
      projects: projectList,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
