import { db } from "./db";
import { users, aiUsageLog } from "./db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Get the start of the current billing period (1st of current month, UTC).
 */
function periodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Get a user's usage limit and current period spend.
 */
export async function getUserUsage(userId: string): Promise<{
  plan: string;
  limitUsd: number;
  usedUsd: number;
  periodStart: Date;
}> {
  const userRows = await db
    .select({ plan: users.plan, usageLimitUsd: users.usageLimitUsd })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRows.length === 0) {
    return { plan: "free", limitUsd: 10, usedUsd: 0, periodStart: periodStart() };
  }

  const start = periodStart();

  const usageRows = await db
    .select({ total: sql<string>`COALESCE(SUM(${aiUsageLog.costUsd}), 0)` })
    .from(aiUsageLog)
    .where(and(eq(aiUsageLog.userId, userId), gte(aiUsageLog.createdAt, start)));

  const usedUsd = parseFloat(usageRows[0]?.total ?? "0");
  const limitUsd = parseFloat(userRows[0].usageLimitUsd);

  return {
    plan: userRows[0].plan,
    limitUsd,
    usedUsd,
    periodStart: start,
  };
}

/**
 * Check if a user has remaining AI budget.
 */
export async function checkUsageLimit(userId: string): Promise<{ allowed: boolean; usedUsd: number; limitUsd: number }> {
  const usage = await getUserUsage(userId);
  return {
    allowed: usage.usedUsd < usage.limitUsd,
    usedUsd: usage.usedUsd,
    limitUsd: usage.limitUsd,
  };
}

/**
 * Record an AI usage event.
 */
export async function recordUsage(params: {
  userId: string;
  projectId: string | null;
  model: string;
  costUsd: number;
  turns: number;
}): Promise<void> {
  await db.insert(aiUsageLog).values({
    id: nanoid(16),
    userId: params.userId,
    projectId: params.projectId,
    model: params.model,
    costUsd: params.costUsd.toFixed(6),
    turns: params.turns,
  });
}
