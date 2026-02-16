import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import path from "path";
import os from "os";

const PIO_CMD = path.join(os.homedir(), ".platformio/penv/bin/platformio");
const BUILD_DIR = path.join(process.cwd(), "_build");

// Map header files to PlatformIO library names/specs for auto-detection
const HEADER_TO_LIB: Record<string, string> = {
  // Arduino Core / Standard
  "ArduinoJson.h": "bblanchon/ArduinoJson",
  "EEPROM.h": "",  // built-in
  "FixedPoints.h": "Pharap/FixedPoints",
  "Geometry.h": "tomstewart89/Geometry",
  "Key.h": "",  // part of Keypad
  "Keypad.h": "chris--a/Keypad",
  "PID_v1.h": "br3ttb/Arduino-PID-Library",
  "SPI.h": "",  // built-in
  "SD.h": "arduino-libraries/SD",
  "SdFat.h": "greiman/SdFat",
  "SoftwareSerial.h": "",  // built-in
  "Stepper.h": "",  // built-in
  "TimeLib.h": "paulstoffregen/Time",
  "TimerOne.h": "paulstoffregen/TimerOne",
  "Ultrasonic.h": "ericsimon/Ultrasonic",
  "Wire.h": "",  // built-in

  // Adafruit
  "Adafruit_GFX.h": "adafruit/Adafruit GFX Library",
  "Adafruit_ILI9341.h": "adafruit/Adafruit ILI9341",
  "Adafruit_INA219.h": "adafruit/Adafruit INA219",
  "Adafruit_LEDBackpack.h": "adafruit/Adafruit LED Backpack Library",
  "Adafruit_MPU6050.h": "adafruit/Adafruit MPU6050",
  "Adafruit_NeoMatrix.h": "adafruit/Adafruit NeoMatrix",
  "Adafruit_NeoPixel.h": "adafruit/Adafruit NeoPixel",
  "Adafruit_SSD1306.h": "adafruit/Adafruit SSD1306",
  "Adafruit_Sensor.h": "adafruit/Adafruit Unified Sensor",
  "Adafruit_SoftServo.h": "adafruit/Adafruit SoftServo",
  "Adafruit_ST7735.h": "adafruit/Adafruit ST7735 and ST7789 Library",
  "Adafruit_ST7789.h": "adafruit/Adafruit ST7735 and ST7789 Library",

  // Displays / Graphics
  "lcdgfx.h": "lexus2k/lcdgfx",
  "LiquidCrystal.h": "arduino-libraries/LiquidCrystal",
  "LiquidCrystal_I2C.h": "marcoschwartz/LiquidCrystal_I2C",
  "MD_MAX72xx.h": "majicdesigns/MD_MAX72XX",
  "MD_Parola.h": "majicdesigns/MD_Parola",
  "Segment.h": "pedrogoliveira/Segment",
  "SevSeg.h": "DeanIsMe/SevSeg",
  "ShiftDisplay.h": "MiguelPynto/ShiftDisplay",
  "SSD1306Ascii.h": "greiman/SSD1306Ascii",
  "SSD1306AsciiWire.h": "greiman/SSD1306Ascii",
  "ssd1306.h": "lexus2k/ssd1306",
  "SSD1306init.h": "greiman/SSD1306Ascii",
  "TM1637TinyDisplay.h": "jasonacox/TM1637TinyDisplay",
  "Tiny4kOLED.h": "datacute/Tiny4kOLED",
  "U8g2lib.h": "olikraus/U8g2",
  "U8glib.h": "olikraus/U8glib",
  "U8x8lib.h": "olikraus/U8g2",

  // LEDs
  "FastLED.h": "fastled/FastLED",
  "FastLED_NeoMatrix.h": "marcmerlin/FastLED NeoMatrix",
  "LedControl.h": "wayoda/LedControl",
  "blinker.h": "blinker",

  // Sensors
  "AccelStepper.h": "waspinator/AccelStepper",
  "basicMPU6050.h": "RCmags/basicMPU6050",
  "DallasTemperature.h": "milesburton/DallasTemperature",
  "DHT.h": "adafruit/DHT sensor library",
  "dht.h": "adafruit/DHT sensor library",
  "DHT_U.h": "adafruit/DHT sensor library",
  "DHTesp.h": "beegee-tokyo/DHTesp",
  "DS3231.h": "andrew-henry/DS3231",
  "I2Cdev.h": "jrowberg/I2Cdevlib-Core",
  "MPU6050.h": "electroniccats/MPU6050",
  "OneWire.h": "paulstoffregen/OneWire",
  "SimpleDHT.h": "winlinvip/SimpleDHT",

  // Input / Control
  "Bounce2.h": "thomasfredericks/Bounce2",
  "Button.h": "madleech/Button",
  "Encoder.h": "paulstoffregen/Encoder",
  "mechButton.h": "jim-lee/mechButton",
  "OneButton.h": "mathertel/OneButton",
  "Servo.h": "arduino-libraries/Servo",
  "ServoEasing.h": "arminjo/ServoEasing",
  "VarSpeedServo.h": "netlabtoolkit/VarSpeedServo",

  // Timing / Scheduling / Utilities
  "TaskScheduler.h": "arkhipenko/TaskScheduler",
  "SimpleTimer.h": "kiryanenko/SimpleTimer",
  "runningAvg.h": "robtillaart/RunningAverage",
  "TinyDebug.h": "jdolinay/avr-debugger",
  "TinyWireM.h": "adafruit/TinyWireM",
  "timeObj.h": "jim-lee/LC_baseTools",

  // Audio / Misc
  "Talkie.h": "going-digital/Talkie",
  "pitches.h": "",  // local file
  "PlayRtttl.h": "arminjo/PlayRtttl",
  "Midier.h": "razhaleva/Midier",
  "qrcode.h": "ricmoo/QRCode",
  "pt.h": "benhoyt/protothreads",
  "protothreads.h": "benhoyt/protothreads",

  // Networking / Platform
  "WiFiNINA.h": "arduino-libraries/WiFiNINA",
  "RTClib.h": "adafruit/RTClib",
  "idlers.h": "jim-lee/LC_baseTools",
  "IRremote.h": "Arduino-IRremote/Arduino-IRremote",
  "IRremoteInt.h": "Arduino-IRremote/Arduino-IRremote",
};

