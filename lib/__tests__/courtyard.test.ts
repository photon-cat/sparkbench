/**
 * Quick courtyard validation test.
 * Run with: npx tsx lib/__tests__/courtyard.test.ts
 */
import { generateDIP, generateHeader } from "../pcb-footprints";
import { buildKicadPCBTree } from "../kicanvas-factory";
import { DEFAULT_DESIGN_RULES, DEFAULT_STACKUP, type PCBDesign } from "../pcb-types";

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

type SExpr = (string | number | SExpr)[];

/** Recursively find all fp_rect nodes in a tree */
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

/** Extract start/end from fp_rect node */
function getRectBounds(rect: SExpr): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} {
  let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
  for (const child of rect) {
    if (Array.isArray(child)) {
      if (child[0] === "start") {
        x1 = child[1] as number;
        y1 = child[2] as number;
      } else if (child[0] === "end") {
        x2 = child[1] as number;
        y2 = child[2] as number;
      }
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

let allPass = true;

for (const { name, gen } of cases) {
  const fpDef = gen();
  const design = makeMiniDesign(name, fpDef.pads, fpDef.courtyard);
  const tree = buildKicadPCBTree(design) as SExpr;

  // Find fp_rect on CrtYd layer
  const fpRects = findFpRects(tree);
  const crtYdRects = fpRects.filter((rect) =>
    rect.some(
      (child) =>
        Array.isArray(child) &&
        child[0] === "layer" &&
        (child[1] === "F.CrtYd" || child[1] === "B.CrtYd"),
    ),
  );

  if (crtYdRects.length !== 1) {
    console.error(`FAIL ${name}: expected 1 CrtYd rect, got ${crtYdRects.length}`);
    allPass = false;
    continue;
  }

  const bounds = getRectBounds(crtYdRects[0]!);
  let padFail = false;

  for (const pad of fpDef.pads) {
    const padLeft = pad.x - pad.width / 2;
    const padRight = pad.x + pad.width / 2;
    const padTop = pad.y - pad.height / 2;
    const padBottom = pad.y + pad.height / 2;

    if (bounds.x1 > padLeft) {
      console.error(
        `FAIL ${name}: pad ${pad.id} left edge (${padLeft.toFixed(2)}) outside courtyard x1 (${bounds.x1.toFixed(2)})`,
      );
      padFail = true;
    }
    if (bounds.x2 < padRight) {
      console.error(
        `FAIL ${name}: pad ${pad.id} right edge (${padRight.toFixed(2)}) outside courtyard x2 (${bounds.x2.toFixed(2)})`,
      );
      padFail = true;
    }
    if (bounds.y1 > padTop) {
      console.error(
        `FAIL ${name}: pad ${pad.id} top edge (${padTop.toFixed(2)}) outside courtyard y1 (${bounds.y1.toFixed(2)})`,
      );
      padFail = true;
    }
    if (bounds.y2 < padBottom) {
      console.error(
        `FAIL ${name}: pad ${pad.id} bottom edge (${padBottom.toFixed(2)}) outside courtyard y2 (${bounds.y2.toFixed(2)})`,
      );
      padFail = true;
    }
  }

  if (padFail) {
    allPass = false;
    console.error(`  Courtyard bounds: (${bounds.x1.toFixed(2)}, ${bounds.y1.toFixed(2)}) to (${bounds.x2.toFixed(2)}, ${bounds.y2.toFixed(2)})`);
    console.error(`  Pad bbox: x=[${Math.min(...fpDef.pads.map(p => p.x - p.width/2)).toFixed(2)}, ${Math.max(...fpDef.pads.map(p => p.x + p.width/2)).toFixed(2)}] y=[${Math.min(...fpDef.pads.map(p => p.y - p.height/2)).toFixed(2)}, ${Math.max(...fpDef.pads.map(p => p.y + p.height/2)).toFixed(2)}]`);
  } else {
    console.log(`PASS ${name}: courtyard (${bounds.x1.toFixed(2)}, ${bounds.y1.toFixed(2)}) to (${bounds.x2.toFixed(2)}, ${bounds.y2.toFixed(2)})`);
  }
}

if (!allPass) {
  console.error("\nSome tests FAILED!");
  process.exit(1);
} else {
  console.log("\nAll courtyard tests passed!");
}
