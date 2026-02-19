import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-middleware";
import { getUserUsage } from "@/lib/usage";

/**
 * GET /api/user/usage — current user's AI usage for this billing period
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await getUserUsage(session.user.id);

    return NextResponse.json({
      plan: usage.plan,
      limitUsd: usage.limitUsd,
      usedUsd: usage.usedUsd,
      periodStart: usage.periodStart.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
