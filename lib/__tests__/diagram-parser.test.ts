import { describe, it, expect } from "vitest";
import { parseDiagram, findMCUs, findComponentPins, type Diagram } from "../diagram-parser";

describe("parseDiagram", () => {
  it("normalizes board-* aliases to wokwi-*", () => {
    const raw = {
      parts: [{ type: "board-ssd1306", id: "oled", top: 0, left: 0 }],
      connections: [],
    };
    const diagram = parseDiagram(raw);
    expect(diagram.parts[0].type).toBe("wokwi-ssd1306");
  });

  it("fills in default fields for missing values", () => {
    const diagram = parseDiagram({});
    expect(diagram.version).toBe(1);
    expect(diagram.author).toBe("");
    expect(diagram.editor).toBe("sparkbench");
    expect(diagram.parts).toEqual([]);
    expect(diagram.connections).toEqual([]);
    expect(diagram.labels).toEqual([]);
  });

  it("preserves all supplied fields", () => {
    const raw = {
      version: 2,
      author: "Test",
      editor: "wokwi",
      parts: [
        { type: "wokwi-arduino-uno", id: "uno", top: 10, left: 20, attrs: { color: "red" } },
      ],
      connections: [["uno:13", "led:A", "green", []]],
      serialMonitor: { display: "terminal" },
    };
    const diagram = parseDiagram(raw);
    expect(diagram.version).toBe(2);
    expect(diagram.author).toBe("Test");
    expect(diagram.parts[0].attrs).toEqual({ color: "red" });
    expect(diagram.connections).toHaveLength(1);
    expect(diagram.serialMonitor).toEqual({ display: "terminal" });
  });

  it("adds empty attrs when missing on parts", () => {
    const raw = {
      parts: [{ type: "wokwi-led", id: "led1", top: 0, left: 0 }],
    };
    const diagram = parseDiagram(raw);
    expect(diagram.parts[0].attrs).toEqual({});
  });
});

describe("findMCUs", () => {
  it("detects Arduino Uno", () => {
    const diagram = parseDiagram({
      parts: [{ type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0 }],
    });
    const mcus = findMCUs(diagram);
    expect(mcus).toHaveLength(1);
    expect(mcus[0].type).toBe("wokwi-arduino-uno");
    expect(mcus[0].boardId).toBe("uno");
    expect(mcus[0].simulatable).toBe(true);
  });

  it("detects Arduino Nano", () => {
    const diagram = parseDiagram({
      parts: [{ type: "wokwi-arduino-nano", id: "nano", top: 0, left: 0 }],
    });
    const mcus = findMCUs(diagram);
    expect(mcus).toHaveLength(1);
    expect(mcus[0].label).toBe("Arduino Nano");
  });

  it("detects ATmega328P", () => {
    const diagram = parseDiagram({
      parts: [{ type: "sb-atmega328", id: "u1", top: 0, left: 0 }],
    });
    const mcus = findMCUs(diagram);
    expect(mcus).toHaveLength(1);
    expect(mcus[0].pinStyle).toBe("avr-port");
  });

  it("returns empty for non-MCU parts", () => {
    const diagram = parseDiagram({
      parts: [{ type: "wokwi-led", id: "led1", top: 0, left: 0 }],
    });
    expect(findMCUs(diagram)).toHaveLength(0);
  });

  it("finds multiple MCUs", () => {
    const diagram = parseDiagram({
      parts: [
        { type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0 },
        { type: "wokwi-arduino-mega", id: "mega", top: 0, left: 200 },
      ],
    });
    const mcus = findMCUs(diagram);
    expect(mcus).toHaveLength(2);
    expect(mcus[1].simulatable).toBe(false); // Mega not simulatable
  });
});

describe("findComponentPins", () => {
  it("maps direct MCU-to-component connections", () => {
    const diagram = parseDiagram({
      parts: [
        { type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0 },
        { type: "wokwi-led", id: "led1", top: 0, left: 100 },
      ],
      connections: [["uno:13", "led1:A", "green", []]],
    });
    const pins = findComponentPins(diagram, "uno");
    expect(pins.get("led1")).toBe("13");
  });

  it("propagates through passive components (resistors)", () => {
    const diagram = parseDiagram({
      parts: [
        { type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0 },
        { type: "wokwi-resistor", id: "r1", top: 0, left: 50 },
        { type: "wokwi-led", id: "led1", top: 0, left: 100 },
      ],
      connections: [
        ["uno:13", "r1:1", "green", []],
        ["r1:2", "led1:A", "green", []],
      ],
    });
    const pins = findComponentPins(diagram, "uno");
    expect(pins.get("r1")).toBe("13");
    expect(pins.get("led1")).toBe("13");
  });

  it("skips power pins (GND, 5V, etc.)", () => {
    const diagram = parseDiagram({
      parts: [
        { type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0 },
        { type: "wokwi-led", id: "led1", top: 0, left: 100 },
      ],
      connections: [["uno:GND.1", "led1:C", "black", []]],
    });
    const pins = findComponentPins(diagram, "uno");
    expect(pins.has("led1")).toBe(false);
  });
});
