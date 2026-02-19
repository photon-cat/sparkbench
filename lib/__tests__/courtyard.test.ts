import { describe, it, expect } from "vitest";
import { generateDIP, generateHeader } from "../pcb-footprints";
import { buildKicadPCBTree } from "../kicanvas-factory";
import { DEFAULT_DESIGN_RULES, DEFAULT_STACKUP, type PCBDesign } from "../pcb-types";

type SExpr = (string | number | SExpr)[];

function makeMiniDesign(
  fpType: string,
  pads: ReturnType<typeof generateDIP>["pads"],
  courtyard: { width: number; height: number },
): PCBDesign {
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
    footprints: [
      {
        uuid: "test-fp",
        ref: "U1",
        footprintType: fpType,
        x: 10,
        y: 10,
        rotation: 0,
        layer: "F.Cu",
        pads,
        courtyard,
      },
    ],
    traces: [],
    vias: [],
    zones: [],
  };
}

function findFpRects(tree: SExpr): SExpr[] {
  const results: SExpr[] = [];
  for (const child of tree) {
    if (Array.isArray(child)) {
      if (child[0] === "fp_rect") {
        results.push(child);
      } else {
        results.push(...findFpRects(child as SExpr));
      }
    }
  }
  return results;
}

function getRectBounds(rect: SExpr): { x1: number; y1: number; x2: number; y2: number } {
  let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
  for (const child of rect) {
    if (Array.isArray(child)) {
      if (child[0] === "start") { x1 = child[1] as number; y1 = child[2] as number; }
      else if (child[0] === "end") { x2 = child[1] as number; y2 = child[2] as number; }
    }
  }
  return {
    x1: Math.min(x1, x2),
    y1: Math.min(y1, y2),
    x2: Math.max(x1, x2),
    y2: Math.max(y1, y2),
  };
}

const cases = [
  { name: "DIP-16", gen: () => generateDIP("U1", 16) },
  { name: "DIP-28", gen: () => generateDIP("U1", 28) },
  { name: "Header-1x03", gen: () => generateHeader("U1", 1, 3) },
  { name: "Header-1x06", gen: () => generateHeader("U1", 1, 6) },
  { name: "Header-2x05", gen: () => generateHeader("U1", 2, 5) },
];

describe("courtyard validation", () => {
  for (const { name, gen } of cases) {
    it(`${name}: courtyard encloses all pads`, () => {
      const fpDef = gen();
      if (!fpDef.courtyard) return;

      const design = makeMiniDesign(name, fpDef.pads, fpDef.courtyard);
      const tree = buildKicadPCBTree(design) as SExpr;

      const fpRects = findFpRects(tree);
      const crtYdRects = fpRects.filter((rect) =>
        rect.some(
          (child) =>
            Array.isArray(child) &&
            child[0] === "layer" &&
            (child[1] === "F.CrtYd" || child[1] === "B.CrtYd"),
        ),
      );

      expect(crtYdRects).toHaveLength(1);

      const bounds = getRectBounds(crtYdRects[0]!);

      for (const pad of fpDef.pads) {
        const padLeft = pad.x - pad.width / 2;
        const padRight = pad.x + pad.width / 2;
        const padTop = pad.y - pad.height / 2;
        const padBottom = pad.y + pad.height / 2;

        expect(bounds.x1).toBeLessThanOrEqual(padLeft);
        expect(bounds.x2).toBeGreaterThanOrEqual(padRight);
        expect(bounds.y1).toBeLessThanOrEqual(padTop);
        expect(bounds.y2).toBeGreaterThanOrEqual(padBottom);
      }
    });
  }
});
