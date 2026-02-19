import { NextResponse } from "next/server";
import { eq, desc, or, ilike, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { generateProjectId } from "@/lib/db/projects";
import { uploadFile, downloadFile } from "@/lib/storage";
import { getServerSession } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

interface ProjectMeta {
  id: string;
  slug: string;
  partCount: number;
  partTypes: string[];
  lineCount: number;
  hasPCB: boolean;
  hasTests: boolean;
  modifiedAt: string;
}

function extractMeta(
  project: typeof projects.$inferSelect,
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
    modifiedAt: project.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const q = url.searchParams.get("q")?.trim() || "";
    const featured = url.searchParams.get("featured") === "true";

    // Get current user (if logged in)
    let userId: string | null = null;
    try {
      const session = await getServerSession();
      if (session?.user) userId = session.user.id;
    } catch { /* unauthenticated */ }

    // Build visibility condition
    const visibilityCondition = userId
      ? or(eq(projects.isPublic, true), eq(projects.ownerId, userId))
      : eq(projects.isPublic, true);

    // Build conditions array
    const conditions = [visibilityCondition];

    if (q) {
      conditions.push(
        or(ilike(projects.slug, `%${q}%`), ilike(projects.title, `%${q}%`))!,
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

    // Fetch rows
    const rows = await db
      .select()
      .from(projects)
      .where(whereClause)
      .orderBy(desc(projects.updatedAt))
      .limit(limit)
      .offset(offset);

    const metas: ProjectMeta[] = [];
    for (const row of rows) {
      const meta = extractMeta(row);
      // Fetch sketch line count from MinIO
      const sketch = await downloadFile(row.id, "sketch.ino");
      if (sketch) {
        meta.lineCount = sketch.split("\n").length;
      }
      metas.push(meta);
    }

    return NextResponse.json({ projects: metas, total, page, pages });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to list projects: ${message}` },
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

    // Get owner from session (optional — unauthenticated users can create projects)
    let ownerId: string | null = null;
    try {
      const session = await getServerSession();
      if (session?.user) ownerId = session.user.id;
    } catch { /* unauthenticated is fine */ }

    const id = generateProjectId();
    // Append first 4 chars of project ID to ensure URL uniqueness
    const slug = `${baseSlug}-${id.slice(0, 4)}`;
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

    return NextResponse.json({ id, slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to create project: ${message}` },
      { status: 500 },
    );
  }
}
