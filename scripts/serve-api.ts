#!/usr/bin/env npx tsx
/**
 * sparkbench serve — Headless simulation with WebSocket API.
 *
 * Compiles and runs a project in headless mode, exposing a JSON API
 * over WebSocket for external programs to interface with.
 *
 * Usage:
 *   npx tsx scripts/serve-api.ts <project-slug> [--port 8765]
 *
 * WebSocket API (JSON messages):
 *
 *   Client → Server:
 *     { "cmd": "set-control", "partId": "pitot", "control": "pressure", "value": 103000 }
 *     { "cmd": "set-control", "partId": "pitot", "control": "temperature", "value": 15 }
 *     { "cmd": "get-state" }
 *     { "cmd": "send-serial", "data": "hello" }
 *
 *   Server → Client:
 *     { "type": "serial", "data": "AT:IAS=120 TGT=120 THR=90 ENG\n" }
 *     { "type": "state", "parts": { "throttle": { "angle": 90 }, "pitot": { "pressure": 103000 } }, "serial": "..." }
 *     { "type": "ready", "project": "autothrottle", "parts": [...] }
 *     { "type": "error", "message": "..." }
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";
import os from "os";
import { WebSocketServer, WebSocket } from "ws";
import { parseDiagram, findMCUs } from "../lib/diagram-parser";
import { AVRRunner } from "../lib/avr-runner";
import { wireComponents, cleanupWiring, WiredComponent } from "../lib/wire-components";

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "_build");
const PIO_CMD = path.join(os.homedir(), ".platformio/penv/bin/platformio");

// Header-to-PlatformIO library mapping
const HEADER_TO_LIB: Record<string, string> = {
  "Adafruit_GFX.h": "adafruit/Adafruit GFX Library",
  "Adafruit_SSD1306.h": "adafruit/Adafruit SSD1306",
  "Adafruit_MPU6050.h": "adafruit/Adafruit MPU6050",
  "Adafruit_BMP085.h": "adafruit/Adafruit BMP085 Library",
  "Adafruit_NeoPixel.h": "adafruit/Adafruit NeoPixel",
  "LiquidCrystal_I2C.h": "marcoschwartz/LiquidCrystal_I2C",
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
    if (!seen.has(lib.toLowerCase())) { seen.add(lib.toLowerCase()); allLibDeps.push(lib); }
  }
  return `[env:${board}]\nplatform = atmelavr\nboard = ${board === "atmega328p" ? "uno" : board}\nframework = arduino\nlib_deps =\n${allLibDeps.map(l => `  ${l}`).join("\n")}\n`;
}

function compileSketch(slug: string, board: string): string {
  const projDir = path.join(ROOT, "projects", slug);
  let sketch = readFileSync(path.join(projDir, "sketch.ino"), "utf-8");
  if (!sketch.includes("#include <Arduino.h>") && !sketch.includes('#include "Arduino.h"')) {
    sketch = "#include <Arduino.h>\n" + sketch;
  }
  let librariesTxt = "";
  try { librariesTxt = readFileSync(path.join(projDir, "libraries.txt"), "utf-8"); } catch {}

  writeFileSync(path.join(BUILD_DIR, "platformio.ini"), generatePlatformioIni(sketch, librariesTxt, board));
  const srcDir = path.join(BUILD_DIR, "src");
  const includeDir = path.join(BUILD_DIR, "include");
  rmSync(srcDir, { recursive: true, force: true });
  rmSync(includeDir, { recursive: true, force: true });
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(includeDir, { recursive: true });
  writeFileSync(path.join(srcDir, "main.cpp"), sketch);

  try {
    const files = readdirSync(projDir);
    for (const f of files) {
      if (f.endsWith(".h")) writeFileSync(path.join(includeDir, f), readFileSync(path.join(projDir, f), "utf-8"));
    }
  } catch {}

  console.log(`Compiling sketch for ${board}...`);
  execFileSync(PIO_CMD, ["run", "-e", board], { cwd: BUILD_DIR, timeout: 120_000, stdio: "pipe" });
  return readFileSync(path.join(BUILD_DIR, ".pio", "build", board, "firmware.hex"), "utf-8");
}

// --- Main ---
const args = process.argv.slice(2);
const slug = args[0];
if (!slug) {
  console.error("Usage: npx tsx scripts/serve-api.ts <project-slug> [--port 8765]");
  process.exit(2);
}

let port = 8765;
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) port = parseInt(args[++i], 10);
}

// Load diagram
const projDir = path.join(ROOT, "projects", slug);
const diagram = parseDiagram(JSON.parse(readFileSync(path.join(projDir, "diagram.json"), "utf-8")));
const mcus = findMCUs(diagram);
const target = mcus.find(m => m.simulatable);
const board = target?.boardId ?? "uno";

// Compile
const hex = compileSketch(slug, board);
console.log("Compilation successful.\n");

// Create AVR runner and wire components
const runner = new AVRRunner(hex);
const wired = wireComponents(runner, diagram);

// Capture serial output
let serialBuffer = "";
let serialLines: string[] = [];
runner.usart.onByteTransmit = (byte: number) => {
  const ch = String.fromCharCode(byte);
  serialBuffer += ch;
  if (ch === "\n") {
    const line = serialBuffer.trimEnd();
    serialLines.push(line);
    // Keep last 100 lines
    if (serialLines.length > 100) serialLines.shift();
    // Broadcast to all connected clients
    broadcast({ type: "serial", data: line });
    serialBuffer = "";
  }
};

// Track servo angles
const servoAngles = new Map<string, number>();
for (const [id, wc] of wired) {
  if (wc.part.type === "wokwi-servo") {
    servoAngles.set(id, 0);
    const origCb = wc.onAngleChange;
    wc.onAngleChange = (angle: number) => {
      servoAngles.set(id, angle);
      origCb?.(angle);
    };
  }
}

// Build part info for state reports
function getState() {
  const parts: Record<string, Record<string, unknown>> = {};
  for (const [id, wc] of wired) {
    const info: Record<string, unknown> = { type: wc.part.type };
    if (wc.part.type === "wokwi-servo") {
      info.angle = servoAngles.get(id) ?? 0;
    }
    if (wc.part.attrs) {
      if (wc.part.attrs.temperature) info.temperature = parseFloat(wc.part.attrs.temperature);
      if (wc.part.attrs.pressure) info.pressure = parseFloat(wc.part.attrs.pressure);
      if (wc.part.attrs.address) info.address = wc.part.attrs.address;
    }
    parts[id] = info;
  }
  return parts;
}

function handleCommand(msg: any, ws: WebSocket) {
  try {
    if (msg.cmd === "get-state") {
      ws.send(JSON.stringify({
        type: "state",
        parts: getState(),
        serial: serialLines.slice(-20),
        cycles: runner.cpu.cycles,
      }));
    } else if (msg.cmd === "set-control") {
      const { partId, control, value } = msg;
      const wc = wired.get(partId);
      if (!wc) {
        ws.send(JSON.stringify({ type: "error", message: `Part "${partId}" not found` }));
        return;
      }
      if (control === "temperature" && wc.setTemperature) {
        wc.setTemperature(Number(value));
      } else if (control === "pressure" && wc.setPressure) {
        wc.setPressure(Number(value));
      } else if (control === "humidity" && wc.setHumidity) {
        wc.setHumidity(Number(value));
      } else if (control === "pressed" && wc.setPressed) {
        wc.setPressed(!!value);
      } else if (control === "position" && wc.setValue) {
        wc.setValue(Math.round(Number(value) * 1023));
      } else if (control === "rotate-cw" && wc.stepCW) {
        for (let i = 0; i < (Number(value) || 1); i++) { wc.stepCW(); runner.runCycles(40000); }
      } else if (control === "rotate-ccw" && wc.stepCCW) {
        for (let i = 0; i < (Number(value) || 1); i++) { wc.stepCCW(); runner.runCycles(40000); }
      } else {
        ws.send(JSON.stringify({ type: "error", message: `Unknown control "${control}" on "${partId}"` }));
        return;
      }
      ws.send(JSON.stringify({ type: "ok", partId, control, value }));
    } else if (msg.cmd === "send-serial") {
      const data = String(msg.data);
      for (const ch of data) {
        runner.usart.writeByte(ch.charCodeAt(0));
      }
      ws.send(JSON.stringify({ type: "ok", cmd: "send-serial" }));
    } else {
      ws.send(JSON.stringify({ type: "error", message: `Unknown command: ${msg.cmd}` }));
    }
  } catch (err: any) {
    ws.send(JSON.stringify({ type: "error", message: err.message }));
  }
}

// WebSocket server
const clients = new Set<WebSocket>();

function broadcast(msg: object) {
  const json = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(json);
  }
}

const wss = new WebSocketServer({ port });

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`Client connected (${clients.size} total)`);

  // Send ready message with project info
  const partList = Array.from(wired.entries()).map(([id, wc]) => ({
    id,
    type: wc.part.type,
    attrs: wc.part.attrs,
  }));
  ws.send(JSON.stringify({ type: "ready", project: slug, parts: partList }));

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleCommand(msg, ws);
    } catch (err: any) {
      ws.send(JSON.stringify({ type: "error", message: `Invalid JSON: ${err.message}` }));
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`Client disconnected (${clients.size} total)`);
  });
});

console.log(`\x1b[32m⚡ SparkBench API server running\x1b[0m`);
console.log(`   Project:   ${slug}`);
console.log(`   WebSocket: ws://localhost:${port}`);
console.log(`   Parts:     ${wired.size} components wired`);
console.log(`\nWaiting for connections...\n`);

// Run AVR simulation in a loop
// Use synchronous batches with setInterval for the event loop
const SIM_BATCH_MS = 50;  // run 50ms of sim time per batch
const cyclesPerBatch = Math.round((SIM_BATCH_MS / 1000) * runner.speed);

setInterval(() => {
  runner.runCycles(cyclesPerBatch);
}, 10);  // every 10ms wall-clock, run 50ms of sim time (5x speedup)

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  cleanupWiring(wired);
  runner.stop();
  wss.close();
  process.exit(0);
});
