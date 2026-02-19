import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/sparky-prompts";
import { parseDiagram } from "@/lib/diagram-parser";
import { extractNetlist } from "@/lib/netlist";
import { initPCBFromSchematic } from "@/lib/pcb-parser";
import { getFootprintForType, generateFootprintByType } from "@/lib/pcb-footprints";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { downloadFile, uploadFile, listProjectFiles } from "@/lib/storage";
import { authorizeProjectRead, getServerSession } from "@/lib/auth-middleware";
import { checkUsageLimit, recordUsage } from "@/lib/usage";
import {
  mkdirSync,
  readFileSync,
  existsSync,
  writeFileSync,
  realpathSync,
  statSync,
} from "fs";
import { readdir, readFile, stat } from "fs/promises";
import { join, resolve } from "path";
import os from "os";

const SYSTEM_PROMPT = buildSystemPrompt();

// --- Path safety ---

/** Resolve a path and check it lives inside the allowed directory */
function isInsideDir(dir: string, target: string): boolean {
  try {
    const resolved = resolve(dir, target);
    let real: string;
    try {
      real = realpathSync(resolved);
    } catch {
      real = resolved;
    }
    return real === dir || real.startsWith(dir + "/");
  } catch {
    return false;
  }
}

/** Extract file paths from tool input that need to be validated */
function extractPaths(toolName: string, input: Record<string, unknown>): string[] {
  switch (toolName) {
    case "Read":
    case "Write":
    case "Edit":
      return input.file_path ? [String(input.file_path)] : [];
    case "Glob":
    case "Grep":
      return input.path ? [String(input.path)] : [];
    case "Bash":
      return [];
    default:
      return [];
  }
}

/** Dangerous patterns for bash commands */
const BASH_BLOCKED_PATTERNS = [
  /\.\.\//,
  /(?:^|\s|[;&|])cd\s/,
  /(?:^|\s|[;&|])rm\s+-rf?\s+\//,
  /(?:^|\s|[;&|])curl\s/,
  /(?:^|\s|[;&|])wget\s/,
  /(?:^|\s|[;&|])nc\s/,
  /(?:^|\s|[;&|])ssh\s/,
  /(?:^|\s|[;&|])scp\s/,
  /(?:^|\s|[;&|])python/,
  /(?:^|\s|[;&|])node\s/,
  /(?:^|\s|[;&|])env\s/,
  /(?:^|\s|[;&|])export\s/,
  /(?:^|\s|[;&|])eval\s/,
  /(?:^|\s|[;&|])exec\s/,
  /(?:^|\s|[;&|])source\s/,
  />\s*\//,
  /(?:^|\s|[;&|])chmod\s/,
  /(?:^|\s|[;&|])chown\s/,
  /(?:^|\s|[;&|])ln\s/,
  /(?:^|\s|[;&|])mkfifo\s/,
  /(?:^|\s|[;&|])mount\s/,
];

/** Allowlisted bash command prefixes */
const BASH_ALLOWED_PREFIXES = [
  "cat ",
  "ls",
  "head ",
  "tail ",
  "wc ",
  "find ",
  "grep ",
  "mkdir ",
  "cp ",
  "mv ",
  "echo ",
];

function isBashCommandAllowed(command: string, projectDir: string): { allowed: boolean; reason?: string } {
  const trimmed = command.trim();

  for (const pattern of BASH_BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: `Blocked pattern: ${pattern}` };
    }
  }

  const hasAllowed = BASH_ALLOWED_PREFIXES.some(p => trimmed.startsWith(p));
  if (!hasAllowed) {
    return { allowed: false, reason: `Command not in allowlist. Allowed prefixes: ${BASH_ALLOWED_PREFIXES.join(", ")}` };
  }

  const absolutePaths = trimmed.match(/\/[\w\/.+-]+/g) || [];
  for (const p of absolutePaths) {
    if (!isInsideDir(projectDir, p)) {
      return { allowed: false, reason: `Path ${p} is outside project directory` };
    }
  }

  return { allowed: true };
}

