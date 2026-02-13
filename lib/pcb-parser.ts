import type {
  PCBDesign,
  PCBFootprint,
} from "./pcb-types";
import { DEFAULT_DESIGN_RULES, DEFAULT_STACKUP, generateUUID } from "./pcb-types";
import type { Diagram } from "./diagram-parser";
import type { Netlist } from "./netlist";
import { getFootprintForType, generateFootprintByType } from "./pcb-footprints";

export function parsePCBDesign(json: unknown): PCBDesign {
  const d = json as PCBDesign;
  return {
    version: 2,
    units: "mm",
    boardOutline: d.boardOutline ?? { vertices: [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }, { x: 0, y: 80 },
    ]},
    stackup: d.stackup ?? { ...DEFAULT_STACKUP },
    designRules: { ...DEFAULT_DESIGN_RULES, ...(d.designRules ?? {}) },
    nets: d.nets ?? [],
    footprints: d.footprints ?? [],
    traces: d.traces ?? [],
    vias: d.vias ?? [],
    zones: d.zones ?? [],
  };
}

/**
 * Create a new PCBDesign from a schematic diagram and its netlist.
 * Places footprints in a grid and assigns net names to pads.
 */
export function initPCBFromSchematic(
  diagram: Diagram,
  netlist: Netlist,
): PCBDesign {
  const footprints: PCBFootprint[] = [];
  const COLS = 4;
  const SPACING_X = 25;
  const SPACING_Y = 20;
  const OFFSET_X = 10;
  const OFFSET_Y = 10;

  // Build net table from netlist
  const nets = netlist.nets.map((n, i) => ({
    number: i + 1,
    name: n.name,
  }));

  let idx = 0;
  for (const part of diagram.parts) {
    if (part.type === "wokwi-arduino-uno") continue;

    // Use per-instance footprint if set, otherwise fall back to registry default
    const instanceFp = part.footprint;
    const mapping = getFootprintForType(part.type);
    const fpDef = instanceFp
      ? generateFootprintByType(part.id, instanceFp)
      : mapping?.generate(part.id);
    const fpType = instanceFp ?? mapping?.footprintType;
    if (!fpDef || !fpType) continue;

    const col = idx % COLS;
    const row = Math.floor(idx / COLS);

    const pads = fpDef.pads.map((pad) => ({
      ...pad,
      net: netlist.pinToNet.get(pad.id),
    }));

    footprints.push({
      uuid: generateUUID(),
      ref: part.id,
      value: part.value ?? part.attrs?.value,
      footprintType: fpType,
      x: OFFSET_X + col * SPACING_X,
      y: OFFSET_Y + row * SPACING_Y,
      rotation: 0,
      layer: "F.Cu",
      pads,
      silkscreen: fpDef.silkLines.length > 0
        ? { layer: "F.SilkS", lines: fpDef.silkLines, text: { x: 0, y: -2, value: part.id, size: 1 } }
        : undefined,
    });
    idx++;
  }

  const boardW = Math.max(100, OFFSET_X * 2 + COLS * SPACING_X);
  const boardH = Math.max(80, OFFSET_Y * 2 + Math.ceil(idx / COLS) * SPACING_Y);

  return {
    version: 2,
    units: "mm",
    boardOutline: {
      vertices: [
        { x: 0, y: 0 },
        { x: boardW, y: 0 },
        { x: boardW, y: boardH },
        { x: 0, y: boardH },
      ],
    },
    stackup: { ...DEFAULT_STACKUP },
    designRules: { ...DEFAULT_DESIGN_RULES },
    nets,
    footprints,
    traces: [],
    vias: [],
    zones: [],
  };
}

export function serializePCB(design: PCBDesign): string {
  return JSON.stringify(design, null, 2);
}
