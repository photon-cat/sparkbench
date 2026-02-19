/**
 * Load test: simulate N concurrent users creating projects and triggering builds.
 *
 * Usage: npx tsx scripts/load-test-builds.ts [--users 16] [--base-url http://localhost:3000]
 *
 * Creates a test user + session directly in the DB, then runs concurrent
 * create-project + build cycles against the server.
 */

import { db } from "../lib/db";
import { users, sessions } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";

/**
 * Sign a cookie value the same way better-auth does (HMAC-SHA256, base64).
 * better-auth uses WebCrypto internally; we replicate with Node's crypto.
 */
async function signCookieValue(value: string, secret: string): Promise<string> {
  const signature = crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("base64");
  return encodeURIComponent(`${value}.${signature}`);
}

const BLINK_SKETCH = `
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
`;

const TEST_USER_ID = "loadtest-user-000000000000";
const TEST_USER_EMAIL = "loadtest@sparkbench.test";

/**
 * Create (or reuse) a test user and session. Returns the session token
 * as a cookie string.
 */
async function ensureTestSession(): Promise<string> {
  // Upsert test user
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, TEST_USER_ID))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({
      id: TEST_USER_ID,
      name: "Load Tester",
      email: TEST_USER_EMAIL,
      emailVerified: true,
    });
  }

  // Create a fresh session — better-auth stores the raw token
  const token = nanoid(32);
  const sessionId = nanoid(32);

  await db.insert(sessions).values({
    id: sessionId,
    token,
    userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
  });

  // better-auth signs cookies with HMAC-SHA256 using BETTER_AUTH_SECRET
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET env var is required for cookie signing");
  }
  const signedValue = await signCookieValue(token, secret);
  return `better-auth.session_token=${signedValue}`;
}

interface BuildResult {
  userId: number;
  projectId: string | null;
  createMs: number;
  buildMs: number;
  success: boolean;
  error: string | null;
  phase: "create" | "build" | "done";
}

async function runUser(
  userId: number,
  baseUrl: string,
  cookie: string,
): Promise<BuildResult> {
  const result: BuildResult = {
    userId,
    projectId: null,
    createMs: 0,
    buildMs: 0,
    success: false,
    error: null,
    phase: "create",
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cookie": cookie,
  };

  try {
    // 1. Create project
    const t0 = Date.now();
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: `loadtest-u${userId}-${Date.now()}` }),
    });
    result.createMs = Date.now() - t0;

    if (!createRes.ok) {
      const body = await createRes.json().catch(() => ({}));
      result.error = `Create failed (${createRes.status}): ${body.error || createRes.statusText}`;
      return result;
    }

    const { id } = await createRes.json();
    result.projectId = id;
    result.phase = "build";

    // 2. Build project
    const t1 = Date.now();
    const buildRes = await fetch(`${baseUrl}/api/projects/${id}/build`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sketch: BLINK_SKETCH,
        board: "uno",
        files: [],
      }),
    });
    result.buildMs = Date.now() - t1;

    const buildBody = await buildRes.json().catch(() => ({}));
    if (!buildRes.ok || !buildBody.success) {
      result.error = `Build failed (${buildRes.status}): ${buildBody.error || "unknown"}`;
      return result;
    }

    result.success = true;
    result.phase = "done";
    return result;
  } catch (err: any) {
    result.error = `Exception in ${result.phase}: ${err.message}`;
    return result;
  }
}

async function cleanup(
  projectIds: string[],
  baseUrl: string,
  cookie: string,
) {
  const headers: Record<string, string> = { Cookie: cookie };
  let cleaned = 0;
  for (const id of projectIds) {
    try {
      const res = await fetch(`${baseUrl}/api/projects/${id}/settings`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) cleaned++;
    } catch { /* ignore */ }
  }
  return cleaned;
}

