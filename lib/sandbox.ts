import { execFile } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import { logger, logActivity } from "@/lib/logger";

const SANDBOX_IMAGE =
  process.env.SANDBOX_IMAGE || "sparkbench-sandbox:latest";
const SANDBOX_RUNTIME = process.env.SANDBOX_RUNTIME || "";

export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  artifacts: Map<string, Buffer>;
  reused: boolean;
}

interface ProjectBuildOptions {
  /** Host directory containing project files to copy into the container */
  projectDir: string;
  /** Command to run inside the container */
  command: string[];
  /** Timeout in ms (default 120s) */
  timeout?: number;
  /** Paths (relative to /workspace) to copy back after build */
  artifactPaths?: string[];
}

function validateProjectId(projectId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    throw new Error(`Invalid project ID for sandbox: ${projectId}`);
  }
}

function containerName(projectId: string): string {
  validateProjectId(projectId);
  return `sb-${projectId}`;
}

function volumeName(projectId: string): string {
  validateProjectId(projectId);
  return `sb-${projectId}-ws`;
}

function exec(
  cmd: string,
  args: string[],
  opts: { timeout?: number } = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { timeout: opts.timeout ?? 30_000, maxBuffer: 10 * 1024 * 1024 },
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
 * Check if a named container exists and its status.
 * Returns "running" | "stopped" | "missing".
 */
async function getContainerStatus(
  name: string,
): Promise<"running" | "stopped" | "missing"> {
  const result = await exec("docker", [
    "inspect",
    "--format",
    "{{.State.Running}}",
    name,
  ]);
  if (result.exitCode !== 0) return "missing";
  return result.stdout.trim() === "true" ? "running" : "stopped";
}

/**
 * Run a PlatformIO build in a per-project sandbox container.
 *
 * The container persists across builds (stopped, not destroyed).
 * Workspace files are stored in a named Docker volume.
 *
 * Lifecycle:
 *   1. Check if container exists; create if missing
 *   2. docker cp project files in
 *   3. docker start -a (run build)
 *   4. docker cp artifacts out
 *   5. docker stop (suspend — container + volume persist)
 */
export async function runProjectBuild(
  projectId: string,
  opts: ProjectBuildOptions,
): Promise<SandboxResult> {
  const timeout = opts.timeout ?? 120_000;
  const artifactPaths = opts.artifactPaths ?? [];
  const name = containerName(projectId);
  const vol = volumeName(projectId);

  let reused = false;
  const status = await getContainerStatus(name);

  if (status === "running") {
    // Another build is in progress — fail fast
    return {
      exitCode: 1,
      stdout: "",
      stderr: "A build is already running for this project",
      artifacts: new Map(),
      reused: false,
    };
  }

  // --- 1. Create container if it doesn't exist ---
  if (status === "missing") {
    const createArgs = [
      "create",
      "--name", name,
      "--network", "none",
      "--read-only",
      "--tmpfs", "/tmp:size=100m",
      "-v", `${vol}:/workspace`,
      "--cap-drop", "ALL",
      "--security-opt", "no-new-privileges:true",
      "--pids-limit", "256",
      "--memory", "512m",
      "--cpus", "1",
      ...(SANDBOX_RUNTIME ? ["--runtime", SANDBOX_RUNTIME] : []),
      "--entrypoint", opts.command[0],
      SANDBOX_IMAGE,
      ...opts.command.slice(1),
    ];

    const createResult = await exec("docker", createArgs);
    if (createResult.exitCode !== 0) {
      return {
        exitCode: createResult.exitCode,
        stdout: "",
        stderr: `Failed to create sandbox: ${createResult.stderr}`,
        artifacts: new Map(),
        reused: false,
      };
    }

    logger.info("[sandbox] Created container", { projectId, name });
    logActivity("sandbox.create", { projectId });
  } else {
    reused = true;
    logger.info("[sandbox] Reusing existing container", { projectId, name });
    logActivity("sandbox.reuse", { projectId });
  }

  try {
    // --- 2. Copy project files into container ---
    const cpIn = await exec("docker", [
      "cp",
      `${opts.projectDir}/.`,
      `${name}:/workspace/`,
    ]);
    if (cpIn.exitCode !== 0) {
      return {
        exitCode: cpIn.exitCode,
        stdout: "",
        stderr: `Failed to copy files into sandbox: ${cpIn.stderr}`,
        artifacts: new Map(),
        reused,
      };
    }

    // --- 3. Start container and wait for completion ---
    const startResult = await exec(
      "docker",
      ["start", "-a", name],
      { timeout: timeout + 5_000 },
    );

    // --- 4. Copy artifacts out ---
    const artifacts = new Map<string, Buffer>();
    for (const relPath of artifactPaths) {
      const hostTmp = path.join(opts.projectDir, path.basename(relPath));
      const cpOut = await exec("docker", [
        "cp",
        `${name}:/workspace/${relPath}`,
        hostTmp,
      ]);
      if (cpOut.exitCode === 0) {
        try {
          const data = await readFile(hostTmp);
          artifacts.set(relPath, data);
        } catch {
          // artifact didn't exist or couldn't be read
        }
      }
    }

    return {
      exitCode: startResult.exitCode,
      stdout: startResult.stdout,
      stderr: startResult.stderr,
      artifacts,
      reused,
    };
  } finally {
    // --- 5. Stop container (suspend, don't destroy) ---
    exec("docker", ["stop", "-t", "5", name]).catch(() => {});
  }
}

/**
 * Destroy a project's sandbox container and volume.
 * Called on project delete and by GC.
 */
export async function destroyProjectSandbox(
  projectId: string,
): Promise<void> {
  const name = containerName(projectId);
  const vol = volumeName(projectId);

  await exec("docker", ["rm", "-f", name]);
  await exec("docker", ["volume", "rm", "-f", vol]);

  logger.info("[sandbox] Destroyed container + volume", { projectId, name, vol });
  logActivity("sandbox.destroy", { projectId });
}

/**
 * Get sandbox info for a project. Returns null if no container exists.
 */
export async function getProjectSandboxInfo(
  projectId: string,
): Promise<{ status: string; created: string; size: string } | null> {
  const name = containerName(projectId);
  const result = await exec("docker", [
    "inspect",
    "--format",
    "{{.State.Status}} {{.Created}} {{.SizeRootFs}}",
    name,
  ]);
  if (result.exitCode !== 0) return null;
  const [status, created, size] = result.stdout.trim().split(" ");
  return { status, created, size: size || "unknown" };
}

// Keep the old API for backwards compatibility (used by build route in direct mode fallback)
export { runProjectBuild as runInSandbox };
