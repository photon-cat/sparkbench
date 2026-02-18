import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { generateProjectId } from "@/lib/db/projects";
import { uploadFile, downloadFile } from "@/lib/storage";
import { getServerSession } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

interface ProjectMeta {
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
    slug: project.slug,
    partCount,
    partTypes,
    lineCount: 0, // computed lazily if needed
    hasPCB,
    hasTests,
    modifiedAt: project.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt));

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

    return NextResponse.json(metas);
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

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      return NextResponse.json(
        { error: "Invalid project name" },
        { status: 400 },
      );
    }

    // Check slug uniqueness
    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Project already exists" },
        { status: 409 },
      );
    }

    // Get owner from session (optional — unauthenticated users can create projects)
    let ownerId: string | null = null;
    try {
      const session = await getServerSession();
      if (session?.user) ownerId = session.user.id;
    } catch { /* unauthenticated is fine */ }

    const id = generateProjectId();
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

    return NextResponse.json({ slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to create project: ${message}` },
      { status: 500 },
    );
  }
}