/** Extract #include headers from source code and return PlatformIO lib deps. */
function detectLibsFromSource(source: string): string[] {
  const includes = source.matchAll(/#include\s*[<"]([^>"]+)[>"]/g);
  const libs = new Set<string>();
  for (const m of includes) {
    const header = m[1];
    const lib = HEADER_TO_LIB[header];
    if (lib) libs.add(lib);
  }
  return Array.from(libs);
}

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
    const librariesTxt: string = data.librariesTxt || "";

    // Parse libraries.txt into library names
    const extraLibs = librariesTxt
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l && !l.startsWith("#"));

    // Auto-detect libraries from #include directives in sketch + extra files
    const allSources = [data.sketch || "", ...files.map((f: { content: string }) => f.content || "")].join("\n");
    const detectedLibs = detectLibsFromSource(allSources);

    // Build platformio.ini with library dependencies
    const baseLibDeps = [
      "arduino-libraries/Servo@^1.2.1",
      "adafruit/DHT sensor library@^1.4.6",
      "adafruit/Adafruit Unified Sensor@^1.1.14",
    ];
    // Merge: base + detected from #include + explicit from libraries.txt (deduplicate)
    const seen = new Set(baseLibDeps.map((l) => l.toLowerCase()));
    const allLibDeps = [...baseLibDeps];
    for (const lib of [...detectedLibs, ...extraLibs]) {
      const key = lib.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        allLibDeps.push(lib);
      }
    }
    const libDepsStr = allLibDeps.map((l) => `  ${l}`).join("\n");

    const pioIni = `[env:uno]
platform = atmelavr
board = uno
framework = arduino
lib_deps =
${libDepsStr}

[env:atmega328p]
platform = atmelavr
board = uno
framework = arduino
lib_deps =
${libDepsStr}
`;
    await writeFile(path.join(BUILD_DIR, "platformio.ini"), pioIni);

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
