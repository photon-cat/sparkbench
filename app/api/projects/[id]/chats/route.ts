import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { uploadFile, downloadFile } from "@/lib/storage";
import { authorizeProjectWrite } from "@/lib/auth-middleware";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Only the project owner can read chat sessions (chats are private)
  const writeResult = await authorizeProjectWrite(id);
  if (writeResult.error) return NextResponse.json({ chats: [] });

  try {
    const data = await downloadFile(writeResult.project.id, "sparky-chats.json");
    if (!data) return NextResponse.json({ chats: [] });
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ chats: [] });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Only the project owner can save chat sessions
  const writeResult = await authorizeProjectWrite(id);
  if (writeResult.error) return writeResult.error;

  const project = writeResult.project;
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
