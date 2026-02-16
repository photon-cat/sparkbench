#!/usr/bin/env npx tsx
/**
 * CLI entry point for running automation scenarios.
 *
 * Usage:
 *   npx tsx scripts/run-scenario.ts <project-slug> [--scenario <file.yaml>]
 *
 * If --scenario is omitted, looks for projects/<slug>/test.scenario.yaml.
 *
 * The sketch is compiled via PlatformIO (must be installed).
 * No dev server required.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";
import os from "os";
import { parseDiagram, findMCUs } from "../lib/diagram-parser";
import { parseScenario, runScenario } from "../lib/scenario-runner";

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "_build");
const PIO_CMD = path.join(os.homedir(), ".platformio/penv/bin/platformio");

function usage(): never {
  console.error("Usage: npx tsx scripts/run-scenario.ts <project-slug> [--scenario <file.yaml>]");
  process.exit(2);
}

// Header-to-PlatformIO library mapping (same as build route)
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

  // Auto-detect from #include
  const includes = sketch.matchAll(/#include\s*[<"]([^>"]+)[>"]/g);
  const detected = new Set<string>();
  for (const m of includes) {
    const lib = HEADER_TO_LIB[m[1]];
    if (lib) detected.add(lib);
  }

  // Parse libraries.txt
  const extraLibs = librariesTxt
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));

  // Merge and deduplicate
  const seen = new Set(baseLibDeps.map(l => l.toLowerCase()));
  const allLibDeps = [...baseLibDeps];
  for (const lib of [...detected, ...extraLibs]) {
    const key = lib.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      allLibDeps.push(lib);
    }
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

function compileSketch(slug: string, board: string): string {
  const projDir = path.join(ROOT, "projects", slug);
  const sketchPath = path.join(projDir, "sketch.ino");
  let sketch: string;
  try {
    sketch = readFileSync(sketchPath, "utf-8");
  } catch {
    throw new Error(`Cannot read sketch: ${sketchPath}`);
  }

  // Auto-add Arduino.h
  if (!sketch.includes("#include <Arduino.h>") && !sketch.includes('#include "Arduino.h"')) {
    sketch = "#include <Arduino.h>\n" + sketch;
  }

  // Read libraries.txt
  let librariesTxt = "";
  try {
    librariesTxt = readFileSync(path.join(projDir, "libraries.txt"), "utf-8");
  } catch { /* no libraries.txt is fine */ }

  // Generate platformio.ini with correct lib_deps
  writeFileSync(path.join(BUILD_DIR, "platformio.ini"), generatePlatformioIni(sketch, librariesTxt, board));

  const srcDir = path.join(BUILD_DIR, "src");
  const includeDir = path.join(BUILD_DIR, "include");

  // Clean and recreate
  rmSync(srcDir, { recursive: true, force: true });
  rmSync(includeDir, { recursive: true, force: true });
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(includeDir, { recursive: true });

  writeFileSync(path.join(srcDir, "main.cpp"), sketch);

  // Copy any header files from the project directory
  try {
    const files = readdirSync(projDir);
    for (const f of files) {
      if (f.endsWith(".h")) {
        const content = readFileSync(path.join(projDir, f), "utf-8");
        writeFileSync(path.join(includeDir, f), content);
      }
    }
  } catch { /* ignore */ }

  console.log(`Compiling sketch for ${board}...`);
  try {
    execFileSync(PIO_CMD, ["run", "-e", board], {
      cwd: BUILD_DIR,
      timeout: 120_000,
      stdio: "pipe",
    });
  } catch (err: any) {
    console.error("Compilation failed:");
    if (err.stderr) console.error(err.stderr.toString());
    if (err.stdout) console.error(err.stdout.toString());
    process.exit(1);
  }

  const hexPath = path.join(BUILD_DIR, ".pio", "build", board, "firmware.hex");
  return readFileSync(hexPath, "utf-8");
}

// --- Main ---
const args = process.argv.slice(2);
if (args.length === 0) usage();

const slug = args[0];
let scenarioPath: string | null = null;

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--scenario" && args[i + 1]) {
    scenarioPath = args[++i];
  }
}

if (!scenarioPath) {
  scenarioPath = path.join(ROOT, "projects", slug, "test.scenario.yaml");
}

// Load diagram
const diagramPath = path.join(ROOT, "projects", slug, "diagram.json");
let diagramJson: unknown;
try {
  diagramJson = JSON.parse(readFileSync(diagramPath, "utf-8"));
} catch {
  console.error(`Cannot read diagram: ${diagramPath}`);
  process.exit(1);
}
const diagram = parseDiagram(diagramJson);

// Determine board
const mcus = findMCUs(diagram);
const target = mcus.find((m) => m.simulatable);
const board = target?.boardId ?? "uno";

// Compile
const hex = compileSketch(slug, board);
console.log("Compilation successful.\n");

// Load scenario
let scenarioYaml: string;
try {
  scenarioYaml = readFileSync(scenarioPath, "utf-8");
} catch {
  console.error(`Cannot read scenario: ${scenarioPath}`);
  process.exit(1);
}
const scenario = parseScenario(scenarioYaml);

console.log(`Running scenario: ${scenario.name}`);
console.log("─".repeat(50));

const result = runScenario(hex, diagram, scenario);

// Print results
for (const step of result.steps) {
  const icon = step.passed ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`  ${icon} Step ${step.step + 1}: ${step.description}`);
  if (step.error) {
    console.log(`    \x1b[31m${step.error}\x1b[0m`);
  }
}

console.log("─".repeat(50));
if (result.passed) {
  console.log("\x1b[32mAll steps passed!\x1b[0m");
  process.exit(0);
} else {
  console.log("\x1b[31mScenario failed.\x1b[0m");
  process.exit(1);
}
