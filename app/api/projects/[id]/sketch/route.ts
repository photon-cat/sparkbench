import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { uploadFile, downloadFile, deleteFile, listProjectFiles } from "@/lib/storage";
import { authorizeProjectRead, authorizeProjectWrite } from "@/lib/auth-middleware";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const readResult = await authorizeProjectRead(id);
    if (readResult.error) return readResult.error;

    const sketch = (await downloadFile(id, "sketch.ino")) || "";

    const allFiles = await listProjectFiles(id);
    const files: { name: string; content: string }[] = [];
    for (const name of allFiles) {
      if (name !== "sketch.ino" && (name.endsWith(".h") || name.endsWith(".cpp") || name.endsWith(".c"))) {
        const content = await downloadFile(id, name);
        if (content !== null) files.push({ name, content });
      }
    }

    return NextResponse.json({ sketch, files });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to read sketch: ${message}` }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const writeResult = await authorizeProjectWrite(id);
    if (writeResult.error) return writeResult.error;

    const project = writeResult.project;
    const { sketch, files } = await request.json();

    await uploadFile(id, "sketch.ino", sketch);

    if (Array.isArray(files)) {
      const allFiles = await listProjectFiles(id);
      const existingExtra = new Set(allFiles.filter((e) => e.endsWith(".h") || e.endsWith(".cpp") || e.endsWith(".c")));
      const newFileNames = new Set(files.map((f: { name: string }) => f.name));

      for (const old of existingExtra) {
        if (!newFileNames.has(old)) await deleteFile(id, old);
      }

      for (const f of files as { name: string; content: string }[]) {
        if (/^[a-zA-Z0-9_.-]+$/.test(f.name)) await uploadFile(id, f.name, f.content);
      }

      const manifestSet = new Set((project.fileManifest as string[]) || []);
      manifestSet.add("sketch.ino");
      for (const old of existingExtra) { if (!newFileNames.has(old)) manifestSet.delete(old); }
      for (const f of files as { name: string }[]) { if (/^[a-zA-Z0-9_.-]+$/.test(f.name)) manifestSet.add(f.name); }

      await db.update(projects).set({ fileManifest: Array.from(manifestSet), updatedAt: new Date() }).where(eq(projects.id, id));
    } else {
      await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to save sketch: ${message}` }, { status: 500 });
  }
}
