import type { PCBPad, AnyLayerId } from "./pcb-types";

const ALL_CU: AnyLayerId[] = ["F.Cu", "B.Cu"];
const SMD_TOP: AnyLayerId[] = ["F.Cu"];

export interface FootprintDef {
  pads: PCBPad[];
  courtyard: { width: number; height: number };
  silkLines: { x1: number; y1: number; x2: number; y2: number }[];
}

/** DIP (Dual In-line Package) — through-hole */
export function generateDIP(
  ref: string,
  pinCount: number,
  pitch = 2.54,
  rowSpacing = 7.62,
): FootprintDef {
  const padsPerSide = pinCount / 2;
  const pads: PCBPad[] = [];
  const drillDia = 1.0;
  const padDia = 1.6;

  for (let i = 0; i < padsPerSide; i++) {
    // Left column: pins 1..N/2 going down
    pads.push({
      id: `${ref}:${i + 1}`,
      shape: "circle",
      x: 0,
      y: i * pitch,
      width: padDia,
      height: padDia,
      drill: drillDia,
      layers: ALL_CU,
    });
    // Right column: pins N..N/2+1 going up
    pads.push({
      id: `${ref}:${pinCount - i}`,
      shape: "circle",
      x: rowSpacing,
      y: i * pitch,
      width: padDia,
      height: padDia,
      drill: drillDia,
      layers: ALL_CU,
    });
  }

  const totalH = (padsPerSide - 1) * pitch;
  return {
    pads,
    courtyard: { width: rowSpacing + padDia, height: totalH + padDia },
    silkLines: dipSilk(rowSpacing, totalH, padDia),
  };
}

/** SOIC (Small Outline IC) — SMD */
export function generateSOIC(
  ref: string,
  pinCount: number,
  pitch = 1.27,
  padWidth = 0.6,
  padHeight = 1.55,
  rowSpacing = 5.4,
): FootprintDef {
  const padsPerSide = pinCount / 2;
  const pads: PCBPad[] = [];

  for (let i = 0; i < padsPerSide; i++) {
    pads.push({
      id: `${ref}:${i + 1}`,
      shape: "rect",
      x: 0,
      y: i * pitch,
      width: padWidth,
      height: padHeight,
      layers: SMD_TOP,
    });
    pads.push({
      id: `${ref}:${pinCount - i}`,
      shape: "rect",
      x: rowSpacing,
      y: i * pitch,
      width: padWidth,
      height: padHeight,
      layers: SMD_TOP,
    });
  }

  const totalH = (padsPerSide - 1) * pitch;
  return {
    pads,
    courtyard: { width: rowSpacing + padWidth, height: totalH + padHeight },
    silkLines: [],
  };
}

/** Chip passive (0402, 0603, 0805, 1206) — 2-pad SMD */
export function generateChipPassive(
  ref: string,
  size: "0402" | "0603" | "0805" | "1206",
): FootprintDef {
  const specs: Record<string, { padW: number; padH: number; gap: number }> = {
    "0402": { padW: 0.5, padH: 0.5, gap: 0.5 },
    "0603": { padW: 0.8, padH: 0.75, gap: 0.8 },
    "0805": { padW: 1.0, padH: 1.25, gap: 1.0 },
    "1206": { padW: 1.6, padH: 1.8, gap: 1.6 },
  };
  const s = specs[size];
  const pads: PCBPad[] = [
    { id: `${ref}:1`, shape: "rect", x: 0, y: 0, width: s.padW, height: s.padH, layers: SMD_TOP },
    { id: `${ref}:2`, shape: "rect", x: s.gap + s.padW, y: 0, width: s.padW, height: s.padH, layers: SMD_TOP },
  ];
  return {
    pads,
    courtyard: { width: s.gap + 2 * s.padW, height: s.padH },
    silkLines: [],
  };
}

/** Pin header (1xN or 2xN) — through-hole */
export function generateHeader(
  ref: string,
  cols: 1 | 2,
  rows: number,
  pitch = 2.54,
): FootprintDef {
  const pads: PCBPad[] = [];
  const drillDia = 1.0;
  const padDia = 1.7;
  let pinNum = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pads.push({
        id: `${ref}:${pinNum}`,
        shape: "circle",
        x: c * pitch,
        y: r * pitch,
        width: padDia,
        height: padDia,
        drill: drillDia,
        layers: ALL_CU,
      });
      pinNum++;
    }
  }

  return {
    pads,
    courtyard: {
      width: (cols - 1) * pitch + padDia,
      height: (rows - 1) * pitch + padDia,
    },
    silkLines: [],
  };
}

// --- Registry: schematic part type → footprint generator ---

export interface FootprintMapping {
  type: string;
  footprintType: string;
  generate: (ref: string) => FootprintDef;
}

