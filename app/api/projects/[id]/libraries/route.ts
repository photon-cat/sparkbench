import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { uploadFile, downloadFile } from "@/lib/storage";
import { authorizeProjectRead, authorizeProjectWrite } from "@/lib/auth-middleware";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const readResult = await authorizeProjectRead(id);
    if (readResult.error) return readResult.error;

    const content = await downloadFile(readResult.project.id, "libraries.txt");
    return new Response(content || "", {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to read libraries: ${message}` },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const writeResult = await authorizeProjectWrite(id);
    if (writeResult.error) return writeResult.error;

    const project = writeResult.project;
    const content = await request.text();

    await uploadFile(project.id, "libraries.txt", content);

    const manifest = new Set((project.fileManifest as string[]) || []);
    manifest.add("libraries.txt");
    await db
      .update(projects)
      .set({ fileManifest: Array.from(manifest), updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save libraries: ${message}` },
      { status: 500 },
    );
  }
}
