import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import path from "path";
import os from "os";

const PIO_CMD = path.join(os.homedir(), ".platformio/penv/bin/platformio");
const BUILD_DIR = path.join(process.cwd(), "_build");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Validate slug (prevent path traversal)
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return NextResponse.json(
        { success: false, error: "Invalid project slug" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const board = data.board || "uno";
    const files: { name: string; content: string }[] = data.files || [];

    // Ensure build directories exist
    const srcDir = path.join(BUILD_DIR, "src");
    const includeDir = path.join(BUILD_DIR, "include");
    await mkdir(srcDir, { recursive: true });
    await mkdir(includeDir, { recursive: true });

    // Clean previous build source files
    await rm(srcDir, { recursive: true, force: true });
    await rm(includeDir, { recursive: true, force: true });
    await mkdir(srcDir, { recursive: true });
    await mkdir(includeDir, { recursive: true });

    // Write extra files (headers, etc.)
    for (const f of files) {
      if (!f.name || !f.content) continue;
      const dest = f.name.endsWith(".h")
        ? path.join(includeDir, f.name)
        : path.join(srcDir, f.name);
      await writeFile(dest, f.content);
    }

    // Get main sketch code
    let sketch = data.sketch || "";
    if (!sketch) {
      return NextResponse.json(
        { success: false, error: "No source code provided" },
        { status: 400 }
      );
    }

    // Auto-add Arduino.h for .ino-style sketches compiled as .cpp
    if (
      !sketch.includes('#include <Arduino.h>') &&
      !sketch.includes('#include "Arduino.h"')
    ) {
      sketch = '#include <Arduino.h>\n' + sketch;
    }

    // Write main source
    await writeFile(path.join(srcDir, "main.cpp"), sketch);

    // Compile with PlatformIO
    const result = await new Promise<{
      code: number;
      stdout: string;
      stderr: string;
    }>((resolve) => {
      execFile(
        PIO_CMD,
        ["run", "-e", board],
        { cwd: BUILD_DIR, timeout: 120_000 },
        (error, stdout, stderr) => {
          resolve({
            code: typeof error?.code === "number" ? error.code : error ? 1 : 0,
            stdout: stdout || "",
            stderr: stderr || "",
          });
        }
      );
    });

    if (result.code !== 0) {
      return NextResponse.json({
        success: false,
        error: result.stderr || "Compilation failed",
        stdout: result.stdout,
        stderr: result.stderr,
      });
    }

    // Read hex file
    const hexPath = path.join(BUILD_DIR, ".pio", "build", board, "firmware.hex");
    const hex = await readFile(hexPath, "utf-8");

    return NextResponse.json({
      success: true,
      firmware: "firmware.hex",
      hex,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
