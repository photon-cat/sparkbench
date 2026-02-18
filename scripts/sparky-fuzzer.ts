#!/usr/bin/env npx tsx
/**
 * SparkyFuzzer — AI-powered security fuzzer for embedded firmware.
 *
 * Uses Claude Opus 4.6 to analyze Arduino firmware for vulnerabilities,
 * then generates and runs test scenarios against the SparkBench headless
 * simulator to prove exploitability.
 *
 * Usage:
 *   npx tsx scripts/sparky-fuzzer.ts <project-slug>
 *
 * Requires ANTHROPIC_API_KEY in environment.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";
import os from "os";
import * as yaml from "js-yaml";
import { parseDiagram, findMCUs } from "../lib/diagram-parser";
import { parseScenario, runScenario } from "../lib/scenario-runner";

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "_build");
const PIO_CMD = path.join(os.homedir(), ".platformio/penv/bin/platformio");

// ─── Colors ────────────────────────────────────────────────
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

// ─── Header-to-PlatformIO library mapping ──────────────────
const HEADER_TO_LIB: Record<string, string> = {
  "Adafruit_GFX.h": "adafruit/Adafruit GFX Library",
  "Adafruit_SSD1306.h": "adafruit/Adafruit SSD1306",
  "Adafruit_MPU6050.h": "adafruit/Adafruit MPU6050",
  "Adafruit_NeoPixel.h": "adafruit/Adafruit NeoPixel",
  "Adafruit_BusIO.h": "adafruit/Adafruit BusIO",
  "LiquidCrystal_I2C.h": "marcoschwartz/LiquidCrystal_I2C",
  "ArduinoJson.h": "bblanchon/ArduinoJson",
};

function generatePlatformioIni(sketch: string, librariesTxt: string, board: string): string {
  const baseLibDeps = [
    "arduino-libraries/Servo@^1.2.1",
    "adafruit/DHT sensor library@^1.4.6",
    "adafruit/Adafruit Unified Sensor@^1.1.14",
  ];
  const includes = sketch.matchAll(/#include\s*[<"]([^>"]+)[>"]/g);
  const detected = new Set<string>();
  for (const m of includes) {
    const lib = HEADER_TO_LIB[m[1]];
    if (lib) detected.add(lib);
  }
  const extraLibs = librariesTxt.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  const seen = new Set(baseLibDeps.map(l => l.toLowerCase()));
  const allLibDeps = [...baseLibDeps];
  for (const lib of [...detected, ...extraLibs]) {
    const key = lib.toLowerCase();
    if (!seen.has(key)) { seen.add(key); allLibDeps.push(lib); }
  }
  const libDepsStr = allLibDeps.map(l => `  ${l}`).join("\n");
  return `[env:${board}]
platform = atmelavr
board = ${board === "atmega328p" ? "uno" : board}
framework = arduino
lib_deps =
${libDepsStr}
`;
}

// ─── Compile ───────────────────────────────────────────────
function compileSketch(slug: string, board: string): string {
  const projDir = path.join(ROOT, "projects", slug);
  const sketchPath = path.join(projDir, "sketch.ino");
  let sketch = readFileSync(sketchPath, "utf-8");

  if (!sketch.includes("#include <Arduino.h>") && !sketch.includes('#include "Arduino.h"')) {
    sketch = "#include <Arduino.h>\n" + sketch;
  }

  // Read libraries.txt and generate platformio.ini
  let librariesTxt = "";
  try { librariesTxt = readFileSync(path.join(projDir, "libraries.txt"), "utf-8"); } catch { /* ok */ }
  writeFileSync(path.join(BUILD_DIR, "platformio.ini"), generatePlatformioIni(sketch, librariesTxt, board));

  const srcDir = path.join(BUILD_DIR, "src");
  const includeDir = path.join(BUILD_DIR, "include");
  rmSync(srcDir, { recursive: true, force: true });
  rmSync(includeDir, { recursive: true, force: true });
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(includeDir, { recursive: true });
  writeFileSync(path.join(srcDir, "main.cpp"), sketch);

  try {
    for (const f of readdirSync(projDir)) {
      if (f.endsWith(".h")) {
        writeFileSync(path.join(includeDir, f), readFileSync(path.join(projDir, f), "utf-8"));
      }
    }
  } catch { /* ignore */ }

  execFileSync(PIO_CMD, ["run", "-e", board], {
    cwd: BUILD_DIR,
    timeout: 120_000,
    stdio: "pipe",
  });

  return readFileSync(path.join(BUILD_DIR, ".pio", "build", board, "firmware.hex"), "utf-8");
}

