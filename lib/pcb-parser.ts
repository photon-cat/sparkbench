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
 * If existingPositions is provided, footprints that already exist in the PCB
 * keep their positions; only new footprints are placed in a grid.
 */
export function initPCBFromSchematic(
  diagram: Diagram,
  netlist: Netlist,
  existingPositions?: Map<string, { x: number; y: number; rotation: number }>,
  boardSize?: { width: number; height: number },
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

  let newIdx = 0; // only incremented for NEW footprints that need grid placement
  let hasArduinoShield = false;
  for (const part of diagram.parts) {
    if (part.type === "wokwi-arduino-uno") hasArduinoShield = true;

    // Use per-instance footprint if set, otherwise fall back to registry default
    const instanceFp = part.footprint;
    const mapping = getFootprintForType(part.type);
    const fpDef = instanceFp
      ? generateFootprintByType(part.id, instanceFp)
      : mapping?.generate(part.id);
    const fpType = instanceFp ?? mapping?.footprintType;
    if (!fpDef || !fpType) continue;

    const pads = fpDef.pads.map((pad) => ({
      ...pad,
      net: netlist.pinToNet.get(pad.id),
    }));

    // Position priority: agent floorplan > existing PCB position > grid fallback
    const existing = existingPositions?.get(part.id);
    let x: number, y: number, rotation: number;
    if (part.pcbX !== undefined && part.pcbY !== undefined) {
      x = part.pcbX;
      y = part.pcbY;
      rotation = part.pcbRotation ?? 0;
    } else if (existing) {
      x = existing.x;
      y = existing.y;
      rotation = existing.rotation;
    } else {
      const col = newIdx % COLS;
      const row = Math.floor(newIdx / COLS);
      x = OFFSET_X + col * SPACING_X;
      y = OFFSET_Y + row * SPACING_Y;
      rotation = 0;
      newIdx++;
    }

    footprints.push({
      uuid: generateUUID(),
      ref: part.id,
      value: part.value ?? part.attrs?.value,
      footprintType: fpType,
      x,
      y,
      rotation,
      layer: "F.Cu",
      pads,
      silkscreen: fpDef.silkLines.length > 0
        ? { layer: "F.SilkS", lines: fpDef.silkLines, text: { x: 0, y: -2, value: part.id, size: 1 } }
        : undefined,
      courtyard: fpDef.courtyard,
    });
  }

  // Board dimensions: explicit boardSize > Arduino shield > auto-size
  const boardW = boardSize?.width
    ?? (hasArduinoShield ? 68.6 : Math.max(100, OFFSET_X * 2 + COLS * SPACING_X));
  const boardH = boardSize?.height
    ?? (hasArduinoShield ? 53.3 : Math.max(80, OFFSET_Y * 2 + Math.ceil(footprints.length / COLS) * SPACING_Y));

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
