import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, msg: string, context?: Record<string, unknown>) {
  const entry = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...context,
  };
  const out = JSON.stringify(entry);
  if (level === "error") {
    console.error(out);
  } else if (level === "warn") {
    console.warn(out);
  } else {
    console.log(out);
  }
}

export const logger = {
  info: (msg: string, context?: Record<string, unknown>) => log("info", msg, context),
  warn: (msg: string, context?: Record<string, unknown>) => log("warn", msg, context),
  error: (msg: string, context?: Record<string, unknown>) => log("error", msg, context),
};

interface LogActivityOpts {
  userId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
  durationMs?: number;
}

export function logActivity(action: string, opts: LogActivityOpts = {}) {
  db.insert(activityLog)
    .values({
      id: nanoid(16),
      action,
      userId: opts.userId ?? null,
      projectId: opts.projectId ?? null,
      metadata: opts.metadata ?? null,
      durationMs: opts.durationMs ?? null,
    })
    .then(() => {
      logger.info("activity_logged", { action, projectId: opts.projectId });
    })
    .catch(() => {});
}
