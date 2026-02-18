import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { uploadFile, downloadFile, deleteFile, listProjectFiles } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid project slug" },
        { status: 400 },
      );
    }

    const rows = await db
      .select({ id: projects.id })
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

    // Read main sketch
    const sketch = (await downloadFile(project.id, "sketch.ino")) || "";

    // Read extra source files (.h, .cpp, .c)
    const allFiles = await listProjectFiles(project.id);
    const files: { name: string; content: string }[] = [];
    for (const name of allFiles) {
      if (
        name !== "sketch.ino" &&
        (name.endsWith(".h") || name.endsWith(".cpp") || name.endsWith(".c"))
      ) {
        const content = await downloadFile(project.id, name);
        if (content !== null) {
          files.push({ name, content });
        }
      }
    }

    return NextResponse.json({ sketch, files });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to read sketch: ${message}` },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid project slug" },
        { status: 400 },
      );
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
    const { sketch, files } = await request.json();

    // Upload main sketch
    await uploadFile(project.id, "sketch.ino", sketch);

    if (Array.isArray(files)) {
      // Get existing extra files
      const allFiles = await listProjectFiles(project.id);
      const existingExtra = new Set(
        allFiles.filter(
          (e) => e.endsWith(".h") || e.endsWith(".cpp") || e.endsWith(".c"),
        ),
      );
      const newFileNames = new Set(
        files.map((f: { name: string }) => f.name),
      );

      // Delete removed files
      for (const old of existingExtra) {
        if (!newFileNames.has(old)) {
          await deleteFile(project.id, old);
        }
      }

      // Write current files
      for (const f of files as { name: string; content: string }[]) {
        if (/^[a-zA-Z0-9_.-]+$/.test(f.name)) {
          await uploadFile(project.id, f.name, f.content);
        }
      }

      // Update file manifest
      const currentManifest = (project.fileManifest as string[]) || [];
      const manifestSet = new Set(currentManifest);
      manifestSet.add("sketch.ino");
      for (const old of existingExtra) {
        if (!newFileNames.has(old)) manifestSet.delete(old);
      }
      for (const f of files as { name: string }[]) {
        if (/^[a-zA-Z0-9_.-]+$/.test(f.name)) manifestSet.add(f.name);
      }

      await db
        .update(projects)
        .set({ fileManifest: Array.from(manifestSet), updatedAt: new Date() })
        .where(eq(projects.id, project.id));
    } else {
      await db
        .update(projects)
        .set({ updatedAt: new Date() })
        .where(eq(projects.id, project.id));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save sketch: ${message}` },
      { status: 500 },
    );
  }
}