// ─── Load .env.local if ANTHROPIC_API_KEY not in env ────────
function loadEnvFile() {
  const envFiles = [".env.local", ".env"];
  for (const f of envFiles) {
    const p = path.join(ROOT, f);
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

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY not set");
  console.error("Set it in .env.local or export ANTHROPIC_API_KEY=sk-ant-...");
  process.exit(1);
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

async function askClaude(messages: Message[], system: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }

  const data = await res.json() as any;
  return data.content[0].text;
}

// ─── Fuzzer system prompt ──────────────────────────────────
const FUZZER_SYSTEM_PROMPT = `You are SparkyFuzzer, an AI security auditor for embedded systems running on SparkBench.

SparkBench is a hardware development platform with a cycle-accurate AVR emulator (avr8js, ATmega328P @ 16MHz). It can run headless test scenarios against compiled firmware.

Your job: analyze Arduino firmware source code and its circuit diagram, identify security vulnerabilities, then generate YAML test scenarios that PROVE each vulnerability is exploitable.

## Available scenario steps:

- delay: <ms>                    # wait N milliseconds
- set-control:                   # interact with a component
    part-id: <id>
    control: <type>              # rotate-cw, rotate-ccw, pressed (0/1)
    value: <number>
- send-serial: "<text>"          # send text to MCU serial RX (adds CR+LF)
- clear-serial: true             # reset captured serial output
- wait-serial: "<substring>"     # wait for serial output (timeout: 5000ms default)
    timeout: <ms>
- expect-serial: "<substring>"   # assert serial output contains text
- expect-display:                # check SSD1306 OLED state
    part-id: <id>
    min-filled: <number>

## Output format:

For each vulnerability found, output a YAML document separated by "---" lines. Each document must be a valid scenario:

\`\`\`yaml
name: "VULN-001: <title>"
version: 1
vulnerability:
  type: <timing-side-channel|integer-overflow|backdoor|buffer-overflow|etc>
  severity: <critical|high|medium|low>
  description: "<explanation of the vulnerability>"
  exploit: "<how an attacker would exploit this>"
  evidence: "<what the scenario output proves>"
  line_numbers: [<line numbers in sketch.ino>]
steps:
  - <scenario steps that demonstrate the vulnerability>
\`\`\`

IMPORTANT TIMING RULES:
- Each scenario must be independently runnable
- After wait-serial for the boot message, ALWAYS add \`delay: 1500\` to let setup() finish
- For encoder button presses: use \`pressed: 1\`, then \`delay: 100\`, then \`pressed: 0\`, then \`delay: 500\` (the firmware has 200ms debounce)
- For encoder rotation BEFORE a button press: use \`rotate-cw: N\` or \`rotate-ccw: N\`, then \`delay: 200\`
- After a failed combo attempt (all 3 digits entered wrong), the firmware does \`delay(1000)\` + resetSafe, so add \`delay: 2000\` before the next attempt
- For send-serial: add \`delay: 500\` BEFORE sending to ensure the firmware's loop() is processing serial input
- Use wait-serial with appropriate timeouts (5000ms minimum for operations involving OLED flush)
- The scenario must produce OBSERVABLE EVIDENCE of the vulnerability
- For timing attacks: use clear-serial before each attempt and check elapsed time in serial output
- For overflow bugs: demonstrate the counter wrapping
- For backdoors: send the trigger and check for leaked data
- Generate ONE scenario per vulnerability — do NOT combine multiple exploits into one scenario
- For send-serial commands that require a response: add \`delay: 500\` before sending, then use \`wait-serial\` with 5000ms timeout

## Reference: Working button press pattern for encoder
\`\`\`yaml
# Rotate encoder to value 7, then press button to confirm
- set-control:
    part-id: encoder1
    control: rotate-cw
    value: 7
- delay: 200
- set-control:
    part-id: encoder1
    control: pressed
    value: 1
- delay: 100
- set-control:
    part-id: encoder1
    control: pressed
    value: 0
- delay: 500
- wait-serial: "[input] Digit 1 = 7"
  timeout: 3000
\`\`\``;

// ─── Main ──────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx tsx scripts/sparky-fuzzer.ts <project-slug>");
    process.exit(2);
  }

  const slug = args[0];
  const projDir = path.join(ROOT, "projects", slug);

  console.log(`\n${BOLD}${CYAN}⚡ SparkyFuzzer${RESET} — AI Security Auditor for Embedded Systems`);
  console.log(`${DIM}Powered by Claude Opus 4.6 + SparkBench headless simulator${RESET}\n`);
  console.log(`${DIM}Target:${RESET} ${slug}`);
  console.log("─".repeat(60));

  // Load project files
  const sketch = readFileSync(path.join(projDir, "sketch.ino"), "utf-8");
  const diagramRaw = readFileSync(path.join(projDir, "diagram.json"), "utf-8");
  const diagram = parseDiagram(JSON.parse(diagramRaw));

  // Compile
  console.log(`\n${YELLOW}[1/4]${RESET} Compiling firmware...`);
  const mcus = findMCUs(diagram);
  const board = mcus.find(m => m.simulatable)?.boardId ?? "uno";
  const hex = compileSketch(slug, board);
  console.log(`${GREEN}✓${RESET} Compilation successful (${board})\n`);

  // Phase 1: Ask Claude to analyze and generate exploit scenarios
  console.log(`${YELLOW}[2/4]${RESET} Analyzing firmware with Claude Opus 4.6...`);

  const analysisPrompt = `Analyze this embedded system for security vulnerabilities.

## sketch.ino
\`\`\`cpp
${sketch}
\`\`\`

## diagram.json
\`\`\`json
${diagramRaw}
\`\`\`

Identify ALL security vulnerabilities in this firmware. For each one, generate a test scenario that proves exploitability using the SparkBench headless simulator.

Output ONLY the YAML scenarios (one per vulnerability), no other text. Start each with \`\`\`yaml and end with \`\`\`.`;

  const response = await askClaude(
    [{ role: "user", content: analysisPrompt }],
    FUZZER_SYSTEM_PROMPT,
  );

  // Parse YAML scenarios from response
  const yamlBlocks = response.match(/```yaml\n([\s\S]*?)```/g) || [];
  const scenarios: Array<{ scenario: any; raw: string }> = [];

  for (const block of yamlBlocks) {
    const yamlContent = block.replace(/```yaml\n/, "").replace(/```$/, "");
    try {
      const parsed = yaml.load(yamlContent) as any;
      if (parsed && parsed.name && parsed.steps) {
        scenarios.push({ scenario: parsed, raw: yamlContent });
      }
    } catch (e) {
      console.log(`${DIM}  (skipped malformed YAML block)${RESET}`);
    }
  }

  console.log(`${GREEN}✓${RESET} Found ${scenarios.length} potential vulnerabilities\n`);

  if (scenarios.length === 0) {
    console.log(`${YELLOW}No vulnerabilities identified.${RESET}`);
    process.exit(0);
  }

  // Phase 2: Run each exploit scenario
  console.log(`${YELLOW}[3/4]${RESET} Running exploit scenarios...\n`);

  const results: Array<{
    name: string;
    vuln: any;
    passed: boolean;
    serialOutput: string;
    steps: any[];
  }> = [];

  for (let i = 0; i < scenarios.length; i++) {
    const { scenario } = scenarios[i];
    const vuln = scenario.vulnerability || {};
    console.log(`  ${CYAN}▸${RESET} ${scenario.name}`);
    console.log(`    ${DIM}Type: ${vuln.type || "unknown"} | Severity: ${vuln.severity || "unknown"}${RESET}`);

    try {
      // Strip the extra vulnerability metadata — scenario runner only needs name/version/steps
      const runnableScenario = {
        name: scenario.name,
        version: scenario.version || 1,
        steps: scenario.steps,
      };
      const result = runScenario(hex, diagram, runnableScenario);

      results.push({
        name: scenario.name,
        vuln,
        passed: result.passed,
        serialOutput: result.serialOutput,
        steps: result.steps,
      });

      if (result.passed) {
        console.log(`    ${RED}${BOLD}⚠ VULNERABILITY CONFIRMED${RESET}`);
      } else {
        console.log(`    ${GREEN}✓ Not exploitable (scenario failed)${RESET}`);
        for (const s of result.steps) {
          if (!s.passed) {
            console.log(`    ${DIM}  Failed at: ${s.description}${RESET}`);
            if (s.error) console.log(`    ${DIM}  ${s.error.split("\n")[0]}${RESET}`);
            break;
          }
        }
      }
    } catch (e) {
      console.log(`    ${YELLOW}⚠ Scenario error: ${e instanceof Error ? e.message : e}${RESET}`);
      results.push({
        name: scenario.name,
        vuln,
        passed: false,
        serialOutput: "",
        steps: [],
      });
    }
    console.log();
  }

  // Phase 3: Send results back to Claude for final analysis
  console.log(`${YELLOW}[4/4]${RESET} Generating security report...\n`);

  const confirmedVulns = results.filter(r => r.passed);
  const failedVulns = results.filter(r => !r.passed);

  const reportPrompt = `Here are the results of running the exploit scenarios against the SparkBench simulator:

${results.map((r, i) => `
## Scenario ${i + 1}: ${r.name}
- Vulnerability type: ${r.vuln.type || "unknown"}
- Severity: ${r.vuln.severity || "unknown"}
- Result: ${r.passed ? "EXPLOITED SUCCESSFULLY" : "FAILED"}
- Serial output (last 500 chars): ${r.serialOutput.slice(-500)}
${r.steps.filter((s: any) => !s.passed).map((s: any) => `- Failed step: ${s.description} — ${s.error || ""}`).join("\n")}
`).join("\n---\n")}

Write a concise security report. For each confirmed vulnerability:
1. Explain what was found
2. Show the evidence from serial output
3. Recommend a fix

For failed scenarios, briefly note why they didn't work.

End with an overall risk assessment.`;

  const report = await askClaude(
    [
      { role: "user", content: analysisPrompt },
      { role: "assistant", content: response },
      { role: "user", content: reportPrompt },
    ],
    FUZZER_SYSTEM_PROMPT,
  );

  // Print final report
  console.log("═".repeat(60));
  console.log(`${BOLD}${CYAN}⚡ SPARKYFUZZER SECURITY REPORT${RESET}`);
  console.log("═".repeat(60));
  console.log(`${DIM}Target: ${slug} | Model: claude-opus-4-6${RESET}`);
  console.log(`${DIM}Scenarios: ${scenarios.length} generated, ${confirmedVulns.length} confirmed${RESET}`);
  console.log("─".repeat(60));
  console.log();
  console.log(report);
  console.log();
  console.log("═".repeat(60));
  console.log(
    `${BOLD}${confirmedVulns.length > 0 ? RED : GREEN}` +
    `${confirmedVulns.length} vulnerabilities confirmed` +
    `${failedVulns.length > 0 ? `, ${failedVulns.length} not exploitable` : ""}` +
    `${RESET}`
  );
  console.log("═".repeat(60));

  // Write report to file
  const reportDir = path.join(projDir, "fuzzer-report");
  mkdirSync(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(
    path.join(reportDir, `report-${timestamp}.md`),
    `# SparkyFuzzer Security Report\n\n` +
    `**Target:** ${slug}\n` +
    `**Date:** ${new Date().toISOString()}\n` +
    `**Model:** claude-opus-4-6\n` +
    `**Scenarios:** ${scenarios.length} generated, ${confirmedVulns.length} confirmed\n\n` +
    `---\n\n${report}\n`,
  );
  console.log(`\n${DIM}Report saved to ${reportDir}/${RESET}\n`);

  // Save generated scenarios
  for (let i = 0; i < scenarios.length; i++) {
    writeFileSync(
      path.join(reportDir, `exploit-${i + 1}.scenario.yaml`),
      scenarios[i].raw,
    );
  }

  process.exit(confirmedVulns.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`${RED}Fatal error: ${err.message}${RESET}`);
  process.exit(1);
});
