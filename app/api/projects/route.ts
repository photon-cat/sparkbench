import { NextResponse } from "next/server";
import { eq, desc, or, ilike, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectStars } from "@/lib/db/schema";
import { generateProjectId } from "@/lib/db/projects";
import { uploadFile } from "@/lib/storage";
import { getServerSession } from "@/lib/auth-middleware";
import { logActivity } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface ProjectMeta {
  id: string;
  slug: string;
  partCount: number;
  partTypes: string[];
  lineCount: number;
  hasPCB: boolean;
  hasTests: boolean;
  starCount: number;
  modifiedAt: string;
}

function extractMeta(
  project: typeof projects.$inferSelect,
  starCount: number = 0,
): ProjectMeta {
  let partCount = 0;
  let partTypes: string[] = [];

  const diagram = project.diagramJson as any;
  if (diagram?.parts) {
    const parts = diagram.parts;
    partCount = parts.length;
    const typeSet = new Set<string>();
    for (const p of parts) {
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

  const manifest = (project.fileManifest as string[]) || [];
  const hasPCB = manifest.includes("board.kicad_pcb");
  const hasTests = manifest.includes("test.scenario.yaml");

  return {
    id: project.id,
    slug: project.slug,
    partCount,
    partTypes,
    lineCount: 0, // computed lazily if needed
    hasPCB,
    hasTests,
    starCount,
    modifiedAt: project.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const q = url.searchParams.get("q")?.trim() || "";
    const featured = url.searchParams.get("featured") === "true";
    const mine = url.searchParams.get("mine") === "true";

    // Get current user (if logged in)
    let userId: string | null = null;
    try {
      const session = await getServerSession();
      if (session?.user) userId = session.user.id;
    } catch { /* unauthenticated */ }

    // Build visibility condition
    let visibilityCondition;
    if (mine && userId) {
      // "My projects" — only show projects owned by user
      visibilityCondition = eq(projects.ownerId, userId);
    } else {
      visibilityCondition = userId
        ? or(eq(projects.isPublic, true), eq(projects.ownerId, userId))
        : eq(projects.isPublic, true);
    }

    // Build conditions array
    const conditions = [visibilityCondition];

    if (q) {
      // Escape ILIKE wildcard characters to prevent pattern injection
      const escaped = q.replace(/[%_\\]/g, "\\$&");
      conditions.push(
        or(ilike(projects.slug, `%${escaped}%`), ilike(projects.title, `%${escaped}%`))!,
      );
    }

    if (featured) {
      conditions.push(eq(projects.isFeatured, true));
    }

    const whereClause = conditions.length === 1 ? conditions[0]! : and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Fetch only the columns we need (avoid pulling large diagramJson for listing)
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
      .where(whereClause)
      .groupBy(projects.id)
      .orderBy(desc(sql`count(${projectStars.userId})`), desc(projects.updatedAt))
      .limit(limit)
      .offset(offset);

    const metas: ProjectMeta[] = rows.map((row) => extractMeta(row as unknown as typeof projects.$inferSelect, row.starCount));

    return NextResponse.json({ projects: metas, total, page, pages });
  } catch (err) {
    console.error("Failed to list projects:", err);
    return NextResponse.json(
      { error: "Failed to list projects" },
      { status: 500 },
    );
  }
}

const DEFAULT_SKETCH = `void setup() {
  // put your setup code here
}

void loop() {
  // put your main code here
}
`;

const DEFAULT_DIAGRAM = {
  version: 1,
  author: "",
  editor: "sparkbench",
  parts: [
    {
      type: "wokwi-arduino-uno",
      id: "uno",
      top: 0,
      left: 0,
      attrs: {},
    },
  ],
  connections: [],
};

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 },
      );
    }

    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!baseSlug) {
      return NextResponse.json(
        { error: "Invalid project name" },
        { status: 400 },
      );
    }

    // Require authentication to create projects
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Sign in to create projects" },
        { status: 401 },
      );
    }
    const ownerId = session.user.id;

    const id = generateProjectId();
    const slug = baseSlug;
    const diagramStr = JSON.stringify(DEFAULT_DIAGRAM, null, 2);

    // Insert DB row
    await db.insert(projects).values({
      id,
      slug,
      ownerId,
      title: name,
      diagramJson: DEFAULT_DIAGRAM,
      fileManifest: ["sketch.ino", "diagram.json"],
    });

    // Upload default files to MinIO
    await uploadFile(id, "sketch.ino", DEFAULT_SKETCH);
    await uploadFile(id, "diagram.json", diagramStr);

    logActivity("project.create", { userId: ownerId, projectId: id, metadata: { slug, name } });

    return NextResponse.json({ id, slug });
  } catch (err) {
    console.error("Failed to create project:", err);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
