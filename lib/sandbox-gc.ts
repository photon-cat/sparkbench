import { execFile } from "child_process";
import { logger, logActivity } from "@/lib/logger";

function exec(
  cmd: string,
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({
          exitCode:
            typeof error?.code === "number" ? error.code : error ? 1 : 0,
          stdout: stdout || "",
          stderr: stderr || "",
        });
      },
    );
  });
}

/**
 * Garbage-collect sandbox containers that have been stopped longer than maxAgeMs.
 * Returns the number of containers cleaned up.
 */
export async function gcSandboxes(
  maxAgeMs: number = 24 * 60 * 60 * 1000,
): Promise<{ cleaned: number; errors: string[] }> {
  // List all sandbox containers (running or stopped)
  const listResult = await exec("docker", [
    "ps", "-a",
    "--filter", "name=sb-",
    "--format", "{{.Names}}\t{{.Status}}\t{{.CreatedAt}}",
  ]);

  if (listResult.exitCode !== 0) {
    return { cleaned: 0, errors: [`Failed to list containers: ${listResult.stderr}`] };
  }

  const lines = listResult.stdout.trim().split("\n").filter(Boolean);
  if (lines.length === 0) return { cleaned: 0, errors: [] };

  const now = Date.now();
  let cleaned = 0;
  const errors: string[] = [];

  for (const line of lines) {
    const [name, status] = line.split("\t");
    if (!name || !status) continue;

    // Only GC stopped containers (Exited)
    if (!status.startsWith("Exited")) continue;

    // Parse the "Exited ... ago" status to estimate stop time
    // Docker status format: "Exited (0) X hours/minutes/days ago"
    const ageMatch = status.match(/(\d+)\s+(seconds?|minutes?|hours?|days?|weeks?|months?)/);
    if (!ageMatch) continue;

    const amount = parseInt(ageMatch[1], 10);
    const unit = ageMatch[2];
    let ageMs = 0;
    if (unit.startsWith("second")) ageMs = amount * 1000;
    else if (unit.startsWith("minute")) ageMs = amount * 60 * 1000;
    else if (unit.startsWith("hour")) ageMs = amount * 60 * 60 * 1000;
    else if (unit.startsWith("day")) ageMs = amount * 24 * 60 * 60 * 1000;
    else if (unit.startsWith("week")) ageMs = amount * 7 * 24 * 60 * 60 * 1000;
    else if (unit.startsWith("month")) ageMs = amount * 30 * 24 * 60 * 60 * 1000;

    if (ageMs < maxAgeMs) continue;

    // Extract project ID from container name (sb-{projectId})
    const projectId = name.replace(/^sb-/, "");
    const vol = `sb-${projectId}-ws`;

    // Remove container and volume
    const rmResult = await exec("docker", ["rm", "-f", name]);
    if (rmResult.exitCode !== 0) {
      errors.push(`Failed to rm ${name}: ${rmResult.stderr}`);
      continue;
    }

    await exec("docker", ["volume", "rm", "-f", vol]);

    logger.info("[sandbox-gc] Cleaned up", { projectId, name, vol, ageMs });
    logActivity("sandbox.destroy", { projectId, metadata: { reason: "gc", ageMs } });
    cleaned++;
  }

  return { cleaned, errors };
}
