import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { gcSandboxes } from "@/lib/sandbox-gc";
import { logger } from "@/lib/logger";

export async function POST() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await gcSandboxes(24 * 60 * 60 * 1000); // 24h
    logger.info("[admin] Sandbox GC completed", {
      cleaned: result.cleaned,
      errors: result.errors.length,
      userId: session.user.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
