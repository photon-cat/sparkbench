import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/sparky-prompts";
import {
  mkdirSync,
  readFileSync,
  existsSync,
  writeFileSync,
  realpathSync,
} from "fs";
import { join, resolve } from "path";

const PROJECTS_DIR = join(process.cwd(), "projects");
const DATA_DIR = join(process.cwd(), "data");
const SESSIONS_FILE = join(DATA_DIR, "sessions.json");

mkdirSync(DATA_DIR, { recursive: true });

// --- Session Persistence ---

function loadSessions(): Map<string, string> {
  if (!existsSync(SESSIONS_FILE)) return new Map();
  try {
    const data = JSON.parse(readFileSync(SESSIONS_FILE, "utf-8"));
    return new Map(Object.entries(data));
  } catch {
    return new Map();
  }
}

function saveSessions(): void {
  const obj = Object.fromEntries(sessions);
  writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2));
}

const sessions = loadSessions();

const SYSTEM_PROMPT = buildSystemPrompt();

// --- Path safety ---

/** Resolve a path and check it lives inside the allowed directory */
function isInsideDir(dir: string, target: string): boolean {
  try {
    const resolved = resolve(dir, target);
    // Also resolve symlinks when possible
    let real: string;
    try {
      real = realpathSync(resolved);
    } catch {
      // File may not exist yet — use the resolved path
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
    case "Bash": {
      // We validate commands separately
      return [];
    }
    default:
      return [];
  }
}

/** Dangerous patterns for bash commands */
const BASH_BLOCKED_PATTERNS = [
  /\.\.\//,                // path traversal
  /(?:^|\s|[;&|])cd\s/,   // cd command
  /(?:^|\s|[;&|])rm\s+-rf?\s+\//,  // rm on absolute paths
  /(?:^|\s|[;&|])curl\s/,  // network access
  /(?:^|\s|[;&|])wget\s/,
  /(?:^|\s|[;&|])nc\s/,
  /(?:^|\s|[;&|])ssh\s/,
  /(?:^|\s|[;&|])scp\s/,
  /(?:^|\s|[;&|])python/,  // script interpreters
  /(?:^|\s|[;&|])node\s/,
  /(?:^|\s|[;&|])env\s/,
  /(?:^|\s|[;&|])export\s/,
  /(?:^|\s|[;&|])eval\s/,
  /(?:^|\s|[;&|])exec\s/,
  /(?:^|\s|[;&|])source\s/,
  />\s*\//,                // redirect to absolute path
  /(?:^|\s|[;&|])chmod\s/,
  /(?:^|\s|[;&|])chown\s/,
  /(?:^|\s|[;&|])ln\s/,   // symlink creation
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

  // Block any command with dangerous patterns
  for (const pattern of BASH_BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: `Blocked pattern: ${pattern}` };
    }
  }

  // Check command starts with an allowed prefix
  const hasAllowed = BASH_ALLOWED_PREFIXES.some(p => trimmed.startsWith(p));
  if (!hasAllowed) {
    return { allowed: false, reason: `Command not in allowlist. Allowed prefixes: ${BASH_ALLOWED_PREFIXES.join(", ")}` };
  }

  // Block any absolute paths outside projectDir
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
    // Validate file paths for Read/Write/Edit/Glob/Grep
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

    // Validate Bash commands
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
    default:
      return "";
  }
}

/** Map MCP tool names to display names for tool badges */
function displayToolName(name: string): string {
  switch (name) {
    case "mcp__sparkbench__RunSimulation": return "RunSimulation";
    case "mcp__sparkbench__StopSimulation": return "StopSimulation";
    default: return name;
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { message, slug, context } = body as {
    message: string;
    slug: string;
    context?: {
      diagramJson?: string;
      sketchCode?: string;
      pcbText?: string;
      librariesTxt?: string;
      files?: { name: string; content: string }[];
    };
  };

  if (!message?.trim() || !slug) {
    return Response.json({ error: "message and slug are required" }, { status: 400 });
  }

  const projectDir = join(PROJECTS_DIR, slug);
  mkdirSync(projectDir, { recursive: true });

  const existingSession = sessions.get(slug);

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
- This is an EXISTING project. The files already exist in ${projectDir}.
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

Project directory: ${projectDir}
Project slug: ${slug}
Sketch filename: sketch.ino

${projectInstructions}${contextSection}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const write = (data: Record<string, any>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        const simServer = createSimulationServer(write);

        const q = query({
          prompt,
          options: {
            model: "claude-opus-4-6",
            systemPrompt: SYSTEM_PROMPT,
            tools: { type: "preset", preset: "claude_code" },
            allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__sparkbench__RunSimulation", "mcp__sparkbench__StopSimulation"],
            disallowedTools: ["TodoWrite", "TodoRead", "Task", "WebFetch", "WebSearch", "NotebookEdit"],
            permissionMode: "bypassPermissions",
            allowDangerouslySkipPermissions: true,
            canUseTool: buildPermissionHandler(projectDir),
            mcpServers: { sparkbench: simServer },
            cwd: projectDir,
            maxTurns: 30,
            includePartialMessages: true,
            ...(existingSession ? { resume: existingSession } : {}),
            env: {
              HOME: process.env.HOME,
              PATH: process.env.PATH,
              ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
              PLATFORMIO_CORE_DIR: process.env.PLATFORMIO_CORE_DIR,
            },
            stderr: () => {},
          },
        });

        let fullText = "";
        let turnCount = 0;

        for await (const msg of q) {
          // Capture session ID
          if ("session_id" in msg && (msg as any).session_id && !sessions.has(slug)) {
            sessions.set(slug, (msg as any).session_id);
            saveSessions();
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
                write({
                  type: "done",
                  turns: msg.num_turns,
                  cost: msg.total_cost_usd,
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
      } catch (err: any) {
        write({ type: "error", message: err.message });
      } finally {
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
