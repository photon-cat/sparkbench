import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, projects, aiUsageLog } from "@/lib/db/schema";
import { sql, count, sum, eq, desc } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get all users with project counts and AI usage
    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        plan: users.plan,
        usageLimitUsd: users.usageLimitUsd,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get project counts per user
    const projectCounts = await db
      .select({
        ownerId: projects.ownerId,
        cnt: count(),
      })
      .from(projects)
      .where(sql`${projects.ownerId} IS NOT NULL`)
      .groupBy(projects.ownerId);

    const projectMap = new Map(projectCounts.map((r) => [r.ownerId, Number(r.cnt)]));

    // Get AI usage per user (all time)
    const usageRows = await db
      .select({
        userId: aiUsageLog.userId,
        totalCost: sum(aiUsageLog.costUsd),
        sessions: count(),
      })
      .from(aiUsageLog)
      .groupBy(aiUsageLog.userId);

    const usageMap = new Map(
      usageRows.map((r) => [r.userId, { cost: Number(r.totalCost ?? 0), sessions: Number(r.sessions) }]),
    );

    const result = userRows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      plan: u.plan,
      usageLimitUsd: Number(u.usageLimitUsd),
      createdAt: u.createdAt.toISOString(),
      projectCount: projectMap.get(u.id) ?? 0,
      aiCostUsd: usageMap.get(u.id)?.cost ?? 0,
      aiSessions: usageMap.get(u.id)?.sessions ?? 0,
    }));

    return NextResponse.json({ users: result });
  } catch (err) {
    console.error("Admin users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
