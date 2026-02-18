import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { uploadFile, downloadFile } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ chats: [] });
  }

  try {
    const data = await downloadFile(rows[0].id, "sparky-chats.json");
    if (!data) return NextResponse.json({ chats: [] });
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ chats: [] });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const rows = await db
    .select({ id: projects.id, fileManifest: projects.fileManifest })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: `Project "${slug}" not found` },
      { status: 404 },
    );
  }

  const project = rows[0];
  const body = await request.json();

  await uploadFile(project.id, "sparky-chats.json", JSON.stringify(body, null, 2));

  const manifest = new Set((project.fileManifest as string[]) || []);
  manifest.add("sparky-chats.json");
  await db
    .update(projects)
    .set({ fileManifest: Array.from(manifest), updatedAt: new Date() })
    .where(eq(projects.id, project.id));

  return NextResponse.json({ success: true });
}
