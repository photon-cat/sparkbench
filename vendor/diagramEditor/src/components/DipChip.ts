/**
 * Generic DIP IC chip rendering for components not in @wokwi/elements.
 * Pin positions are grid-aligned (multiples of UNIT_PX = 9.6).
 */

const UNIT = 9.6; // 0.1 inch at 96 DPI — must match UNIT_PX in constants.ts

// DIP-16: 8 pins per side, 0.1in spacing, 0.3in row width
const PIN_COUNT = 8;
const ROW_SPACING = 3 * UNIT; // 28.8px = 0.3in between top and bottom rows
const CHIP_W = (PIN_COUNT - 1) * UNIT; // 67.2px — first pin at x=0, last at x=67.2
const CHIP_H = ROW_SPACING; // 28.8px — top pins at y=0, bottom at y=28.8

interface PinInfo {
  name: string;
  x: number;
  y: number;
  signals: { type: string; signal: string }[];
  number: number;
}

function pinX(i: number): number { return i * UNIT; }

const HC595_PINS: PinInfo[] = [
  { name: "Q1", y: CHIP_H, x: pinX(0), number: 1, signals: [] },
  { name: "Q2", y: CHIP_H, x: pinX(1), number: 2, signals: [] },
  { name: "Q3", y: CHIP_H, x: pinX(2), number: 3, signals: [] },
  { name: "Q4", y: CHIP_H, x: pinX(3), number: 4, signals: [] },
  { name: "Q5", y: CHIP_H, x: pinX(4), number: 5, signals: [] },
  { name: "Q6", y: CHIP_H, x: pinX(5), number: 6, signals: [] },
  { name: "Q7", y: CHIP_H, x: pinX(6), number: 7, signals: [] },
  { name: "GND", y: CHIP_H, x: pinX(7), number: 8, signals: [{ type: "power", signal: "GND" }] },
  { name: "Q7S", y: 0, x: pinX(7), number: 9, signals: [] },
  { name: "MR", y: 0, x: pinX(6), number: 10, signals: [] },
  { name: "SHCP", y: 0, x: pinX(5), number: 11, signals: [] },
  { name: "STCP", y: 0, x: pinX(4), number: 12, signals: [] },
  { name: "OE", y: 0, x: pinX(3), number: 13, signals: [] },
  { name: "DS", y: 0, x: pinX(2), number: 14, signals: [] },
  { name: "Q0", y: 0, x: pinX(1), number: 15, signals: [] },
  { name: "VCC", y: 0, x: pinX(0), number: 16, signals: [{ type: "power", signal: "VCC" }] },
];

const HC165_PINS: PinInfo[] = [
  { name: "PL", y: CHIP_H, x: pinX(0), number: 1, signals: [] },
  { name: "CP", y: CHIP_H, x: pinX(1), number: 2, signals: [] },
  { name: "D4", y: CHIP_H, x: pinX(2), number: 3, signals: [] },
  { name: "D5", y: CHIP_H, x: pinX(3), number: 4, signals: [] },
  { name: "D6", y: CHIP_H, x: pinX(4), number: 5, signals: [] },
  { name: "D7", y: CHIP_H, x: pinX(5), number: 6, signals: [] },
  { name: "Q7_N", y: CHIP_H, x: pinX(6), number: 7, signals: [] },
  { name: "GND", y: CHIP_H, x: pinX(7), number: 8, signals: [{ type: "power", signal: "GND" }] },
  { name: "Q7", y: 0, x: pinX(7), number: 9, signals: [] },
  { name: "DS", y: 0, x: pinX(6), number: 10, signals: [] },
  { name: "D0", y: 0, x: pinX(5), number: 11, signals: [] },
  { name: "D1", y: 0, x: pinX(4), number: 12, signals: [] },
  { name: "D2", y: 0, x: pinX(3), number: 13, signals: [] },
  { name: "D3", y: 0, x: pinX(2), number: 14, signals: [] },
  { name: "CE", y: 0, x: pinX(1), number: 15, signals: [] },
  { name: "VCC", y: 0, x: pinX(0), number: 16, signals: [{ type: "power", signal: "VCC" }] },
];

function renderDip16Svg(label: string, sublabel: string): string {
  const pinStub = 2;
  const pinW = 2.4;
  const bodyPad = 3; // body extends beyond pins horizontally
  const bodyX = -bodyPad;
  const bodyW = CHIP_W + bodyPad * 2;
  const bodyY = pinStub;
  const bodyH = CHIP_H - pinStub * 2;
  const bodyR = 2;

  let svg = `<svg width="${CHIP_W}" height="${CHIP_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;

  // Body
  svg += `<rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="${bodyR}" fill="#3a3d42"/>`;

  // Notch on left side (pin 1 indicator)
  const notchY = CHIP_H / 2;
  svg += `<path d="M ${bodyX} ${notchY - 3} A 3 3 0 0 1 ${bodyX} ${notchY + 3}" fill="#2a2d32"/>`;

  // Orientation dots
  svg += `<circle cx="${bodyX + 6}" cy="${CHIP_H / 2}" r="1.8" fill="#2a2d32"/>`;
  svg += `<circle cx="${bodyX + bodyW - 6}" cy="${CHIP_H / 2}" r="1.8" fill="#2a2d32"/>`;

  // Labels
  svg += `<text x="${CHIP_W / 2}" y="${CHIP_H / 2 - 1}" text-anchor="middle" dominant-baseline="middle" fill="#aaa" font-size="5.5" font-family="monospace" font-weight="600">${label}</text>`;
  svg += `<text x="${CHIP_W / 2}" y="${CHIP_H / 2 + 5}" text-anchor="middle" dominant-baseline="middle" fill="#777" font-size="3.5" font-family="monospace">${sublabel}</text>`;

  // Bottom pins (stubby rectangles)
  for (let i = 0; i < PIN_COUNT; i++) {
    const x = pinX(i);
    svg += `<rect x="${x - pinW / 2}" y="${bodyY + bodyH}" width="${pinW}" height="${pinStub}" fill="#c0c0c0" rx="0.3"/>`;
  }

  // Top pins (stubby rectangles, reversed order for DIP convention)
  for (let i = 0; i < PIN_COUNT; i++) {
    const x = pinX(PIN_COUNT - 1 - i);
    svg += `<rect x="${x - pinW / 2}" y="0" width="${pinW}" height="${pinStub}" fill="#c0c0c0" rx="0.3"/>`;
  }

  svg += `</svg>`;
  return svg;
}

function registerDip16(tagName: string, pins: PinInfo[], label: string, sublabel: string) {
  if (customElements.get(tagName)) return;

  const svgContent = renderDip16Svg(label, sublabel);

  class DipElement extends HTMLElement {
    private _shadow: ShadowRoot;

    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.innerHTML = `<style>:host { display: block; width: ${CHIP_W}px; height: ${CHIP_H}px; overflow: visible; }</style>${svgContent}`;
    }

    get pinInfo(): PinInfo[] {
      return pins;
    }

    get chipWidth(): number {
      return CHIP_W;
    }

    get chipHeight(): number {
      return CHIP_H;
    }
  }

  customElements.define(tagName, DipElement);
}

export function registerDipChips() {
  if (typeof window === "undefined") return;
  registerDip16("wokwi-74hc595", HC595_PINS, "74HC595", "SN65D3N");
  registerDip16("wokwi-74hc165", HC165_PINS, "74HC165", "SN65D3N");
}
