import type {
  PCBDesign,
  PCBFootprint,
} from "./pcb-types";
import { DEFAULT_DESIGN_RULES, DEFAULT_STACKUP, generateUUID } from "./pcb-types";
import type { Diagram } from "./diagram-parser";
import type { Netlist } from "./netlist";
import { getFootprintForType, generateFootprintByType } from "./pcb-footprints";

/**
 * Wokwi pin name → physical pin number mappings.
 * Used to translate netlist keys (e.g. "sr1:DS") to footprint pad IDs (e.g. "sr1:14").
 * Arduino Uno uses name-based IDs directly so doesn't need mapping.
 */
const WOKWI_PIN_MAP: Record<string, Record<string, string>> = {
  "wokwi-74hc595": {
    "Q1": "1", "Q2": "2", "Q3": "3", "Q4": "4", "Q5": "5", "Q6": "6", "Q7": "7",
    "GND": "8", "Q7S": "9", "MR": "10", "SHCP": "11", "STCP": "12",
    "OE": "13", "DS": "14", "Q0": "15", "VCC": "16",
  },
  "wokwi-74hc165": {
    "SH": "1", "CLK": "2", "E": "3", "D4": "4", "D5": "5", "D6": "6", "D7": "7",
    "GND": "8", "Q7": "9", "DS": "10", "D0": "11", "D1": "12",
    "D2": "13", "D3": "14", "CE": "15", "VCC": "16",
  },
  "wokwi-led": {
    "A": "1", "C": "2",
  },
  "wokwi-resistor": {
    "1": "1", "2": "2",
  },
  "wokwi-pushbutton": {
    "1.l": "1", "2.l": "2", "1.r": "3", "2.r": "4",
  },
  "wokwi-potentiometer": {
    "GND": "1", "SIG": "2", "VCC": "3",
  },
  "wokwi-servo": {
    "GND": "1", "V+": "2", "PWM": "3",
  },
  "wokwi-buzzer": {
    "1": "1", "2": "2",
  },
  "wokwi-slide-switch": {
    "1": "1", "2": "2", "3": "3",
  },
  "wokwi-ssd1306": {
    "GND": "1", "VCC": "2", "DATA": "3", "CLK": "4",
  },
  "wokwi-dht22": {
    "VCC": "1", "SDA": "2", "NC": "3", "GND": "4",
  },
};

/** Convert a Wokwi pin reference (e.g. "sr1:DS") to a footprint pad ID (e.g. "sr1:14") */
function wokwiPinToPadId(partType: string, ref: string, pinName: string): string {
  const map = WOKWI_PIN_MAP[partType];
  if (map && map[pinName]) {
    return `${ref}:${map[pinName]}`;
  }
  // Already numeric or no mapping needed (e.g. Arduino Uno uses name-based IDs)
  return `${ref}:${pinName}`;
}

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
  const MARGIN = 5;

  // Build net table from netlist
  const nets = netlist.nets.map((n, i) => ({
    number: i + 1,
    name: n.name,
  }));

  // Determine board dimensions first so grid placement fits within the board
  const hasArduinoShield = diagram.parts.some(p => p.type === "wokwi-arduino-uno");
  const placeableParts = diagram.parts.filter(p => {
    const instanceFp = p.footprint;
    const mapping = getFootprintForType(p.type);
    return !!(instanceFp ? generateFootprintByType(p.id, instanceFp) : mapping?.generate(p.id));
  });

  // Board size: explicit > Arduino shield > auto-size from part count
  const defaultCols = Math.max(2, Math.ceil(Math.sqrt(placeableParts.length)));
  const defaultSpacingX = 20;
  const defaultSpacingY = 18;
  const boardW = boardSize?.width
    ?? (hasArduinoShield ? 68.6 : Math.max(80, MARGIN * 2 + defaultCols * defaultSpacingX));
  const boardH = boardSize?.height
    ?? (hasArduinoShield ? 53.3 : Math.max(60, MARGIN * 2 + Math.ceil(placeableParts.length / defaultCols) * defaultSpacingY));

  // Compute grid that fits within the board
  const usableW = boardW - MARGIN * 2;
  const usableH = boardH - MARGIN * 2;
  const gridCols = Math.max(2, Math.ceil(Math.sqrt(placeableParts.length)));
  const gridRows = Math.ceil(placeableParts.length / gridCols);
  const spacingX = usableW / Math.max(gridCols, 1);
  const spacingY = usableH / Math.max(gridRows, 1);

  let newIdx = 0; // only incremented for NEW footprints that need grid placement
  for (const part of diagram.parts) {
    // Use per-instance footprint if set, otherwise fall back to registry default
    const instanceFp = part.footprint;
    const mapping = getFootprintForType(part.type);
    const fpDef = instanceFp
      ? generateFootprintByType(part.id, instanceFp)
      : mapping?.generate(part.id);
    const fpType = instanceFp ?? mapping?.footprintType;
    if (!fpDef || !fpType) continue;

    // Build pad-number → net lookup by translating Wokwi pin names to pad numbers
    const padNetLookup = new Map<string, string>();
    for (const [pinRef, netName] of netlist.pinToNet) {
      const colonIdx = pinRef.indexOf(":");
      if (colonIdx === -1) continue;
      const refId = pinRef.substring(0, colonIdx);
      const pinName = pinRef.substring(colonIdx + 1);
      if (refId !== part.id) continue;
      const padId = wokwiPinToPadId(part.type, part.id, pinName);
      padNetLookup.set(padId, netName);
    }

    const pads = fpDef.pads.map((pad) => ({
      ...pad,
      net: padNetLookup.get(pad.id) ?? netlist.pinToNet.get(pad.id),
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
      const col = newIdx % gridCols;
      const row = Math.floor(newIdx / gridCols);
      x = MARGIN + spacingX / 2 + col * spacingX;
      y = MARGIN + spacingY / 2 + row * spacingY;
      rotation = 0;
      newIdx++;
    }

    footprints.push({
      uuid: generateUUID(),
      ref: part.id,
      value: part.value ?? part.attrs?.value ?? part.attrs?.color ?? "",
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
