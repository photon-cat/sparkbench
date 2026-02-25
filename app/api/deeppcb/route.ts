import { NextResponse } from "next/server";
import { downloadFile, uploadFile } from "@/lib/storage";
import { authorizeProjectWrite, getServerSession } from "@/lib/auth-middleware";
import { DeepPCBClient } from "@/lib/deeppcb-client";

// Allow long-running routing jobs (up to 2 hours)
export const maxDuration = 7200;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Require authentication
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let projectId: string;
  try {
    const body = await request.json();
    projectId = body.projectId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!projectId || !/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  // Require write access to the project
  const writeResult = await authorizeProjectWrite(projectId);
  if (writeResult.error) return writeResult.error;

  const apiKey = process.env.DEEPPCB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "PCB routing is not configured." },
      { status: 500 },
    );
  }

  const pcbContent = await downloadFile(projectId, "board.kicad_pcb");
  if (!pcbContent) {
    return NextResponse.json(
      { error: "No board.kicad_pcb found for this project. Generate a PCB layout first." },
      { status: 404 },
    );
  }

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

        // Save the routed board back to MinIO
        await uploadFile(projectId, "board.kicad_pcb", routedPcb);

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
