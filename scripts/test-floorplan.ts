#!/usr/bin/env npx tsx
/**
 * SparkBench PCB Floorplan Agent Test
 *
 * End-to-end test: gives the agent a simplified Simon Says circuit
 * and validates it can produce a valid PCB floorplan on an Arduino
 * Uno shield (68.6 x 53.3mm).
 *
 * Usage:
 *   npx tsx scripts/test-floorplan.ts
 *   npx tsx scripts/test-floorplan.ts --model=claude-haiku-4-5-20251001
 */

import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import {
  mkdirSync, readFileSync, writeFileSync, existsSync,
  realpathSync, rmSync, cpSync,
} from "fs";
import { join, resolve } from "path";
import os from "os";
import { buildSystemPrompt } from "../lib/sparky-prompts";
import { parseDiagram } from "../lib/diagram-parser";
import { extractNetlist } from "../lib/netlist";
import { initPCBFromSchematic } from "../lib/pcb-parser";
import { getFootprintForType } from "../lib/pcb-footprints";
import { buildKicadPCBTree } from "../lib/kicanvas-factory";
import { serializeSExpr } from "../lib/sexpr-serializer";

// ─── Constants ───────────────────────────────────────────────
const ROOT = resolve(__dirname, "..");
const BOARD_WIDTH = 68.6;
const BOARD_HEIGHT = 53.3;
const BOARD_TOLERANCE = 0.5; // mm

// ─── Terminal colors ─────────────────────────────────────────
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

// ─── Load .env.local ────────────────────────────────────────
function loadEnvFile() {
  for (const f of [".env.local", ".env"]) {
    const p = join(ROOT, f);
    if (existsSync(p)) {
      const content = readFileSync(p, "utf-8");
      for (const line of content.split("\n")) {
        const match = line.match(/^([A-Z_]+)=(.+)$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].trim();
        }
      }
    }
  }
}
loadEnvFile();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(`${RED}Error: ANTHROPIC_API_KEY not set${RESET}`);
  console.error("Set it in .env.local or export ANTHROPIC_API_KEY=sk-ant-...");
  process.exit(1);
}

// ─── Path safety (from app/api/chat/route.ts) ───────────────
function isInsideDir(dir: string, target: string): boolean {
  try {
    const resolved = resolve(dir, target);
    let real: string;
    try { real = realpathSync(resolved); } catch { real = resolved; }
    return real === dir || real.startsWith(dir + "/");
  } catch { return false; }
}

const BASH_BLOCKED_PATTERNS = [
  /\.\.\//,
  /(?:^|\s|[;&|])cd\s/,
  /(?:^|\s|[;&|])rm\s+-rf?\s+\//,
  /(?:^|\s|[;&|])curl\s/,
  /(?:^|\s|[;&|])wget\s/,
  /(?:^|\s|[;&|])nc\s/,
  /(?:^|\s|[;&|])ssh\s/,
  /(?:^|\s|[;&|])python/,
  /(?:^|\s|[;&|])node\s/,
  /(?:^|\s|[;&|])eval\s/,
  /(?:^|\s|[;&|])exec\s/,
  />\s*\//,
];

const BASH_ALLOWED_PREFIXES = [
  "cat ", "ls", "head ", "tail ", "wc ", "find ", "grep ", "mkdir ", "cp ", "mv ", "echo ",
];

function isBashCommandAllowed(command: string, projectDir: string): { allowed: boolean; reason?: string } {
  const trimmed = command.trim();
  for (const pattern of BASH_BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) return { allowed: false, reason: `Blocked pattern: ${pattern}` };
  }
  if (!BASH_ALLOWED_PREFIXES.some(p => trimmed.startsWith(p))) {
    return { allowed: false, reason: `Command not in allowlist` };
  }
  const absolutePaths = trimmed.match(/\/[\w\/.+-]+/g) || [];
  for (const p of absolutePaths) {
    if (!isInsideDir(projectDir, p)) return { allowed: false, reason: `Path ${p} outside project dir` };
  }
  return { allowed: true };
}

