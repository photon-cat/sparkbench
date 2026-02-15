/** All PCB coordinates are in millimeters. */

export type CopperLayerId = "F.Cu" | "B.Cu";
export type SilkLayerId = "F.SilkS" | "B.SilkS";
export type MaskLayerId = "F.Mask" | "B.Mask";
export type MechLayerId = "Edge.Cuts" | "Dwgs.User" | "Cmts.User";
export type AnyLayerId =
  | CopperLayerId
  | SilkLayerId
  | MaskLayerId
  | MechLayerId;

export interface PCBPoint {
  x: number;
  y: number;
}

export interface PCBNet {
  number: number;
  name: string;
}

export interface PCBDesignRules {
  minTraceWidth: number; // mm, default 0.2
  minClearance: number; // mm, default 0.2
  minViaDrill: number; // mm, default 0.3
  minViaAnnular: number; // mm, default 0.25
  defaultTraceWidth: number; // mm, default 0.25
  defaultViaSize: number; // mm outer diameter, default 0.8
  defaultViaDrill: number; // mm, default 0.4
}

export interface PCBBoardOutline {
  vertices: PCBPoint[];
}

export interface PCBPad {
  id: string;
  shape: "circle" | "rect" | "oval" | "roundrect";
  x: number; // mm, relative to footprint origin
  y: number;
  width: number; // mm
  height: number; // mm
  drill?: number; // mm, through-hole only
  layers: AnyLayerId[];
  net?: string; // net name
  roundrectRatio?: number; // 0..1, for roundrect shape
}

export interface PCBFootprint {
  uuid: string;
  ref: string; // matches schematic part.id
  value?: string; // component value (e.g. "10k", "100nF")
  footprintType: string; // e.g. "DIP-16", "0805"
  x: number; // mm, board-space
  y: number;
  rotation: number; // degrees
  layer: CopperLayerId;
  pads: PCBPad[];
  silkscreen?: {
    layer: SilkLayerId;
    lines: { x1: number; y1: number; x2: number; y2: number }[];
    text?: { x: number; y: number; value: string; size: number };
  };
  courtyard?: { width: number; height: number };
}

export interface PCBTraceSegment {
  uuid: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PCBTrace {
  net: string; // net name
  layer: CopperLayerId;
  width: number; // mm
  segments: PCBTraceSegment[];
}

export interface PCBVia {
  uuid: string;
  x: number;
  y: number;
  diameter: number; // mm outer
  drill: number; // mm
  net: string; // net name
  layers: [CopperLayerId, CopperLayerId];
}

export interface PCBZoneFill {
  thermalGap: number; // mm, default 0.5
  thermalBridgeWidth: number; // mm, default 0.5
}

export interface PCBZone {
  uuid: string;
  net: string; // net name
  layer: CopperLayerId;
  priority: number; // higher = fills first
  boundary: PCBPoint[]; // polygon vertices
  fill: PCBZoneFill;
  filledPolygons?: PCBPoint[][]; // computed fill, cached
}

export interface PCBDesign {
  version: 2;
  units: "mm";
  boardOutline: PCBBoardOutline;
  stackup: {
    layers: CopperLayerId[];
    thickness: number; // mm, default 1.6
  };
  designRules: PCBDesignRules;
  nets: PCBNet[];
  footprints: PCBFootprint[];
  traces: PCBTrace[];
  vias: PCBVia[];
  zones: PCBZone[];
}

export const DEFAULT_DESIGN_RULES: PCBDesignRules = {
  minTraceWidth: 0.2,
  minClearance: 0.2,
  minViaDrill: 0.3,
  minViaAnnular: 0.25,
  defaultTraceWidth: 0.25,
  defaultViaSize: 0.8,
  defaultViaDrill: 0.4,
};

export const DEFAULT_STACKUP = {
  layers: ["F.Cu", "B.Cu"] as CopperLayerId[],
  thickness: 1.6,
};

export const LAYER_COLORS: Record<CopperLayerId, string> = {
  "F.Cu": "#c41e1e",
  "B.Cu": "#1e1ec4",
};

export function generateUUID(): string {
  return crypto.randomUUID();
}
