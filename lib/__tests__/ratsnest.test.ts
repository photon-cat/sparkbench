import { describe, it, expect } from "vitest";
import { computeRatsnest } from "../ratsnest";
import type { PCBDesign } from "../pcb-types";
import { DEFAULT_DESIGN_RULES, DEFAULT_STACKUP } from "../pcb-types";

function makeDesign(overrides: Partial<PCBDesign> = {}): PCBDesign {
  return {
    version: 2,
    units: "mm",
    boardOutline: { vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }, { x: 0, y: 80 }] },
    stackup: DEFAULT_STACKUP,
    designRules: DEFAULT_DESIGN_RULES,
    nets: [],
    footprints: [],
    traces: [],
    vias: [],
    zones: [],
    ...overrides,
  };
}

describe("computeRatsnest", () => {
  it("returns empty for design with no nets", () => {
    const lines = computeRatsnest(makeDesign());
    expect(lines).toEqual([]);
  });

  it("returns empty for single-pad nets", () => {
    const design = makeDesign({
      footprints: [
        {
          uuid: "fp1", ref: "R1", footprintType: "0805",
          x: 10, y: 10, rotation: 0, layer: "F.Cu",
          pads: [{ id: "1", shape: "rect", x: 0, y: 0, width: 1, height: 1, layers: ["F.Cu"], net: "VCC" }],
        },
      ],
    });
    const lines = computeRatsnest(design);
    expect(lines).toEqual([]);
  });

  it("returns ratsnest lines for unconnected pads on same net", () => {
    const design = makeDesign({
      footprints: [
        {
          uuid: "fp1", ref: "R1", footprintType: "0805",
          x: 10, y: 10, rotation: 0, layer: "F.Cu",
          pads: [{ id: "R1:1", shape: "rect", x: 0, y: 0, width: 1, height: 1, layers: ["F.Cu"], net: "VCC" }],
        },
        {
          uuid: "fp2", ref: "R2", footprintType: "0805",
          x: 50, y: 10, rotation: 0, layer: "F.Cu",
          pads: [{ id: "R2:1", shape: "rect", x: 0, y: 0, width: 1, height: 1, layers: ["F.Cu"], net: "VCC" }],
        },
      ],
    });
    const lines = computeRatsnest(design);
    expect(lines).toHaveLength(1);
    expect(lines[0].net).toBe("VCC");
  });

  it("returns no lines when pads are connected by traces", () => {
    const design = makeDesign({
      footprints: [
        {
          uuid: "fp1", ref: "R1", footprintType: "0805",
          x: 10, y: 10, rotation: 0, layer: "F.Cu",
          pads: [{ id: "R1:1", shape: "rect", x: 0, y: 0, width: 1, height: 1, layers: ["F.Cu"], net: "VCC" }],
        },
        {
          uuid: "fp2", ref: "R2", footprintType: "0805",
          x: 50, y: 10, rotation: 0, layer: "F.Cu",
          pads: [{ id: "R2:1", shape: "rect", x: 0, y: 0, width: 1, height: 1, layers: ["F.Cu"], net: "VCC" }],
        },
      ],
      traces: [
        {
          net: "VCC", layer: "F.Cu", width: 0.25,
          segments: [{ uuid: "t1", x1: 10, y1: 10, x2: 50, y2: 10 }],
        },
      ],
    });
    const lines = computeRatsnest(design);
    expect(lines).toHaveLength(0);
  });
});
