import { NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectStars } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      isPublic: projects.isPublic,
      diagramJson: projects.diagramJson,
      fileManifest: projects.fileManifest,
      updatedAt: projects.updatedAt,
      starCount: sql<number>`count(${projectStars.userId})::int`,
    })
    .from(projects)
    .leftJoin(projectStars, eq(projects.id, projectStars.projectId))
    .where(eq(projects.ownerId, session.user.id))
    .groupBy(projects.id)
    .orderBy(desc(projects.updatedAt));

  const metas = rows.map((row) => {
    let partCount = 0;
    let partTypes: string[] = [];
    const diagram = row.diagramJson as any;
    if (diagram?.parts) {
      partCount = diagram.parts.length;
      const typeSet = new Set<string>();
      for (const p of diagram.parts) {
        const t = (p.type || "")
          .replace(/^wokwi-/, "")
          .replace(/^board-/, "")
          .replace(/^sb-/, "");
        if (t && t !== "arduino-uno" && t !== "arduino-nano" && t !== "arduino-mega") {
          typeSet.add(t);
        }
      }
      partTypes = Array.from(typeSet).slice(0, 6);
    }
    const manifest = (row.fileManifest as string[]) || [];
    return {
      id: row.id,
      slug: row.slug,
      partCount,
      partTypes,
      lineCount: 0,
      hasPCB: manifest.includes("board.kicad_pcb"),
      hasTests: manifest.includes("test.scenario.yaml"),
      starCount: row.starCount,
      modifiedAt: row.updatedAt.toISOString(),
    };
  });

  return NextResponse.json(metas);
}
