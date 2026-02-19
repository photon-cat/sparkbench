import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activityLog, aiUsageLog, projects } from "@/lib/db/schema";
import { sql, gte, and, count, sum, avg } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { execFile } from "child_process";

function periodToDate(p: string): Date {
  const ms =
    p === "30d"
      ? 30 * 86400000
      : p === "7d"
        ? 7 * 86400000
        : 86400000;
  return new Date(Date.now() - ms);
}

function exec(
  cmd: string,
  args: string[],
): Promise<{ exitCode: number; stdout: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 10_000 }, (error, stdout) => {
      resolve({
        exitCode: typeof error?.code === "number" ? error.code : error ? 1 : 0,
        stdout: stdout || "",
      });
    });
  });
}

async function getBuildStats(since: Date) {
  const rows = await db
    .select({
      action: activityLog.action,
      cnt: count(),
      avgMs: avg(activityLog.durationMs),
    })
    .from(activityLog)
    .where(
      and(
        gte(activityLog.createdAt, since),
        sql`${activityLog.action} IN ('build.success', 'build.error')`,
      ),
    )
    .groupBy(activityLog.action);

  const success = rows.find((r) => r.action === "build.success");
  const error = rows.find((r) => r.action === "build.error");
  return {
    success: Number(success?.cnt ?? 0),
    error: Number(error?.cnt ?? 0),
    avgDurationMs: Math.round(Number(success?.avgMs ?? 0)),
  };
}

async function getChatStats(since: Date) {
  const countRows = await db
    .select({ action: activityLog.action, cnt: count() })
    .from(activityLog)
    .where(
      and(
        gte(activityLog.createdAt, since),
        sql`${activityLog.action} LIKE 'chat.%'`,
      ),
    )
    .groupBy(activityLog.action);

  const costRows = await db
    .select({
      totalCost: sum(aiUsageLog.costUsd),
      totalTurns: sum(aiUsageLog.turns),
      cnt: count(),
    })
    .from(aiUsageLog)
    .where(gte(aiUsageLog.createdAt, since));

  return {
    success: Number(countRows.find((r) => r.action === "chat.success")?.cnt ?? 0),
    error: Number(countRows.find((r) => r.action === "chat.error")?.cnt ?? 0),
    toolError: Number(countRows.find((r) => r.action === "chat.tool_error")?.cnt ?? 0),
    totalCostUsd: Number(costRows[0]?.totalCost ?? 0),
    totalTurns: Number(costRows[0]?.totalTurns ?? 0),
    sessions: Number(costRows[0]?.cnt ?? 0),
  };
}

async function getActiveUsers(since: Date) {
  const rows = await db
    .select({ cnt: sql<number>`COUNT(DISTINCT ${activityLog.userId})` })
    .from(activityLog)
    .where(gte(activityLog.createdAt, since));
  return Number(rows[0]?.cnt ?? 0);
}

async function getProjectCounts(since: Date) {
  const [totalRows, newRows] = await Promise.all([
    db.select({ cnt: count() }).from(projects),
    db.select({ cnt: count() }).from(projects).where(gte(projects.createdAt, since)),
  ]);
  return {
    total: Number(totalRows[0]?.cnt ?? 0),
    new: Number(newRows[0]?.cnt ?? 0),
  };
}

async function getAiCosts(since: Date) {
  const rows = await db
    .select({
      model: aiUsageLog.model,
      totalCost: sum(aiUsageLog.costUsd),
      cnt: count(),
    })
    .from(aiUsageLog)
    .where(gte(aiUsageLog.createdAt, since))
    .groupBy(aiUsageLog.model);
  return rows.map((r) => ({
    model: r.model,
    totalCost: Number(r.totalCost ?? 0),
    cnt: Number(r.cnt),
  }));
}

async function getTimeBuckets(since: Date, period: string) {
  const trunc = period === "24h" ? "hour" : "day";
  const rows = await db
    .select({
      bucket: sql<string>`date_trunc(${sql.raw(`'${trunc}'`)}, ${activityLog.createdAt})::text`,
      cnt: count(),
    })
    .from(activityLog)
    .where(gte(activityLog.createdAt, since))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  return rows.map((r) => ({ bucket: r.bucket, cnt: Number(r.cnt) }));
}

async function getSandboxStats() {
  try {
    const result = await exec("docker", [
      "ps", "-a", "--filter", "name=sb-", "--format", "{{.Names}}\t{{.Status}}",
    ]);
    if (result.exitCode !== 0) return null;
    const lines = result.stdout.trim().split("\n").filter(Boolean);
    return {
      total: lines.length,
      running: lines.filter((l) => l.includes("Up")).length,
      stopped: lines.filter((l) => l.includes("Exited")).length,
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const VALID_PERIODS = ["24h", "7d", "30d"];
  const period = VALID_PERIODS.includes(url.searchParams.get("period") || "")
    ? url.searchParams.get("period")!
    : "24h";
  const since = periodToDate(period);

  try {
    const [builds, chat, activeUsers, projectCounts, aiCosts, timeBuckets, sandboxes] =
      await Promise.all([
        getBuildStats(since),
        getChatStats(since),
        getActiveUsers(since),
        getProjectCounts(since),
        getAiCosts(since),
        getTimeBuckets(since, period),
        getSandboxStats(),
      ]);

    return NextResponse.json({
      period,
      since: since.toISOString(),
      builds,
      chat,
      activeUsers,
      projects: projectCounts,
      aiCosts,
      timeBuckets,
      sandboxes,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
