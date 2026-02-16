/**
 * Factory that constructs KiCanvas data model objects (KicadPCB, Footprint,
 * LineSegment, Via, Zone, etc.) from sparkbench's PCBDesign JSON format.
 *
 * KiCanvas constructors expect S-expression parse trees (nested arrays).
 * We build these synthetic arrays from our JSON, then feed them to the
 * existing constructors. This avoids modifying vendored KiCanvas code.
 */

import type {
  PCBDesign,
  PCBFootprint,
  PCBPad,
  PCBTrace,
  PCBTraceSegment,
  PCBVia,
  PCBZone,
  PCBPoint,
  PCBNet,
  CopperLayerId,
} from "./pcb-types";

// KiCanvas classes — these are imported from vendored source
import { KicadPCB } from "@kicanvas/kicad/board";

type SExpr = (string | number | SExpr)[];

/** Map net name → net number. Net 0 = unconnected. */
function buildNetMap(nets: PCBNet[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const n of nets) {
    map.set(n.name, n.number);
  }
  return map;
}

/** KiCad layer ordinals for the layers we care about. */
const LAYER_ORDINALS: Record<string, number> = {
  "F.Cu": 0,
  "B.Cu": 31,
  "B.Adhes": 32,
  "F.Adhes": 33,
  "B.Paste": 34,
  "F.Paste": 35,
  "B.SilkS": 36,
  "F.SilkS": 37,
  "B.Mask": 38,
  "F.Mask": 39,
  "Dwgs.User": 40,
  "Cmts.User": 41,
  "Eco1.User": 42,
  "Eco2.User": 43,
  "Edge.Cuts": 44,
  "Margin": 45,
  "B.CrtYd": 46,
  "F.CrtYd": 47,
  "B.Fab": 48,
  "F.Fab": 49,
};