async function main() {
  const args = process.argv.slice(2);
  const userCount = parseInt(
    args.find((_, i) => args[i - 1] === "--users") || "16",
    10,
  );
  const baseUrl = (
    args.find((_, i) => args[i - 1] === "--base-url") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  const skipCleanup = args.includes("--no-cleanup");

  console.log(`\n🔨 Load test: ${userCount} concurrent builds against ${baseUrl}\n`);

  // Verify server is up
  try {
    const ping = await fetch(`${baseUrl}/api/projects?limit=1`);
    if (!ping.ok) throw new Error(`Status ${ping.status}`);
  } catch (err: any) {
    console.error(`❌ Server not reachable at ${baseUrl}: ${err.message}`);
    process.exit(1);
  }

  // Create test session
  console.log("🔑 Creating test session...");
  const cookie = await ensureTestSession();

  // Verify auth works
  const authCheck = await fetch(`${baseUrl}/api/user/profile`, {
    headers: { Cookie: cookie },
  });
  if (!authCheck.ok) {
    console.error(`❌ Auth check failed (${authCheck.status}). Cookie may not be valid.`);
    // Try anyway — might still work for unauthenticated endpoints
  } else {
    const profile = await authCheck.json();
    console.log(`  Authenticated as: ${profile.name} (${profile.email})\n`);
  }

  // Launch all users concurrently
  const startTime = Date.now();
  const promises = Array.from({ length: userCount }, (_, i) =>
    runUser(i + 1, baseUrl, cookie),
  );

  const results = await Promise.all(promises);
  const totalMs = Date.now() - startTime;

  // Report
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log("─".repeat(80));
  console.log(
    `${"User".padEnd(6)} ${"Project".padEnd(12)} ${"Create".padEnd(10)} ${"Build".padEnd(10)} ${"Status".padEnd(8)} Error`,
  );
  console.log("─".repeat(80));

  for (const r of results) {
    const status = r.success ? "✅ OK" : "❌ FAIL";
    console.log(
      `${String(r.userId).padEnd(6)} ${(r.projectId || "-").padEnd(12)} ${(r.createMs + "ms").padEnd(10)} ${(r.buildMs + "ms").padEnd(10)} ${status.padEnd(8)} ${r.error || ""}`,
    );
  }

  console.log("─".repeat(80));

  const createTimes = results.map((r) => r.createMs).filter((t) => t > 0);
  const buildTimes = results.map((r) => r.buildMs).filter((t) => t > 0);
  const avg = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const p95 = (arr: number[]) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)];
  };

  console.log(`\n📊 Summary:`);
  console.log(`  Users:       ${userCount}`);
  console.log(`  Succeeded:   ${succeeded.length}/${userCount}`);
  console.log(`  Failed:      ${failed.length}/${userCount}`);
  console.log(`  Total time:  ${(totalMs / 1000).toFixed(1)}s`);
  console.log(
    `  Create avg:  ${avg(createTimes)}ms  p95: ${p95(createTimes)}ms`,
  );
  console.log(
    `  Build avg:   ${avg(buildTimes)}ms  p95: ${p95(buildTimes)}ms`,
  );
  if (succeeded.length > 0 && totalMs > 0) {
    console.log(
      `  Throughput:  ${((succeeded.length / totalMs) * 1000).toFixed(2)} builds/sec`,
    );
  }

  // Failure breakdown
  if (failed.length > 0) {
    console.log(`\n❌ Failures:`);
    const reasons = new Map<string, number>();
    for (const r of failed) {
      const key = r.error?.slice(0, 100) || "unknown";
      reasons.set(key, (reasons.get(key) || 0) + 1);
    }
    for (const [reason, count] of reasons) {
      console.log(`  ${count}x  ${reason}`);
    }
  }

  // Cleanup
  if (!skipCleanup) {
    const projectIds = results
      .map((r) => r.projectId)
      .filter((id): id is string => !!id);
    if (projectIds.length > 0) {
      console.log(`\n🧹 Cleaning up ${projectIds.length} test projects...`);
      const cleaned = await cleanup(projectIds, baseUrl, cookie);
      console.log(`  Deleted ${cleaned}/${projectIds.length} projects`);
    }
  }

  // Clean up test session
  await db.delete(sessions).where(eq(sessions.userId, TEST_USER_ID));

  console.log("");
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