function buildPermissionHandler(projectDir: string) {
  return async (toolName: string, input: Record<string, unknown>): Promise<PermissionResult> => {
    const pathKeys: Record<string, string> = { Read: "file_path", Write: "file_path", Edit: "file_path", Glob: "path", Grep: "path" };
    const key = pathKeys[toolName];
    if (key && input[key]) {
      if (!isInsideDir(projectDir, String(input[key]))) {
        return { behavior: "deny", message: `Access denied: path outside project directory` };
      }
    }
    if (toolName === "Bash") {
      const check = isBashCommandAllowed(String(input.command || ""), projectDir);
      if (!check.allowed) return { behavior: "deny", message: `Bash denied: ${check.reason}` };
    }
    return { behavior: "allow" };
  };
}

// ─── MCP server (CheckFloorplan, SetBoardSize, UpdatePCB) ───
function createTestMcpServer(projectDir: string) {
  return createSdkMcpServer({
    name: "sparkbench",
    version: "1.0.0",
    tools: [
      tool(
        "CheckFloorplan",
        "Check the PCB floorplan for courtyard overlaps and out-of-bounds footprints.",
        { diagramJson: z.string().describe("The full diagram.json content to validate") },
        async (args) => {
          try {
            const diagram = parseDiagram(JSON.parse(args.diagramJson));
            const netlist = extractNetlist(diagram);
            const boardSize = diagram.boardSize;
            const violations: string[] = [];

            for (const part of diagram.parts) {
              if (!getFootprintForType(part.type) && !part.footprint) {
                violations.push(`Missing footprint: ${part.id} (${part.type})`);
              }
            }
            for (const part of diagram.parts) {
              if (part.pcbX === undefined || part.pcbY === undefined) {
                if (getFootprintForType(part.type) || part.footprint) {
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
        "Set the PCB board dimensions in mm.",
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
            return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
          }
        },
      ),
      tool(
        "SaveRoutedBoard",
        "Save a routed board (from DeepPCB) to board.kicad_pcb. Use this after getting the routed board content from DeepPCB Save_best_board_artifact.",
        {
          boardContent: z.string().describe("The full routed .kicad_pcb file content"),
        },
        async (args) => {
          try {
            writeFileSync(join(projectDir, "board.kicad_pcb"), args.boardContent);
            const segCount = (args.boardContent.match(/\(segment\s/g) || []).length;
            const viaCount = (args.boardContent.match(/\(via\s/g) || []).length;
            return { content: [{ type: "text" as const, text: `Routed board saved to board.kicad_pcb (${args.boardContent.length} chars, ${segCount} segments, ${viaCount} vias)` }] };
          } catch (e: any) {
            return { content: [{ type: "text" as const, text: `Error saving routed board: ${e.message}` }] };
          }
        },
      ),
      tool(
        "UpdatePCB",
        "Regenerate the PCB layout from diagram.json. This creates/updates board.kicad_pcb.",
        { reason: z.string().optional().describe("Brief reason") },
        async () => {
          try {
            const diagramPath = join(projectDir, "diagram.json");
            const raw = JSON.parse(readFileSync(diagramPath, "utf-8"));
            const diagram = parseDiagram(raw);
            const netlist = extractNetlist(diagram);
            const pcb = initPCBFromSchematic(diagram, netlist, undefined, raw.boardSize);
            const tree = buildKicadPCBTree(pcb);
            const pcbText = serializeSExpr(tree);
            writeFileSync(join(projectDir, "board.kicad_pcb"), pcbText);
            return { content: [{ type: "text" as const, text: `PCB regenerated: board.kicad_pcb written (${pcbText.length} chars, ${pcb.footprints.length} footprints)` }] };
          } catch (e: any) {
            return { content: [{ type: "text" as const, text: `Error regenerating PCB: ${e.message}` }] };
          }
        },
      ),
    ],
  });
}

// ─── Validation ─────────────────────────────────────────────
interface ValidationResult {
  check: string;
  passed: boolean;
  detail: string;
}

function validateFloorplan(tmpDir: string, expectRouting: boolean): ValidationResult[] {
  const results: ValidationResult[] = [];
  const diagramPath = join(tmpDir, "diagram.json");

  if (!existsSync(diagramPath)) {
    results.push({ check: "diagram.json exists", passed: false, detail: "File not found" });
    return results;
  }

  let raw: any;
  try {
    raw = JSON.parse(readFileSync(diagramPath, "utf-8"));
  } catch (e: any) {
    results.push({ check: "diagram.json is valid JSON", passed: false, detail: e.message });
    return results;
  }

  const diagram = parseDiagram(raw);

  // Check 1: All parts have footprint
  const partsWithFootprints = diagram.parts.filter(p =>
    !!getFootprintForType(p.type) || !!p.footprint
  );
  const missingFootprint = diagram.parts.filter(p =>
    !getFootprintForType(p.type) && !p.footprint
  );
  results.push({
    check: "All parts have footprint",
    passed: missingFootprint.length === 0,
    detail: missingFootprint.length === 0
      ? `${partsWithFootprints.length} parts OK`
      : `Missing: ${missingFootprint.map(p => p.id).join(", ")}`,
  });

  // Check 2: All footprint-bearing parts have pcbX/pcbY
  const placeable = diagram.parts.filter(p => !!getFootprintForType(p.type) || !!p.footprint);
  const missingPlacement = placeable.filter(p => p.pcbX === undefined || p.pcbY === undefined);
  results.push({
    check: "All parts have pcbX/pcbY",
    passed: missingPlacement.length === 0,
    detail: missingPlacement.length === 0
      ? `${placeable.length} parts placed`
      : `Missing: ${missingPlacement.map(p => p.id).join(", ")}`,
  });

  // Check 3: Board size is Arduino Uno shield
  const bs = raw.boardSize;
  const sizeOk = bs
    && Math.abs(bs.width - BOARD_WIDTH) <= BOARD_TOLERANCE
    && Math.abs(bs.height - BOARD_HEIGHT) <= BOARD_TOLERANCE;
  results.push({
    check: `Board size is Arduino shield (${BOARD_WIDTH}x${BOARD_HEIGHT}mm)`,
    passed: !!sizeOk,
    detail: bs ? `${bs.width}x${bs.height}mm` : "boardSize not set",
  });

  // Check 4 & 5: Overlap and bounds
  try {
    const netlist = extractNetlist(diagram);
    const pcb = initPCBFromSchematic(diagram, netlist, undefined, raw.boardSize);
    const overlaps: string[] = [];
    const outOfBounds: string[] = [];

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
          overlaps.push(`${a.ref} <-> ${b.ref}`);
        }
      }

      const bw = pcb.boardOutline.vertices[1]?.x ?? 100;
      const bh = pcb.boardOutline.vertices[2]?.y ?? 80;
      if (ax1 < 0 || ay1 < 0 || ax2 > bw || ay2 > bh) {
        outOfBounds.push(`${a.ref} (${a.x.toFixed(1)},${a.y.toFixed(1)})`);
      }
    }

    results.push({
      check: "No courtyard overlaps",
      passed: overlaps.length === 0,
      detail: overlaps.length === 0
        ? `${pcb.footprints.length} footprints, no overlaps`
        : `Overlaps: ${overlaps.join("; ")}`,
    });

    results.push({
      check: "All footprints within board bounds",
      passed: outOfBounds.length === 0,
      detail: outOfBounds.length === 0
        ? "All within bounds"
        : `Out of bounds: ${outOfBounds.join(", ")}`,
    });
  } catch (e: any) {
    results.push({ check: "PCB generation", passed: false, detail: e.message });
  }

  // Check 6: Valid rotation values
  const badRotations = diagram.parts.filter(p =>
    p.pcbRotation !== undefined && ![0, 90, 180, 270].includes(p.pcbRotation)
  );
  results.push({
    check: "Rotation values valid (0/90/180/270)",
    passed: badRotations.length === 0,
    detail: badRotations.length === 0
      ? "All rotations valid"
      : `Invalid: ${badRotations.map(p => `${p.id}=${p.pcbRotation}`).join(", ")}`,
  });

  // Check 7: board.kicad_pcb exists
  const pcbPath = join(tmpDir, "board.kicad_pcb");
  const pcbExists = existsSync(pcbPath);
  results.push({
    check: "board.kicad_pcb generated",
    passed: pcbExists,
    detail: pcbExists
      ? `${readFileSync(pcbPath, "utf-8").length} chars`
      : "File not found",
  });

  // Check 8: If routing was expected, verify traces exist in the board file
  if (expectRouting && pcbExists) {
    const pcbContent = readFileSync(pcbPath, "utf-8");
    const segmentCount = (pcbContent.match(/\(segment\s/g) || []).length;
    const viaCount = (pcbContent.match(/\(via\s/g) || []).length;
    const hasTraces = segmentCount > 0;
    results.push({
      check: "DeepPCB routing produced traces",
      passed: hasTraces,
      detail: hasTraces
        ? `${segmentCount} segments, ${viaCount} vias`
        : "No trace segments found in board.kicad_pcb",
    });
  }

  return results;
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  const modelArg = process.argv.find(a => a.startsWith("--model="));
  const model = modelArg ? modelArg.split("=")[1] : "claude-sonnet-4-6";

  const hasDeepPCB = !!process.env.DEEPPCB_API_KEY;

  console.log(`\n${BOLD}${CYAN}SparkBench PCB Floorplan Test${RESET}`);
  console.log(`${DIM}Model: ${model}${RESET}`);
  console.log(`${DIM}DeepPCB: ${hasDeepPCB ? "enabled" : "disabled (set DEEPPCB_API_KEY to enable routing)"}${RESET}`);

  // Set up temp directory with project files
  const tmpDir = join(os.tmpdir(), `sparkbench-floorplan-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  const projectSrc = join(ROOT, "projects", "simon-game-floorplan-test");
  cpSync(projectSrc, tmpDir, { recursive: true });

  console.log(`${DIM}Temp dir: ${tmpDir}${RESET}`);

  const diagramContent = readFileSync(join(tmpDir, "diagram.json"), "utf-8");

  // Build agent prompt
  const routingInstruction = hasDeepPCB
    ? ` After floorplanning, call UpdatePCB to generate board.kicad_pcb, then use the DeepPCB tools to autoroute the board. Read board.kicad_pcb and pass its content to the DeepPCB tools. IMPORTANT: After routing completes, get the routed board from DeepPCB Save_best_board_artifact, then call the SaveRoutedBoard sparkbench tool with the full kicad_pcb content to save it.`
    : "";

  const prompt = `The user says: "Floorplan this circuit as an Arduino Uno shield hat. The board must be exactly 68.6x53.3mm (standard Arduino Uno shield dimensions). Place all components so they fit within the board with no overlaps.${routingInstruction}"

Project directory: ${tmpDir}
Project slug: simon-game-floorplan-test
Sketch filename: sketch.ino

CRITICAL RULES FOR THIS REQUEST:
- This is an EXISTING project. The files already exist in ${tmpDir}.
- NEVER overwrite diagram.json with a blank/new version.
- To modify diagram.json: Read it first then Write the complete updated version that PRESERVES all existing parts and connections.
- The current project state is provided below.

--- CURRENT PROJECT STATE ---
Current diagram.json:
\`\`\`json
${diagramContent}
\`\`\``;

  const SYSTEM_PROMPT = buildSystemPrompt();
  const startTime = Date.now();
  let turnCount = 0;
  let agentCost = 0;

  console.log(`\n${BOLD}Agent working...${RESET}`);

  try {
    const q = query({
      prompt,
      options: {
        model,
        systemPrompt: SYSTEM_PROMPT,
        tools: { type: "preset" as const, preset: "claude_code" as const },
        allowedTools: [
          "Read", "Write", "Edit", "Bash", "Glob", "Grep",
          "mcp__sparkbench__CheckFloorplan",
          "mcp__sparkbench__SetBoardSize",
          "mcp__sparkbench__UpdatePCB",
          "mcp__sparkbench__SaveRoutedBoard",
          ...(hasDeepPCB ? [
            "mcp__deeppcb__extract_constraints", "mcp__deeppcb__validate_constraints",
            "mcp__deeppcb__start_placement", "mcp__deeppcb__start_routing",
            "mcp__deeppcb__check_status", "mcp__deeppcb__get_best_board",
            "mcp__deeppcb__derive_placement_constraints", "mcp__deeppcb__validate_placement_constraints",
            "mcp__deeppcb__review_placement", "mcp__deeppcb__retrieve_best_board",
          ] : []),
        ],
        disallowedTools: [
          "TodoWrite", "TodoRead", "Task", "WebFetch", "WebSearch",
          "NotebookEdit", "mcp__sparkbench__RunSimulation",
          "mcp__sparkbench__StopSimulation",
        ],
        permissionMode: "bypassPermissions" as const,
        allowDangerouslySkipPermissions: true,
        canUseTool: buildPermissionHandler(tmpDir),
        mcpServers: {
          sparkbench: createTestMcpServer(tmpDir),
          ...(hasDeepPCB ? {
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
        maxTurns: hasDeepPCB ? 60 : 30,
        env: {
          HOME: process.env.HOME,
          PATH: process.env.PATH,
        },
        stderr: () => {},
      },
    });

    for await (const msg of q) {
      switch (msg.type) {
        case "assistant": {
          turnCount++;
          for (const block of msg.message.content) {
            if (block.type === "tool_use") {
              let name = block.name
                .replace("mcp__sparkbench__", "")
                .replace("mcp__deeppcb__", "DeepPCB:");
              const input = block.input as Record<string, any>;
              let detail = "";
              if (name === "Read" || name === "Write" || name === "Edit") {
                detail = ` ${DIM}(${(input.file_path || "").split("/").pop()})${RESET}`;
              } else if (name === "SetBoardSize") {
                detail = ` ${DIM}(${input.width}x${input.height}mm)${RESET}`;
              }
              console.log(`  ${DIM}[tool]${RESET} ${name}${detail}`);
            }
          }
          break;
        }
        case "result": {
          if (msg.subtype === "success") {
            agentCost = msg.total_cost_usd ?? 0;
          } else {
            console.error(`\n${RED}Agent failed: ${msg.subtype}${RESET}`);
            process.exit(1);
          }
          break;
        }
      }
    }
  } catch (err: any) {
    console.error(`\n${RED}Agent error: ${err.message}${RESET}`);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Validate the result
  console.log(`\n${BOLD}Validation Results${RESET}`);
  const results = validateFloorplan(tmpDir, hasDeepPCB);

  for (const r of results) {
    const icon = r.passed ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
    console.log(`  [${icon}] ${r.check}: ${r.detail}`);
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  console.log(`\n${allPassed ? GREEN : RED}${BOLD}${passed}/${total} checks passed${RESET}`);
  console.log(`${DIM}Cost: $${agentCost.toFixed(4)} | Turns: ${turnCount} | Time: ${elapsed}s${RESET}\n`);

  // Print the resulting diagram for debugging
  if (!allPassed) {
    try {
      const finalDiagram = JSON.parse(readFileSync(join(tmpDir, "diagram.json"), "utf-8"));
      console.log(`${YELLOW}Final diagram.json parts:${RESET}`);
      for (const p of finalDiagram.parts) {
        const fp = p.footprint ? ` footprint=${p.footprint}` : "";
        const pos = p.pcbX !== undefined ? ` pos=(${p.pcbX},${p.pcbY})` : " NO POSITION";
        const rot = p.pcbRotation !== undefined ? ` rot=${p.pcbRotation}` : "";
        console.log(`  ${p.id}: ${p.type}${fp}${pos}${rot}`);
      }
      if (finalDiagram.boardSize) {
        console.log(`  boardSize: ${finalDiagram.boardSize.width}x${finalDiagram.boardSize.height}mm`);
      }
    } catch { /* ignore */ }
  }

  // Cleanup
  rmSync(tmpDir, { recursive: true, force: true });

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error(`${RED}Fatal: ${err.message}${RESET}`);
  process.exit(1);
});