export const FOOTPRINT_REGISTRY: FootprintMapping[] = [
  {
    type: "wokwi-led",
    footprintType: "LED-THT-3mm",
    generate: (ref) => generateHeader(ref, 1, 2, 2.54),
  },
  {
    type: "wokwi-resistor",
    footprintType: "Axial-0.4in",
    generate: (ref) => generateHeader(ref, 1, 2, 10.16),
  },
  {
    type: "wokwi-74hc595",
    footprintType: "DIP-16",
    generate: (ref) => generateDIP(ref, 16),
  },
  {
    type: "wokwi-74hc165",
    footprintType: "DIP-16",
    generate: (ref) => generateDIP(ref, 16),
  },
  {
    type: "wokwi-pushbutton",
    footprintType: "SW-THT-6mm",
    generate: (ref) => generateHeader(ref, 2, 2, 6.5),
  },
  {
    type: "wokwi-buzzer",
    footprintType: "Buzzer-12mm",
    generate: (ref) => generateHeader(ref, 1, 2, 7.6),
  },
  {
    type: "wokwi-servo",
    footprintType: "Header-1x3",
    generate: (ref) => generateHeader(ref, 1, 3),
  },
  {
    type: "wokwi-slide-switch",
    footprintType: "SW-SPDT-THT",
    generate: (ref) => generateHeader(ref, 1, 3, 2.54),
  },
];

/** Available footprint options per part type (for UI dropdown). */
export const FOOTPRINT_OPTIONS: Record<string, { label: string; value: string }[]> = {
  "wokwi-resistor": [
    { label: "Axial THT (0.4in)", value: "Axial-0.4in" },
    { label: "0805 SMD", value: "0805" },
    { label: "0603 SMD", value: "0603" },
    { label: "1206 SMD", value: "1206" },
  ],
  "wokwi-led": [
    { label: "LED THT 3mm", value: "LED-THT-3mm" },
    { label: "LED THT 5mm", value: "LED-THT-5mm" },
    { label: "0805 SMD", value: "0805" },
  ],
  "wokwi-74hc595": [
    { label: "DIP-16 THT", value: "DIP-16" },
    { label: "SOIC-16 SMD", value: "SOIC-16" },
  ],
  "wokwi-74hc165": [
    { label: "DIP-16 THT", value: "DIP-16" },
    { label: "SOIC-16 SMD", value: "SOIC-16" },
  ],
  "wokwi-pushbutton": [
    { label: "6mm THT", value: "SW-THT-6mm" },
  ],
  "wokwi-buzzer": [
    { label: "12mm THT", value: "Buzzer-12mm" },
  ],
  "wokwi-servo": [
    { label: "Header 1x3", value: "Header-1x3" },
  ],
  "wokwi-slide-switch": [
    { label: "SPDT THT", value: "SW-SPDT-THT" },
  ],
};

/** Map footprint type string → generator function */
const FOOTPRINT_GENERATORS: Record<string, (ref: string) => FootprintDef> = {
  "Axial-0.4in": (ref) => generateHeader(ref, 1, 2, 10.16),
  "0805": (ref) => generateChipPassive(ref, "0805"),
  "0603": (ref) => generateChipPassive(ref, "0603"),
  "1206": (ref) => generateChipPassive(ref, "1206"),
  "LED-THT-3mm": (ref) => generateHeader(ref, 1, 2, 2.54),
  "LED-THT-5mm": (ref) => generateHeader(ref, 1, 2, 2.54),
  "DIP-16": (ref) => generateDIP(ref, 16),
  "SOIC-16": (ref) => generateSOIC(ref, 16),
  "SW-THT-6mm": (ref) => generateHeader(ref, 2, 2, 6.5),
  "Buzzer-12mm": (ref) => generateHeader(ref, 1, 2, 7.6),
  "Header-1x3": (ref) => generateHeader(ref, 1, 3),
  "SW-SPDT-THT": (ref) => generateHeader(ref, 1, 3, 2.54),
};

export function getFootprintForType(partType: string): FootprintMapping | undefined {
  return FOOTPRINT_REGISTRY.find((m) => m.type === partType);
}

/** Get the default footprint type string for a part type. */
export function getDefaultFootprint(partType: string): string | undefined {
  return FOOTPRINT_REGISTRY.find((m) => m.type === partType)?.footprintType;
}

/** Generate a footprint by its type string (e.g., "0805", "DIP-16"). */
export function generateFootprintByType(ref: string, footprintType: string): FootprintDef | undefined {
  const gen = FOOTPRINT_GENERATORS[footprintType];
  return gen ? gen(ref) : undefined;
}

// --- Helpers ---

function dipSilk(
  rowSpacing: number,
  totalH: number,
  padDia: number,
): { x1: number; y1: number; x2: number; y2: number }[] {
  const m = 0.5;
  const x0 = padDia / 2 + m;
  const x1 = rowSpacing - padDia / 2 - m;
  const y0 = -m;
  const y1 = totalH + m;
  return [
    { x1: x0, y1: y0, x2: x1, y2: y0 },
    { x1: x1, y1: y0, x2: x1, y2: y1 },
    { x1: x1, y1: y1, x2: x0, y2: y1 },
    { x1: x0, y1: y1, x2: x0, y2: y0 },
  ];
}