/** Build a canUseTool handler that confines all operations to projectDir */
function buildPermissionHandler(projectDir: string) {
  return async (
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<PermissionResult> => {
    const paths = extractPaths(toolName, input);
    for (const p of paths) {
      if (!isInsideDir(projectDir, p)) {
        console.warn(`[sparky] DENIED ${toolName}: path ${p} outside ${projectDir}`);
        return {
          behavior: "deny",
          message: `Access denied: ${p} is outside the project directory`,
        };
      }
    }

    if (toolName === "Bash") {
      const command = String(input.command || "");
      const check = isBashCommandAllowed(command, projectDir);
      if (!check.allowed) {
        console.warn(`[sparky] DENIED Bash: ${check.reason} | cmd: ${command.slice(0, 200)}`);
        return {
          behavior: "deny",
          message: `Bash command denied: ${check.reason}`,
        };
      }
    }

    return { behavior: "allow" };
  };
}

// --- Simulation MCP tools ---

function createSimulationServer(write: (data: Record<string, any>) => void) {
  return createSdkMcpServer({
    name: "sparkbench",
    version: "1.0.0",
    tools: [
      tool(
        "RunSimulation",
        "Build and run the current project in the SparkBench simulator. The user will see the circuit come alive and can interact with buttons, sensors, etc. Call this after writing/editing the sketch and diagram files.",
        { reason: z.string().optional().describe("Brief reason for running, e.g. 'test the LED circuit'") },
        async (args) => {
          write({ type: "sim_command", action: "start" });
          return { content: [{ type: "text" as const, text: "Simulation started. The user can now see the circuit running in the simulator and interact with it. Serial output will appear in the Serial Monitor." }] };
        },
      ),
      tool(
        "StopSimulation",
        "Stop the currently running simulation.",
        { reason: z.string().optional().describe("Brief reason for stopping") },
        async (args) => {
          write({ type: "sim_command", action: "stop" });
          return { content: [{ type: "text" as const, text: "Simulation stopped." }] };
        },
      ),
      tool(
        "CheckFloorplan",
        "Check the PCB floorplan for courtyard overlaps and out-of-bounds footprints. Call this after setting pcbX/pcbY on parts in diagram.json to validate placement.",
        { diagramJson: z.string().describe("The full diagram.json content to validate") },
        async (args) => {
          try {
            const diagram = parseDiagram(JSON.parse(args.diagramJson));
            const netlist = extractNetlist(diagram);
            const boardSize = diagram.boardSize;
            const violations: string[] = [];

            for (const part of diagram.parts) {
              const hasRegistry = !!getFootprintForType(part.type);
              const hasInstance = !!part.footprint;
              if (!hasRegistry && !hasInstance) {
                violations.push(`Missing footprint: ${part.id} (${part.type}) — set a "footprint" field`);
              }
            }

            for (const part of diagram.parts) {
              if (part.pcbX === undefined || part.pcbY === undefined) {
                const hasFootprint = !!getFootprintForType(part.type) || !!part.footprint;
                if (hasFootprint) {
                  violations.push(`Missing placement: ${part.id} has no pcbX/pcbY`);
                }
              }
            }

            const pcb = initPCBFromSchematic(diagram, netlist, undefined, boardSize);

            for (let i = 0; i < pcb.footprints.length; i++) {
              const a = pcb.footprints[i];
              if (!a.courtyard) continue;
              const ax1 = a.x - a.courtyard.width / 2;
              const ay1 = a.y - a.courtyard.height / 2;
              const ax2 = a.x + a.courtyard.width / 2;
              const ay2 = a.y + a.courtyard.height / 2;

              for (let j = i + 1; j < pcb.footprints.length; j++) {
                const b = pcb.footprints[j];
                if (!b.courtyard) continue;
                const bx1 = b.x - b.courtyard.width / 2;
                const by1 = b.y - b.courtyard.height / 2;
                const bx2 = b.x + b.courtyard.width / 2;
                const by2 = b.y + b.courtyard.height / 2;

                if (ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1) {
                  violations.push(`Overlap: ${a.ref} and ${b.ref}`);
                }
              }

              const bw = pcb.boardOutline.vertices[1]?.x ?? 100;
              const bh = pcb.boardOutline.vertices[2]?.y ?? 80;
              if (ax1 < 0 || ay1 < 0 || ax2 > bw || ay2 > bh) {
                violations.push(`Out of bounds: ${a.ref} (board is ${bw}x${bh}mm)`);
              }
            }

            const result = violations.length === 0
              ? `Floorplan OK: ${pcb.footprints.length} footprints placed, no overlaps, all within ${pcb.boardOutline.vertices[1]?.x ?? 100}x${pcb.boardOutline.vertices[2]?.y ?? 80}mm board.`
              : `Floorplan has ${violations.length} issue(s):\n${violations.join("\n")}`;

            return { content: [{ type: "text" as const, text: result }] };
          } catch (e: any) {
            return { content: [{ type: "text" as const, text: `Error checking floorplan: ${e.message}` }] };
          }
        },
      ),
      tool(
        "SetBoardSize",
        "Set the PCB board dimensions in mm. This adds a boardSize field to diagram.json which overrides auto-sizing.",
        {
          width: z.number().describe("Board width in mm"),
          height: z.number().describe("Board height in mm"),
          projectDir: z.string().describe("The project directory path"),
        },
        async (args) => {
          try {
            const diagramPath = join(args.projectDir, "diagram.json");
            if (!existsSync(diagramPath)) {
              return { content: [{ type: "text" as const, text: "Error: diagram.json not found" }] };
            }
            const raw = JSON.parse(readFileSync(diagramPath, "utf-8"));
            raw.boardSize = { width: args.width, height: args.height };
            writeFileSync(diagramPath, JSON.stringify(raw, null, 2) + "\n");
            return { content: [{ type: "text" as const, text: `Board size set to ${args.width}x${args.height}mm` }] };
          } catch (e: any) {
            return { content: [{ type: "text" as const, text: `Error setting board size: ${e.message}` }] };
          }
        },
      ),
      tool(
        "UpdatePCB",
        "Regenerate the PCB layout from diagram.json. Call this after setting pcbX/pcbY positions and verifying with CheckFloorplan. This triggers the frontend to rebuild board.kicad_pcb from the current diagram.",
        { reason: z.string().optional().describe("Brief reason, e.g. 'apply floorplan positions'") },
        async (args) => {
          write({ type: "pcb_command", action: "update" });
          return { content: [{ type: "text" as const, text: "PCB regeneration triggered. The board layout will update with the new footprint positions from diagram.json." }] };
        },
      ),
    ],
  });
}

// --- Helpers ---

function summarizeTool(name: string, input: Record<string, any>): string {
  if (!input) return "";
  switch (name) {
    case "Write":
    case "Read":
    case "Edit":
      return input.file_path?.split("/").pop() || input.file_path || "";
    case "Bash":
      return (input.command || "").slice(0, 120);
    case "Glob":
    case "Grep":
      return input.pattern || "";
    case "mcp__sparkbench__RunSimulation":
      return input.reason || "starting simulation";
    case "mcp__sparkbench__StopSimulation":
      return input.reason || "stopping simulation";
    case "mcp__sparkbench__CheckFloorplan":
      return "validating PCB floorplan";
    case "mcp__sparkbench__SetBoardSize":
      return `${input.width}x${input.height}mm`;
    case "mcp__sparkbench__UpdatePCB":
      return input.reason || "regenerating PCB";
    default:
      if (name.startsWith("mcp__deeppcb__")) {
        return input.reason || input.board_name || name.replace("mcp__deeppcb__", "");
      }
      return "";
  }
}

/** Map MCP tool names to display names for tool badges */
function displayToolName(name: string): string {
  switch (name) {
    case "mcp__sparkbench__RunSimulation": return "RunSimulation";
    case "mcp__sparkbench__StopSimulation": return "StopSimulation";
    default:
      if (name.startsWith("mcp__deeppcb__")) return "DeepPCB:" + name.replace("mcp__deeppcb__", "");
      return name;
  }
}

/** Download project files from MinIO to a temp directory for agent use */
async function setupTempDir(projectId: string, slug: string): Promise<string> {
  const tmpDir = join(os.tmpdir(), `sparkbench-${slug}-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  const files = await listProjectFiles(projectId);
  for (const filename of files) {
    const content = await downloadFile(projectId, filename);
    if (content !== null) {
      const filePath = join(tmpDir, filename);
      // Ensure parent dir exists for nested paths
      mkdirSync(join(tmpDir, ...filename.split("/").slice(0, -1)), { recursive: true });
      writeFileSync(filePath, content);
    }
  }

  return tmpDir;
}

/** Sync changed files from temp dir back to MinIO */
async function syncTempDirToStorage(
  projectId: string,
  tmpDir: string,
  originalFiles: Set<string>,
): Promise<string[]> {
  const changedFiles: string[] = [];

  async function walkDir(dir: string, prefix: string = ""): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await walkDir(fullPath, relativePath);
      } else {
        const content = await readFile(fullPath, "utf-8");
        await uploadFile(projectId, relativePath, content);
        changedFiles.push(relativePath);
      }
    }
  }

  await walkDir(tmpDir);
  return changedFiles;
}

export async function POST(request: Request) {
  const ALLOWED_MODELS = [
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6",
    "claude-opus-4-6",
  ] as const;
  type AllowedModel = typeof ALLOWED_MODELS[number];

  const body = await request.json();
  const { message, projectId, context, model: requestedModel } = body as {
    message: string;
    projectId: string;
    model?: string;
    context?: {
      diagramJson?: string;
      sketchCode?: string;
      pcbText?: string;
      librariesTxt?: string;
      files?: { name: string; content: string }[];
    };
  };

  const model: AllowedModel = ALLOWED_MODELS.includes(requestedModel as AllowedModel)
    ? (requestedModel as AllowedModel)
    : "claude-sonnet-4-6";

  if (!message?.trim() || !projectId) {
    return Response.json({ error: "message and projectId are required" }, { status: 400 });
  }

  // Require authentication for AI usage (needed for usage tracking)
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Sign in to use Sparky AI" }, { status: 401 });
  }
  const userId = session.user.id;

  // Check usage limit
  const usageCheck = await checkUsageLimit(userId);
  if (!usageCheck.allowed) {
    return Response.json({
      error: `Monthly AI usage limit reached ($${usageCheck.usedUsd.toFixed(2)} / $${usageCheck.limitUsd.toFixed(2)}). Resets on the 1st of next month.`,
    }, { status: 429 });
  }

  // Allow read access (public projects viewable by anyone, private by owner)
  const readResult = await authorizeProjectRead(projectId);
  if (readResult.error) return readResult.error;

  const project = readResult.project;

  // Determine if this user is the owner (edits will persist)
  const isOwner = !!project.ownerId && (project.ownerId === userId);

  // Set up temp dir with project files from MinIO
  const tmpDir = await setupTempDir(project.id, project.slug);

  // Only resume sessions for owners (non-owners get ephemeral sessions)
  const existingSession = isOwner ? (project.agentSessionId || undefined) : undefined;

  // Build context section from current project state
  let contextSection = "";
  if (context) {
    const parts: string[] = [];
    if (context.diagramJson) {
      parts.push(`Current diagram.json:\n\`\`\`json\n${context.diagramJson}\n\`\`\``);
    }
    if (context.sketchCode) {
      parts.push(`Current sketch.ino:\n\`\`\`cpp\n${context.sketchCode}\n\`\`\``);
    }
    if (context.librariesTxt) {
      parts.push(`Current libraries.txt:\n\`\`\`\n${context.librariesTxt}\n\`\`\``);
    }
    if (context.pcbText) {
      parts.push(`PCB layout exists (board.kicad_pcb, ${context.pcbText.length} chars)`);
    }
    if (context.files && context.files.length > 0) {
      parts.push(`Additional project files: ${context.files.map(f => f.name).join(", ")}`);
    }
    if (parts.length > 0) {
      contextSection = `\n\n--- CURRENT PROJECT STATE ---\n${parts.join("\n\n")}`;
    }
  }

  const hasExistingFiles = context?.diagramJson || context?.sketchCode;

  let projectInstructions: string;
  if (hasExistingFiles) {
    projectInstructions = `CRITICAL RULES FOR THIS REQUEST:
- This is an EXISTING project. The files already exist in ${tmpDir}.
- NEVER overwrite diagram.json or sketch.ino with a blank/new version.
- To modify diagram.json: use the Edit tool to change specific parts/connections, or Read it first then Write the complete updated version that PRESERVES all existing parts and connections.
- To modify sketch.ino: use the Edit tool for targeted changes.
- The current project state is provided below — this is what the user sees RIGHT NOW in their editor. Your job is to ADD TO or MODIFY this existing project, not replace it.
- If the user asks to "add" something, add it to the existing parts and connections.
- If the user asks to "design a circuit", they mean modify/enhance the CURRENT circuit.`;
  } else {
    projectInstructions = `This is a new/empty project. Follow your workflow starting with Step 1 (clarifying questions).`;
  }

  const prompt = existingSession
    ? message
    : `The user says: "${message}"

Project directory: ${tmpDir}
Project slug: ${project.slug}
Sketch filename: sketch.ino

${projectInstructions}${contextSection}`;

  const encoder = new TextEncoder();

  // Track original files for sync
  const originalFiles = new Set(await listProjectFiles(project.id));

  const stream = new ReadableStream({
    async start(controller) {
      const write = (data: Record<string, any>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      const buildQueryOptions = (resumeId?: string) => ({
        model: model as string,
        systemPrompt: SYSTEM_PROMPT,
        tools: { type: "preset" as const, preset: "claude_code" as const },
        allowedTools: [
          "Read", "Write", "Edit", "Bash", "Glob", "Grep",
          "mcp__sparkbench__CheckFloorplan", "mcp__sparkbench__SetBoardSize", "mcp__sparkbench__UpdatePCB",
          ...(process.env.DEEPPCB_API_KEY ? [
            "mcp__deeppcb__extract_constraints", "mcp__deeppcb__validate_constraints",
            "mcp__deeppcb__start_placement", "mcp__deeppcb__start_routing",
            "mcp__deeppcb__check_status", "mcp__deeppcb__get_best_board",
            "mcp__deeppcb__derive_placement_constraints", "mcp__deeppcb__validate_placement_constraints",
            "mcp__deeppcb__review_placement", "mcp__deeppcb__retrieve_best_board",
          ] : []),
        ],
        disallowedTools: ["TodoWrite", "TodoRead", "Task", "WebFetch", "WebSearch", "NotebookEdit", "mcp__sparkbench__RunSimulation", "mcp__sparkbench__StopSimulation"],
        permissionMode: "bypassPermissions" as const,
        allowDangerouslySkipPermissions: true,
        canUseTool: buildPermissionHandler(tmpDir),
        mcpServers: {
          sparkbench: createSimulationServer(write),
          ...(process.env.DEEPPCB_API_KEY ? {
            deeppcb: {
              type: "sse" as const,
              url: "https://mcp.deeppcb.ai/agent/tools/sse",
              headers: {
                Authorization: `Bearer ${process.env.DEEPPCB_API_KEY}`,
              },
            },
          } : {}),
        },
        cwd: tmpDir,
        maxTurns: 30,
        includePartialMessages: true,
        ...(resumeId ? { resume: resumeId } : {}),
        env: {
          HOME: process.env.HOME,
          PATH: process.env.PATH,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          PLATFORMIO_CORE_DIR: process.env.PLATFORMIO_CORE_DIR,
        },
        stderr: () => {},
      });

      async function runQuery(resumeId?: string) {
        const q = query({
          prompt,
          options: buildQueryOptions(resumeId),
        });

        let fullText = "";
        let turnCount = 0;

        for await (const msg of q) {
          // Capture/update session ID (only for owners)
          if (isOwner && "session_id" in msg && (msg as any).session_id) {
            const sessionId = (msg as any).session_id;
            await db
              .update(projects)
              .set({ agentSessionId: sessionId })
              .where(eq(projects.id, project.id));
          }

          switch (msg.type) {
            case "stream_event": {
              const evt = (msg as any).event;
              if (evt?.type === "content_block_delta" && evt.delta?.type === "text_delta") {
                fullText += evt.delta.text;
                write({ type: "text_delta", content: evt.delta.text });
              }
              break;
            }

            case "assistant": {
              turnCount++;
              for (const block of msg.message.content) {
                if (block.type === "tool_use") {
                  write({
                    type: "tool",
                    name: displayToolName(block.name),
                    detail: summarizeTool(block.name, block.input as Record<string, any>),
                  });
                }
              }
              break;
            }

            case "result": {
              if (msg.subtype === "success") {
                const cost = msg.total_cost_usd ?? 0;
                const turns = msg.num_turns ?? 0;
                // Record usage
                try {
                  await recordUsage({
                    userId,
                    projectId: project.id,
                    model,
                    costUsd: cost,
                    turns,
                  });
                } catch (usageErr) {
                  console.error("[sparky] Failed to record usage:", usageErr);
                }
                write({
                  type: "done",
                  turns,
                  cost,
                });
              } else {
                write({
                  type: "error",
                  message: msg.subtype,
                });
              }
              break;
            }
          }
        }
      }

      try {
        await runQuery(existingSession);
      } catch (err: any) {
        // If resume failed, clear the stale session and retry fresh
        if (existingSession && isOwner) {
          console.warn(`[sparky] Resume failed for ${projectId}, starting fresh: ${err.message}`);
          await db
            .update(projects)
            .set({ agentSessionId: null })
            .where(eq(projects.id, project.id));
          try {
            await runQuery();
          } catch (retryErr: any) {
            write({ type: "error", message: retryErr.message });
          }
        } else {
          write({ type: "error", message: err.message });
        }
      } finally {
        // Only sync changed files back to MinIO for project owners
        if (isOwner) {
          try {
            const changedFiles = await syncTempDirToStorage(project.id, tmpDir, originalFiles);

            // Update file manifest and diagram JSON in DB if changed
            if (changedFiles.length > 0) {
              const allFiles = await listProjectFiles(project.id);
              const updates: Record<string, any> = {
                fileManifest: allFiles,
                updatedAt: new Date(),
              };

              // If diagram.json was changed, update the DB column too
              if (changedFiles.includes("diagram.json")) {
                const diagramContent = await downloadFile(project.id, "diagram.json");
                if (diagramContent) {
                  try {
                    updates.diagramJson = JSON.parse(diagramContent);
                  } catch { /* ignore parse errors */ }
                }
              }

              await db
                .update(projects)
                .set(updates)
                .where(eq(projects.id, project.id));
            }
          } catch (syncErr) {
            console.error("[sparky] Failed to sync files back to MinIO:", syncErr);
          }
        }

        // Clean up temp dir (fire and forget)
        import("fs/promises").then(fs => fs.rm(tmpDir, { recursive: true, force: true })).catch(() => {});

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
