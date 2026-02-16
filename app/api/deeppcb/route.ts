import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { DeepPCBClient } from "@/lib/deeppcb-client";

const PROJECTS_DIR = path.join(process.cwd(), "projects");

// Allow long-running routing jobs (up to 2 hours)
export const maxDuration = 7200;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let slug: string;
  try {
    const body = await request.json();
    slug = body.slug;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid project slug" }, { status: 400 });
  }

  const apiKey = process.env.DEEPPCB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPPCB_API_KEY not configured. Add it to your .env.local file." },
      { status: 500 },
    );
  }

  const pcbPath = path.join(PROJECTS_DIR, slug, "board.kicad_pcb");
  if (!existsSync(pcbPath)) {
    return NextResponse.json(
      { error: "No board.kicad_pcb found for this project. Generate a PCB layout first." },
      { status: 404 },
    );
  }

  const pcbContent = await readFile(pcbPath, "utf-8");
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const write = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        const client = new DeepPCBClient(apiKey);

        const routedPcb = await client.autoroute(pcbContent, (progress) => {
          write({
            type: "progress",
            step: progress.step,
            message: progress.message,
            percent: progress.percent,
          });
        });

        // Save the routed board back to disk
        await writeFile(pcbPath, routedPcb, "utf-8");

        write({ type: "done", message: "Routing complete! Board updated." });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        write({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
