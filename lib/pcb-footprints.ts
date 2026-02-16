import type { PCBPad, AnyLayerId } from "./pcb-types";

const ALL_CU: AnyLayerId[] = ["F.Cu", "B.Cu"];
const SMD_TOP: AnyLayerId[] = ["F.Cu"];

export interface FootprintDef {
  pads: PCBPad[];
  courtyard?: { width: number; height: number };
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

/**
 * Arduino Uno R2 Shield footprint — 4 header strips matching the Uno's
 * pin layout, positioned so the board sits on top of the Arduino as a hat.
 *
 * Pad coordinates taken from the official Arduino_UNO_R2.kicad_mod footprint.
 * Origin is at pad 1 (pin D0). All pads are 1.6mm diameter, 1.0mm drill, through-hole.
 *
 * 30 pads total:
 *   Top (y=0):    Pads 1-8 (D0-D7), Pads 9-14 (D8-D13)
 *   Bottom (y=48.26): Pads 15-22 (A0-A5, GND.1, AREF), Pads 23-30 (Power)
 *
 * Pin names match wokwi-arduino-uno naming: 0-13, A0-A5, 5V, 3.3V,
 * GND.1, GND.2, GND.3, VIN, RESET, IOREF, AREF
 */
export function generateArduinoUnoShield(ref: string): FootprintDef {
  const pads: PCBPad[] = [];
  const drillDia = 1.0;
  const padDia = 1.6;

  function addPin(id: string, x: number, y: number, shape: "circle" | "rect" = "circle") {
    pads.push({
      id: `${ref}:${id}`,
      shape,
      x, y,
      width: padDia, height: padDia,
      drill: drillDia,
      layers: ALL_CU,
    });
  }

  // === Top row (y=0) — Digital headers ===
  // Pads 1-8: D0-D7 (2.54mm pitch, x=0 to 17.78)
  addPin("0",  0,     0, "rect"); // Pad 1 — rect marks pin 1
  addPin("1",  2.54,  0);
  addPin("2",  5.08,  0);
  addPin("3",  7.62,  0);
  addPin("4",  10.16, 0);
  addPin("5",  12.7,  0);
  addPin("6",  15.24, 0);
  addPin("7",  17.78, 0);

  // Pads 9-14: D8-D13 (gap then 2.54mm pitch, x=22.86 to 35.56)
  addPin("8",  22.86, 0);
  addPin("9",  25.4,  0);
  addPin("10", 27.94, 0);
  addPin("11", 30.48, 0);
  addPin("12", 33.02, 0);
  addPin("13", 35.56, 0);

  // === Bottom row (y=48.26) — Analog + Power headers ===
  // Pads 15-22: Analog header (right to left, x=35.56 to 17.78)
  addPin("A0",    35.56, 48.26);
  addPin("A1",    33.02, 48.26);
  addPin("A2",    30.48, 48.26);
  addPin("A3",    27.94, 48.26);
  addPin("A4",    25.4,  48.26);
  addPin("A5",    22.86, 48.26);
  addPin("GND.1", 20.32, 48.26);
  addPin("AREF",  17.78, 48.26);

  // Pads 23-30: Power header (right to left, x=13.72 to -4.06)
  addPin("VIN",   13.72, 48.26);
  addPin("GND.2", 11.18, 48.26);
  addPin("GND.3", 8.64,  48.26);
  addPin("5V",    6.1,   48.26);
  addPin("3.3V",  3.56,  48.26);
  addPin("RESET", 1.02,  48.26);
  addPin("IOREF", -1.52, 48.26);
  addPin("NC",    -4.06, 48.26);

  // Silkscreen outline from Arduino_UNO_R2.kicad_mod (F.SilkS layer)
  // Shows characteristic Arduino board shape with USB/barrel jack notches and angled corners
  const silkLines = [
    // Left notch (barrel jack area)
    { x1: -34.42, y1: 29.72, x2: -34.42, y2: 41.4 },
    { x1: -34.42, y1: 41.4,  x2: -28.07, y2: 41.4 },
    // Upper-left notch (USB area)
    { x1: -29.97, y1: 0.51,  x2: -29.97, y2: 9.65 },
    { x1: -29.97, y1: 9.65,  x2: -28.07, y2: 9.65 },
    // Left edge segments
    { x1: -28.07, y1: -2.67, x2: -28.07, y2: 0.51 },
    { x1: -28.07, y1: 0.51,  x2: -29.97, y2: 0.51 },
    { x1: -28.07, y1: 9.65,  x2: -28.07, y2: 29.72 },
    { x1: -28.07, y1: 29.72, x2: -34.42, y2: 29.72 },
    { x1: -28.07, y1: 41.4,  x2: -28.07, y2: 50.93 },
    // Bottom edge
    { x1: -28.07, y1: 50.93, x2: 36.58,  y2: 50.93 },
    // Bottom-right angled corner
    { x1: 36.58,  y1: 50.93, x2: 38.23,  y2: 49.28 },
    // Top edge
    { x1: 38.23,  y1: -2.67, x2: -28.07, y2: -2.67 },
    // Top-right corner
    { x1: 38.23,  y1: 0,     x2: 38.23,  y2: -2.67 },
    // Right edge with angled corners
    { x1: 38.23,  y1: 37.85, x2: 40.77,  y2: 35.31 },
    { x1: 38.23,  y1: 49.28, x2: 38.23,  y2: 37.85 },
    { x1: 40.77,  y1: 2.54,  x2: 38.23,  y2: 0 },
    { x1: 40.77,  y1: 35.31, x2: 40.77,  y2: 2.54 },
  ];

  return {
    pads,
    // No courtyard — the shield interior is open for placing components.
    // Only the header pads themselves block placement (via pad clearance).
    courtyard: undefined,
    silkLines,
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
  {
    type: "sb-atmega328",
    footprintType: "DIP-28",
    generate: (ref) => generateDIP(ref, 28),
  },
  {
    type: "wokwi-arduino-uno",
    footprintType: "Arduino-Uno-Shield",
    generate: (ref) => generateArduinoUnoShield(ref),
  },
];

/** Complete footprint library — every entry here can be selected from any part's dropdown. */
export const FOOTPRINT_LIBRARY: { label: string; value: string; group: string }[] = [
  // DIP through-hole ICs
  { label: "DIP-8", value: "DIP-8", group: "DIP" },
  { label: "DIP-14", value: "DIP-14", group: "DIP" },
  { label: "DIP-16", value: "DIP-16", group: "DIP" },
  { label: "DIP-18", value: "DIP-18", group: "DIP" },
  { label: "DIP-20", value: "DIP-20", group: "DIP" },
  { label: "DIP-28", value: "DIP-28", group: "DIP" },
  { label: "DIP-28 wide", value: "DIP-28W", group: "DIP" },
  { label: "DIP-40", value: "DIP-40", group: "DIP" },
  // SOIC SMD ICs
  { label: "SOIC-8", value: "SOIC-8", group: "SOIC" },
  { label: "SOIC-14", value: "SOIC-14", group: "SOIC" },
  { label: "SOIC-16", value: "SOIC-16", group: "SOIC" },
  { label: "SOIC-20", value: "SOIC-20", group: "SOIC" },
  { label: "SOIC-28", value: "SOIC-28", group: "SOIC" },
  // THT passives
  { label: "Axial THT (0.4in)", value: "Axial-0.4in", group: "THT" },
  { label: "Axial THT (0.3in)", value: "Axial-0.3in", group: "THT" },
  { label: "Radial THT (5mm)", value: "Radial-5mm", group: "THT" },
  { label: "Radial THT (2.5mm)", value: "Radial-2.5mm", group: "THT" },
  // SMD passives
  { label: "0402 SMD", value: "0402", group: "SMD" },
  { label: "0603 SMD", value: "0603", group: "SMD" },
  { label: "0805 SMD", value: "0805", group: "SMD" },
  { label: "1206 SMD", value: "1206", group: "SMD" },
  // LEDs
  { label: "LED THT 3mm", value: "LED-THT-3mm", group: "LED" },
  { label: "LED THT 5mm", value: "LED-THT-5mm", group: "LED" },
  // Pin headers
  { label: "Header 1x02", value: "Header-1x02", group: "Header" },
  { label: "Header 1x03", value: "Header-1x03", group: "Header" },
  { label: "Header 1x04", value: "Header-1x04", group: "Header" },
  { label: "Header 1x05", value: "Header-1x05", group: "Header" },
  { label: "Header 1x06", value: "Header-1x06", group: "Header" },
  { label: "Header 1x08", value: "Header-1x08", group: "Header" },
  { label: "Header 1x10", value: "Header-1x10", group: "Header" },
  { label: "Header 2x03", value: "Header-2x03", group: "Header" },
  { label: "Header 2x04", value: "Header-2x04", group: "Header" },
  { label: "Header 2x05", value: "Header-2x05", group: "Header" },
  { label: "Header 2x08", value: "Header-2x08", group: "Header" },
  { label: "Header 2x10", value: "Header-2x10", group: "Header" },
  // Switches
  { label: "Switch 6mm THT", value: "SW-THT-6mm", group: "Switch" },
  { label: "Switch SPDT THT", value: "SW-SPDT-THT", group: "Switch" },
  // Misc
  { label: "Buzzer 12mm", value: "Buzzer-12mm", group: "Misc" },
  // Arduino
  { label: "Arduino Uno Shield", value: "Arduino-Uno-Shield", group: "Arduino" },
];

/** Available footprint options per part type (for UI dropdown — shown first, before generic library). */
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
  "sb-atmega328": [
    { label: "DIP-28 THT", value: "DIP-28" },
    { label: "DIP-28 wide", value: "DIP-28W" },
  ],
  "wokwi-arduino-uno": [
    { label: "Arduino Uno Shield", value: "Arduino-Uno-Shield" },
  ],
};

/** Map footprint type string → generator function */
const FOOTPRINT_GENERATORS: Record<string, (ref: string) => FootprintDef> = {
  // THT passives
  "Axial-0.4in": (ref) => generateHeader(ref, 1, 2, 10.16),
  "Axial-0.3in": (ref) => generateHeader(ref, 1, 2, 7.62),
  "Radial-5mm": (ref) => generateHeader(ref, 1, 2, 5.0),
  "Radial-2.5mm": (ref) => generateHeader(ref, 1, 2, 2.5),
  // SMD passives
  "0402": (ref) => generateChipPassive(ref, "0402"),
  "0603": (ref) => generateChipPassive(ref, "0603"),
  "0805": (ref) => generateChipPassive(ref, "0805"),
  "1206": (ref) => generateChipPassive(ref, "1206"),
  // LEDs
  "LED-THT-3mm": (ref) => generateHeader(ref, 1, 2, 2.54),
  "LED-THT-5mm": (ref) => generateHeader(ref, 1, 2, 2.54),
  // DIP ICs
  "DIP-8": (ref) => generateDIP(ref, 8),
  "DIP-14": (ref) => generateDIP(ref, 14),
  "DIP-16": (ref) => generateDIP(ref, 16),
  "DIP-18": (ref) => generateDIP(ref, 18),
  "DIP-20": (ref) => generateDIP(ref, 20),
  "DIP-28": (ref) => generateDIP(ref, 28),
  "DIP-28W": (ref) => generateDIP(ref, 28, 2.54, 15.24),
  "DIP-40": (ref) => generateDIP(ref, 40),
  // SOIC ICs
  "SOIC-8": (ref) => generateSOIC(ref, 8),
  "SOIC-14": (ref) => generateSOIC(ref, 14),
  "SOIC-16": (ref) => generateSOIC(ref, 16),
  "SOIC-20": (ref) => generateSOIC(ref, 20),
  "SOIC-28": (ref) => generateSOIC(ref, 28),
  // Pin headers
  "Header-1x02": (ref) => generateHeader(ref, 1, 2),
  "Header-1x03": (ref) => generateHeader(ref, 1, 3),
  "Header-1x3": (ref) => generateHeader(ref, 1, 3),
  "Header-1x04": (ref) => generateHeader(ref, 1, 4),
  "Header-1x05": (ref) => generateHeader(ref, 1, 5),
  "Header-1x06": (ref) => generateHeader(ref, 1, 6),
  "Header-1x08": (ref) => generateHeader(ref, 1, 8),
  "Header-1x10": (ref) => generateHeader(ref, 1, 10),
  "Header-2x03": (ref) => generateHeader(ref, 2, 3),
  "Header-2x04": (ref) => generateHeader(ref, 2, 4),
  "Header-2x05": (ref) => generateHeader(ref, 2, 5),
  "Header-2x08": (ref) => generateHeader(ref, 2, 8),
  "Header-2x10": (ref) => generateHeader(ref, 2, 10),
  // Switches
  "SW-THT-6mm": (ref) => generateHeader(ref, 2, 2, 6.5),
  "SW-SPDT-THT": (ref) => generateHeader(ref, 1, 3, 2.54),
  // Misc
  "Buzzer-12mm": (ref) => generateHeader(ref, 1, 2, 7.6),
  // Arduino
  "Arduino-Uno-Shield": (ref) => generateArduinoUnoShield(ref),
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