function layerType(name: string): string {
  if (name.endsWith(".Cu")) return "signal";
  return "user";
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ── Individual S-expression builders ──────────────────────────────

function buildNetExpr(net: PCBNet): SExpr {
  return ["net", net.number, net.name];
}

function buildLayerExprs(): SExpr[] {
  // 2-layer board: F.Cu, B.Cu, plus standard non-copper layers
  const layers: [number, string, string][] = [
    [0, "F.Cu", "signal"],
    [31, "B.Cu", "signal"],
    [36, "B.SilkS", "user"],
    [37, "F.SilkS", "user"],
    [38, "B.Mask", "user"],
    [39, "F.Mask", "user"],
    [40, "Dwgs.User", "user"],
    [41, "Cmts.User", "user"],
    [44, "Edge.Cuts", "user"],
    [46, "B.CrtYd", "user"],
    [47, "F.CrtYd", "user"],
    [48, "B.Fab", "user"],
    [49, "F.Fab", "user"],
  ];
  return layers.map(([ord, name, type]) => [ord, name, type]);
}

function buildAtExpr(x: number, y: number, rotation?: number): SExpr {
  const expr: SExpr = ["at", x, y];
  if (rotation) expr.push(rotation);
  return expr;
}

function buildPadExpr(
  pad: PCBPad,
  netMap: Map<string, number>,
  netName?: string,
): SExpr {
  const padType = pad.drill ? "thru_hole" : "smd";
  const shape = pad.shape === "roundrect" ? "roundrect" : pad.shape;

  const layers: string[] = pad.layers.map((l) => String(l));

  const resolvedNet = netName ?? pad.net;
  const netNum = resolvedNet ? (netMap.get(resolvedNet) ?? 0) : 0;

  const expr: SExpr = [
    "pad",
    pad.id,
    padType,
    shape,
    buildAtExpr(pad.x, pad.y),
    ["size", pad.width, pad.height],
    ["layers", ...layers],
  ];

  if (pad.drill) {
    expr.push(["drill", pad.drill]);
  }

  if (resolvedNet) {
    expr.push(["net", netNum, resolvedNet]);
  }

  if (pad.roundrectRatio !== undefined) {
    expr.push(["roundrect_rratio", pad.roundrectRatio]);
  }

  return expr;
}

function buildFootprintExpr(
  fp: PCBFootprint,
  netMap: Map<string, number>,
): SExpr {
  const hasThruHole = fp.pads.some((p) => p.drill);

  const expr: SExpr = [
    "footprint",
    fp.footprintType,
    ["layer", fp.layer],
    ["uuid", fp.uuid],
    buildAtExpr(fp.x, fp.y, fp.rotation),
    [
      "attr",
      ...(hasThruHole ? ["through_hole"] : ["smd"]),
    ],
  ];

  // Reference text
  expr.push([
    "fp_text",
    "reference",
    fp.ref,
    buildAtExpr(0, -2),
    ["layer", fp.layer === "F.Cu" ? "F.SilkS" : "B.SilkS"],
    [
      "effects",
      ["font", ["size", 1, 1], ["thickness", 0.15]],
    ],
  ]);

  // Value text
  expr.push([
    "fp_text",
    "value",
    fp.value ?? fp.footprintType,
    buildAtExpr(0, 2),
    ["layer", fp.layer === "F.Cu" ? "F.Fab" : "B.Fab"],
    [
      "effects",
      ["font", ["size", 1, 1], ["thickness", 0.15]],
    ],
  ]);

  // Silkscreen lines
  if (fp.silkscreen) {
    for (const line of fp.silkscreen.lines) {
      expr.push([
        "fp_line",
        ["start", line.x1, line.y1],
        ["end", line.x2, line.y2],
        ["layer", fp.silkscreen.layer],
        ["stroke", ["width", 0.12], ["type", "solid"]],
      ]);
    }
  }

  // Courtyard rectangle — computed from pad bounding box.
  // Only emitted when the footprint has a courtyard defined.
  // Footprints like Arduino shields intentionally omit courtyard
  // so other components can be placed inside them.
  if (fp.courtyard && fp.pads.length > 0) {
    const crtYdLayer = fp.layer === "F.Cu" ? "F.CrtYd" : "B.CrtYd";
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pad of fp.pads) {
      const hw = pad.width / 2;
      const hh = pad.height / 2;
      minX = Math.min(minX, pad.x - hw);
      minY = Math.min(minY, pad.y - hh);
      maxX = Math.max(maxX, pad.x + hw);
      maxY = Math.max(maxY, pad.y + hh);
    }
    const margin = 0.25;
    expr.push([
      "fp_rect",
      ["start", round4(minX - margin), round4(minY - margin)],
      ["end", round4(maxX + margin), round4(maxY + margin)],
      ["layer", crtYdLayer],
      ["stroke", ["width", 0.05], ["type", "solid"]],
    ]);
  }

  // Pads
  for (const pad of fp.pads) {
    expr.push(buildPadExpr(pad, netMap, pad.net));
  }

  return expr;
}

function buildSegmentExpr(
  seg: PCBTraceSegment,
  trace: PCBTrace,
  netMap: Map<string, number>,
): SExpr {
  const netNum = netMap.get(trace.net) ?? 0;
  return [
    "segment",
    ["start", seg.x1, seg.y1],
    ["end", seg.x2, seg.y2],
    ["width", trace.width],
    ["layer", trace.layer],
    ["net", netNum],
    ["uuid", seg.uuid],
  ];
}

function buildViaExpr(
  via: PCBVia,
  netMap: Map<string, number>,
): SExpr {
  const netNum = netMap.get(via.net) ?? 0;
  return [
    "via",
    buildAtExpr(via.x, via.y),
    ["size", via.diameter],
    ["drill", via.drill],
    ["layers", ...via.layers],
    ["net", netNum],
    ["uuid", via.uuid],
  ];
}

