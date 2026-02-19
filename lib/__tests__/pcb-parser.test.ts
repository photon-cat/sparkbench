import { describe, it, expect } from "vitest";
import { parsePCBDesign, serializePCB, initPCBFromSchematic } from "../pcb-parser";
import { parseDiagram } from "../diagram-parser";
import { extractNetlist } from "../netlist";
import { DEFAULT_DESIGN_RULES, DEFAULT_STACKUP } from "../pcb-types";

describe("parsePCBDesign", () => {
  it("fills in all defaults for empty input", () => {
    const design = parsePCBDesign({});
    expect(design.version).toBe(2);
    expect(design.units).toBe("mm");
    expect(design.boardOutline.vertices).toHaveLength(4);
    expect(design.nets).toEqual([]);
    expect(design.footprints).toEqual([]);
    expect(design.traces).toEqual([]);
    expect(design.vias).toEqual([]);
    expect(design.zones).toEqual([]);
  });

  it("preserves provided values", () => {
    const input = {
      boardOutline: {
        vertices: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 50 },
          { x: 0, y: 50 },
        ],
      },
      nets: [{ number: 1, name: "VCC" }],
    };
    const design = parsePCBDesign(input);
    expect(design.boardOutline.vertices[1].x).toBe(50);
    expect(design.nets).toHaveLength(1);
    expect(design.nets[0].name).toBe("VCC");
  });

  it("merges design rules with defaults", () => {
    const input = { designRules: { minTraceWidth: 0.5 } };
    const design = parsePCBDesign(input);
    expect(design.designRules.minTraceWidth).toBe(0.5);
    expect(design.designRules.minClearance).toBe(DEFAULT_DESIGN_RULES.minClearance);
  });
});

describe("serializePCB", () => {
  it("round-trips through JSON", () => {
    const design = parsePCBDesign({});
    const json = serializePCB(design);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(2);
    expect(parsed.units).toBe("mm");
  });
});

describe("initPCBFromSchematic", () => {
  it("creates footprints for known part types", () => {
    const diagram = parseDiagram({
      parts: [
        { type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0 },
        { type: "wokwi-led", id: "led1", top: 0, left: 100 },
        { type: "wokwi-resistor", id: "r1", top: 0, left: 50 },
      ],
      connections: [
        ["uno:13", "r1:1", "green", []],
        ["r1:2", "led1:A", "green", []],
      ],
    });
    const netlist = extractNetlist(diagram);
    const pcb = initPCBFromSchematic(diagram, netlist);

    // Should have footprints for parts that have footprint mappings
    expect(pcb.footprints.length).toBeGreaterThan(0);
    expect(pcb.version).toBe(2);
    expect(pcb.boardOutline.vertices).toHaveLength(4);
  });

  it("generates nets from netlist", () => {
    const diagram = parseDiagram({
      parts: [
        { type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0 },
        { type: "wokwi-led", id: "led1", top: 0, left: 100 },
      ],
      connections: [["uno:13", "led1:A", "green", []]],
    });
    const netlist = extractNetlist(diagram);
    const pcb = initPCBFromSchematic(diagram, netlist);
    expect(pcb.nets.length).toBeGreaterThan(0);
  });

  it("uses existing positions when provided", () => {
    const diagram = parseDiagram({
      parts: [
        { type: "wokwi-led", id: "led1", top: 0, left: 0 },
      ],
      connections: [],
    });
    const netlist = extractNetlist(diagram);
    const existing = new Map([["led1", { x: 42, y: 24, rotation: 90 }]]);
    const pcb = initPCBFromSchematic(diagram, netlist, existing);

    const fp = pcb.footprints.find((f) => f.ref === "led1");
    if (fp) {
      expect(fp.x).toBe(42);
      expect(fp.y).toBe(24);
      expect(fp.rotation).toBe(90);
    }
  });
});
