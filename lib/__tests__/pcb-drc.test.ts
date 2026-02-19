import { describe, it, expect } from "vitest";
import { runDRC } from "../pcb-drc";
import type { PCBDesign } from "../pcb-types";
import { DEFAULT_DESIGN_RULES, DEFAULT_STACKUP } from "../pcb-types";

function makeDesign(overrides: Partial<PCBDesign> = {}): PCBDesign {
  return {
    version: 2,
    units: "mm",
    boardOutline: {
      vertices: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 80 },
        { x: 0, y: 80 },
      ],
    },
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

describe("runDRC", () => {
  it("returns empty violations for clean design", () => {
    const violations = runDRC(makeDesign());
    expect(violations).toEqual([]);
  });

  it("detects minimum track width violation", () => {
    const design = makeDesign({
      traces: [
        {
          net: "Net-1",
          layer: "F.Cu",
          width: 0.1, // below default 0.2 minimum
          segments: [
            { uuid: "s1", x1: 10, y1: 10, x2: 20, y2: 10 },
          ],
        },
      ],
    });
    const violations = runDRC(design);
    expect(violations.some((v) => v.type === "min_width")).toBe(true);
  });

  it("detects track-track clearance violation", () => {
    const design = makeDesign({
      traces: [
        {
          net: "Net-1",
          layer: "F.Cu",
          width: 0.25,
          segments: [{ uuid: "s1", x1: 10, y1: 10, x2: 20, y2: 10 }],
        },
        {
          net: "Net-2",
          layer: "F.Cu",
          width: 0.25,
          segments: [{ uuid: "s2", x1: 10, y1: 10.1, x2: 20, y2: 10.1 }], // very close
        },
      ],
    });
    const violations = runDRC(design);
    expect(violations.some((v) => v.type === "clearance")).toBe(true);
  });

  it("ignores clearance between same-net traces", () => {
    const design = makeDesign({
      traces: [
        {
          net: "Net-1",
          layer: "F.Cu",
          width: 0.25,
          segments: [{ uuid: "s1", x1: 10, y1: 10, x2: 20, y2: 10 }],
        },
        {
          net: "Net-1",
          layer: "F.Cu",
          width: 0.25,
          segments: [{ uuid: "s2", x1: 10, y1: 10.1, x2: 20, y2: 10.1 }],
        },
      ],
    });
    const violations = runDRC(design);
    expect(violations.filter((v) => v.type === "clearance")).toHaveLength(0);
  });

  it("ignores clearance between different-layer traces", () => {
    const design = makeDesign({
      traces: [
        {
          net: "Net-1",
          layer: "F.Cu",
          width: 0.25,
          segments: [{ uuid: "s1", x1: 10, y1: 10, x2: 20, y2: 10 }],
        },
        {
          net: "Net-2",
          layer: "B.Cu",
          width: 0.25,
          segments: [{ uuid: "s2", x1: 10, y1: 10.1, x2: 20, y2: 10.1 }],
        },
      ],
    });
    const violations = runDRC(design);
    expect(violations.filter((v) => v.type === "clearance")).toHaveLength(0);
  });

  it("detects unconnected nets", () => {
    const design = makeDesign({
      footprints: [
        {
          uuid: "fp1",
          ref: "R1",
          footprintType: "0805",
          x: 10,
          y: 10,
          rotation: 0,
          layer: "F.Cu",
          pads: [
            { id: "1", shape: "rect", x: -1, y: 0, width: 1, height: 1, layers: ["F.Cu"], net: "VCC" },
            { id: "2", shape: "rect", x: 1, y: 0, width: 1, height: 1, layers: ["F.Cu"], net: "VCC" },
          ],
        },
      ],
    });
    const violations = runDRC(design);
    expect(violations.some((v) => v.type === "unconnected")).toBe(true);
  });
});
