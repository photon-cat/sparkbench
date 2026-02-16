#!/usr/bin/env npx tsx
/**
 * sparkbench-cli — Command-line tools for SparkBench.
 *
 * Usage:
 *   sparkbench test <project>           Run a test scenario
 *   sparkbench fuzz <project>           AI security fuzzer (SparkyFuzzer)
 *   sparkbench list                     List all projects
 *   sparkbench help                     Show this help
 */

import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const PROJECTS_DIR = path.join(ROOT, "projects");

// ─── Colors ────────────────────────────────────────────────
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const BANNER = `${BOLD}${CYAN}⚡ SparkBench CLI${RESET} ${DIM}v0.1.0${RESET}
${DIM}Hardware development platform — test, fuzz, and manage projects${RESET}
`;

function printHelp() {
  console.log(BANNER);
  console.log(`${BOLD}USAGE${RESET}`);
  console.log(`  sparkbench <command> [options]\n`);
  console.log(`${BOLD}COMMANDS${RESET}`);
  console.log(`  ${GREEN}test${RESET} <project> [--scenario <file>]   Run a YAML test scenario against the simulator`);
  console.log(`  ${GREEN}serve${RESET} <project> [--port 8765]        Run headless sim with WebSocket API for external programs`);
  console.log(`  ${GREEN}fuzz${RESET} <project>                       AI-powered security fuzzer (Claude Opus 4.6)`);
  console.log(`  ${GREEN}list${RESET}                                 List all projects with metadata`);
  console.log(`  ${GREEN}help${RESET}                                 Show this help message\n`);
  console.log(`${BOLD}EXAMPLES${RESET}`);
  console.log(`  ${DIM}# Run the test scenario for combo-safe${RESET}`);
  console.log(`  sparkbench test combo-safe\n`);
  console.log(`  ${DIM}# Fuzz the combo-safe project for security vulnerabilities${RESET}`);
  console.log(`  sparkbench fuzz combo-safe\n`);
  console.log(`  ${DIM}# Run a custom scenario file${RESET}`);
  console.log(`  sparkbench test combo-safe --scenario exploits/timing.yaml\n`);
  console.log(`${BOLD}ENVIRONMENT${RESET}`);
  console.log(`  ${DIM}ANTHROPIC_API_KEY${RESET}   Required for 'fuzz' command (Claude Opus 4.6)`);
  console.log(`  ${DIM}PLATFORMIO_CORE_DIR${RESET} Optional PlatformIO install path\n`);
}

function listProjects() {
  console.log(BANNER);
  let dirs: string[];
  try {
    dirs = readdirSync(PROJECTS_DIR).filter(d => {
      const full = path.join(PROJECTS_DIR, d);
      return statSync(full).isDirectory() && existsSync(path.join(full, "sketch.ino"));
    });
  } catch {
    console.log(`${RED}No projects directory found.${RESET}`);
    return;
  }

  if (dirs.length === 0) {
    console.log(`${DIM}No projects found.${RESET}`);
    return;
  }

  console.log(`${BOLD}PROJECTS${RESET} (${dirs.length})\n`);

  for (const slug of dirs.sort()) {
    const projDir = path.join(PROJECTS_DIR, slug);
    const hasTest = existsSync(path.join(projDir, "test.scenario.yaml"));
    const hasPCB = existsSync(path.join(projDir, "board.kicad_pcb"));
    const hasDiagram = existsSync(path.join(projDir, "diagram.json"));

    let partCount = 0;
    if (hasDiagram) {
      try {
        const d = JSON.parse(readFileSync(path.join(projDir, "diagram.json"), "utf-8"));
        partCount = d.parts?.length || 0;
      } catch { /* ignore */ }
    }

    let lineCount = 0;
    try {
      lineCount = readFileSync(path.join(projDir, "sketch.ino"), "utf-8").split("\n").length;
    } catch { /* ignore */ }

    const badges = [
      hasDiagram ? `${GREEN}diagram${RESET}` : null,
      hasPCB ? `${CYAN}pcb${RESET}` : null,
      hasTest ? `${YELLOW}test${RESET}` : null,
    ].filter(Boolean).join(" ");

    console.log(`  ${GREEN}●${RESET} ${BOLD}${slug}${RESET}`);
    console.log(`    ${DIM}${partCount} parts, ${lineCount} lines${RESET}  ${badges}`);
  }
  console.log();
}

// ─── Main dispatch ─────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (command === "list" || command === "ls") {
  listProjects();
  process.exit(0);
}

if (command === "test") {
  // Delegate to run-scenario.ts
  const subArgs = args.slice(1);
  if (subArgs.length === 0) {
    console.error(`${RED}Error: 'test' requires a project slug${RESET}`);
    console.error(`Usage: sparkbench test <project> [--scenario <file>]`);
    process.exit(2);
  }
  try {
    execFileSync("npx", ["tsx", path.join(__dirname, "run-scenario.ts"), ...subArgs], {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch (e: any) {
    process.exit(e.status || 1);
  }
  process.exit(0);
}

if (command === "serve") {
  const subArgs = args.slice(1);
  if (subArgs.length === 0) {
    console.error(`${RED}Error: 'serve' requires a project slug${RESET}`);
    console.error(`Usage: sparkbench serve <project> [--port 8765]`);
    process.exit(2);
  }
  try {
    execFileSync("npx", ["tsx", path.join(__dirname, "serve-api.ts"), ...subArgs], {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch (e: any) {
    process.exit(e.status || 1);
  }
  process.exit(0);
}

if (command === "fuzz") {
  const subArgs = args.slice(1);
  if (subArgs.length === 0) {
    console.error(`${RED}Error: 'fuzz' requires a project slug${RESET}`);
    console.error(`Usage: sparkbench fuzz <project>`);
    process.exit(2);
  }
  try {
    execFileSync("npx", ["tsx", path.join(__dirname, "sparky-fuzzer.ts"), ...subArgs], {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch (e: any) {
    process.exit(e.status || 1);
  }
  process.exit(0);
}

console.error(`${RED}Unknown command: ${command}${RESET}`);
console.error(`Run 'sparkbench help' for available commands.`);
process.exit(2);