function buildZoneExpr(
  zone: PCBZone,
  netMap: Map<string, number>,
): SExpr {
  const netNum = netMap.get(zone.net) ?? 0;

  const expr: SExpr = [
    "zone",
    ["net", netNum],
    ["net_name", zone.net],
    ["layer", zone.layer],
    ["uuid", zone.uuid],
    ["hatch", "edge", 0.5],
    ["priority", zone.priority],
    ["connect_pads", ["clearance", zone.fill.thermalGap]],
    ["min_thickness", 0.25],
    [
      "fill",
      "yes",
      ["thermal_gap", zone.fill.thermalGap],
      ["thermal_bridge_width", zone.fill.thermalBridgeWidth],
    ],
    // Zone boundary polygon
    [
      "polygon",
      ["pts", ...zone.boundary.map((p) => ["xy", p.x, p.y])],
    ],
  ];

  // Filled polygons (computed zone fill)
  if (zone.filledPolygons) {
    for (const poly of zone.filledPolygons) {
      expr.push([
        "filled_polygon",
        ["layer", zone.layer],
        ["pts", ...poly.map((p) => ["xy", p.x, p.y])],
      ]);
    }
  }

  return expr;
}

function buildEdgeCutsExprs(outline: {
  vertices: PCBPoint[];
}): SExpr[] {
  const verts = outline.vertices;
  if (verts.length < 2) return [];

  const exprs: SExpr[] = [];
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i]!;
    const b = verts[(i + 1) % verts.length]!;
    exprs.push([
      "gr_line",
      ["start", a.x, a.y],
      ["end", b.x, b.y],
      ["layer", "Edge.Cuts"],
      ["stroke", ["width", 0.05], ["type", "solid"]],
    ]);
  }
  return exprs;
}

// ── Main factory function ────────────────────────────────────────

/**
 * Build a KiCanvas KicadPCB object from a sparkbench PCBDesign JSON.
 *
 * The KicadPCB constructor expects an S-expression parse tree (nested arrays).
 * We build the full tree synthetically, then pass it to the constructor.
 */
/**
 * Build the raw S-expression tree from a PCBDesign.
 * This tree can be serialized to .kicad_pcb text via serializeSExpr().
 */
export function buildKicadPCBTree(design: PCBDesign): SExpr {
  const netMap = buildNetMap(design.nets);

  return [
    "kicad_pcb",
    ["version", 20240108],
    ["generator", "sparkbench"],
    ["generator_version", "1.0"],
    [
      "general",
      ["thickness", design.stackup?.thickness ?? 1.6],
    ],
    ["paper", "A4"],
    // Layers
    ["layers", ...buildLayerExprs()],
    // Setup (minimal)
    [
      "setup",
      ["pad_to_mask_clearance", 0],
      [
        "pcbplotparams",
        ["layerselection", 0x00010fc_ffffffff],
        ["outputformat", 1],
        ["outputdirectory", ""],
      ],
    ],
    // Title block
    [
      "title_block",
      ["title", "Sparkbench PCB Editor Alpha"],
    ],
    // Nets
    ["net", 0, ""],
    ...design.nets.map(buildNetExpr),
    // Board outline (gr_line on Edge.Cuts)
    ...buildEdgeCutsExprs(design.boardOutline),
    // Footprints
    ...design.footprints.map((fp) => buildFootprintExpr(fp, netMap)),
    // Trace segments
    ...design.traces.flatMap((trace) =>
      trace.segments.map((seg) => buildSegmentExpr(seg, trace, netMap)),
    ),
    // Vias
    ...design.vias.map((via) => buildViaExpr(via, netMap)),
    // Zones
    ...design.zones.map((zone) => buildZoneExpr(zone, netMap)),
  ];
}

/**
 * Build a KiCanvas KicadPCB object from a sparkbench PCBDesign JSON.
 */
export function buildKicadPCB(design: PCBDesign): KicadPCB {
  const tree = buildKicadPCBTree(design);
  return new KicadPCB("sparkbench.kicad_pcb", tree);
}

/**
 * Get the net number for a net name in a design.
 */
export function getNetNumber(
  design: PCBDesign,
  netName: string,
): number {
  for (const n of design.nets) {
    if (n.name === netName) return n.number;
  }
  return 0;
}
