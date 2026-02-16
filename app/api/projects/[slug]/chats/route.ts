import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const PROJECTS_DIR = path.join(process.cwd(), "projects");

function chatsPath(slug: string): string {
  return path.join(PROJECTS_DIR, slug, "sparky-chats.json");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const fp = chatsPath(slug);
  if (!existsSync(fp)) {
    return NextResponse.json({ chats: [] });
  }

  try {
    const data = await readFile(fp, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ chats: [] });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const dir = path.join(PROJECTS_DIR, slug);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const body = await request.json();
  await writeFile(chatsPath(slug), JSON.stringify(body, null, 2), "utf-8");
  return NextResponse.json({ success: true });
}
