import { query } from "@anthropic-ai/claude-agent-sdk";
import { buildSystemPrompt } from "@/lib/sparky-prompts";
import {
  mkdirSync,
  readFileSync,
  existsSync,
  writeFileSync,
} from "fs";
import { join } from "path";

const PROJECTS_DIR = join(process.cwd(), "projects");
const DATA_DIR = join(process.cwd(), "data");
const SESSIONS_FILE = join(DATA_DIR, "sessions.json");
const ARDUINO_CLI = "/opt/homebrew/bin/arduino-cli";

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
    default:
      return "";
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
- NEVER overwrite diagram.json or ${slug}.ino with a blank/new version.
- To modify diagram.json: use the Edit tool to change specific parts/connections, or Read it first then Write the complete updated version that PRESERVES all existing parts and connections.
- To modify ${slug}.ino: use the Edit tool for targeted changes.
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
Sketch filename: ${slug}.ino
arduino-cli path: ${ARDUINO_CLI}
Compile command: arduino-cli compile --fqbn arduino:avr:uno --build-path ./build .

${projectInstructions}${contextSection}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const write = (data: Record<string, any>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        const q = query({
          prompt,
          options: {
            systemPrompt: SYSTEM_PROMPT,
            tools: { type: "preset", preset: "claude_code" },
            allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
            permissionMode: "bypassPermissions",
            allowDangerouslySkipPermissions: true,
            cwd: projectDir,
            maxTurns: 30,
            includePartialMessages: true,
            ...(existingSession ? { resume: existingSession } : {}),
            env: {
              ...process.env,
              CLAUDECODE: undefined,
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
                    name: block.name,
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
