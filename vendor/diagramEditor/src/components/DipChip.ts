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

// DIP-28: 14 pins per side, 0.1in spacing, 0.3in row width
const PIN_COUNT_28 = 14;
const CHIP_W_28 = (PIN_COUNT_28 - 1) * UNIT;
const CHIP_H_28 = ROW_SPACING;

// ATmega328P pinout (DIP-28)
const ATMEGA328_PINS: PinInfo[] = [
  // Bottom row: pins 1-14 (left to right)
  { name: "PC6",  y: CHIP_H_28, x: pinX(0),  number: 1,  signals: [{ type: "io", signal: "RESET" }] },
  { name: "PD0",  y: CHIP_H_28, x: pinX(1),  number: 2,  signals: [{ type: "io", signal: "RXD" }] },
  { name: "PD1",  y: CHIP_H_28, x: pinX(2),  number: 3,  signals: [{ type: "io", signal: "TXD" }] },
  { name: "PD2",  y: CHIP_H_28, x: pinX(3),  number: 4,  signals: [{ type: "io", signal: "INT0" }] },
  { name: "PD3",  y: CHIP_H_28, x: pinX(4),  number: 5,  signals: [{ type: "io", signal: "INT1" }] },
  { name: "PD4",  y: CHIP_H_28, x: pinX(5),  number: 6,  signals: [{ type: "io", signal: "T0" }] },
  { name: "VCC",  y: CHIP_H_28, x: pinX(6),  number: 7,  signals: [{ type: "power", signal: "VCC" }] },
  { name: "GND",  y: CHIP_H_28, x: pinX(7),  number: 8,  signals: [{ type: "power", signal: "GND" }] },
  { name: "PB6",  y: CHIP_H_28, x: pinX(8),  number: 9,  signals: [{ type: "io", signal: "XTAL1" }] },
  { name: "PB7",  y: CHIP_H_28, x: pinX(9),  number: 10, signals: [{ type: "io", signal: "XTAL2" }] },
  { name: "PD5",  y: CHIP_H_28, x: pinX(10), number: 11, signals: [{ type: "io", signal: "T1" }] },
  { name: "PD6",  y: CHIP_H_28, x: pinX(11), number: 12, signals: [{ type: "io", signal: "AIN0" }] },
  { name: "PD7",  y: CHIP_H_28, x: pinX(12), number: 13, signals: [{ type: "io", signal: "AIN1" }] },
  { name: "PB0",  y: CHIP_H_28, x: pinX(13), number: 14, signals: [{ type: "io", signal: "ICP1" }] },
  // Top row: pins 15-28 (right to left)
  { name: "PB1",  y: 0, x: pinX(13), number: 15, signals: [{ type: "io", signal: "OC1A" }] },
  { name: "PB2",  y: 0, x: pinX(12), number: 16, signals: [{ type: "io", signal: "OC1B" }] },
  { name: "PB3",  y: 0, x: pinX(11), number: 17, signals: [{ type: "io", signal: "MOSI" }] },
  { name: "PB4",  y: 0, x: pinX(10), number: 18, signals: [{ type: "io", signal: "MISO" }] },
  { name: "PB5",  y: 0, x: pinX(9),  number: 19, signals: [{ type: "io", signal: "SCK" }] },
  { name: "AVCC", y: 0, x: pinX(8),  number: 20, signals: [{ type: "power", signal: "VCC" }] },
  { name: "AREF", y: 0, x: pinX(7),  number: 21, signals: [] },
  { name: "GND2", y: 0, x: pinX(6),  number: 22, signals: [{ type: "power", signal: "GND" }] },
  { name: "PC0",  y: 0, x: pinX(5),  number: 23, signals: [{ type: "io", signal: "ADC0" }] },
  { name: "PC1",  y: 0, x: pinX(4),  number: 24, signals: [{ type: "io", signal: "ADC1" }] },
  { name: "PC2",  y: 0, x: pinX(3),  number: 25, signals: [{ type: "io", signal: "ADC2" }] },
  { name: "PC3",  y: 0, x: pinX(2),  number: 26, signals: [{ type: "io", signal: "ADC3" }] },
  { name: "PC4",  y: 0, x: pinX(1),  number: 27, signals: [{ type: "io", signal: "SDA" }] },
  { name: "PC5",  y: 0, x: pinX(0),  number: 28, signals: [{ type: "io", signal: "SCL" }] },
];

function renderDip28Svg(label: string, sublabel: string): string {
  const pinStub = 2;
  const pinW = 2.4;
  const bodyPad = 3;
  const bodyX = -bodyPad;
  const bodyW = CHIP_W_28 + bodyPad * 2;
  const bodyY = pinStub;
  const bodyH = CHIP_H_28 - pinStub * 2;
  const bodyR = 2;

  let svg = `<svg width="${CHIP_W_28}" height="${CHIP_H_28}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;

  // Body
  svg += `<rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="${bodyR}" fill="#3a3d42"/>`;

  // Notch on left side (pin 1 indicator)
  const notchY = CHIP_H_28 / 2;
  svg += `<path d="M ${bodyX} ${notchY - 3} A 3 3 0 0 1 ${bodyX} ${notchY + 3}" fill="#2a2d32"/>`;

  // Orientation dots
  svg += `<circle cx="${bodyX + 6}" cy="${CHIP_H_28 / 2}" r="1.8" fill="#2a2d32"/>`;
  svg += `<circle cx="${bodyX + bodyW - 6}" cy="${CHIP_H_28 / 2}" r="1.8" fill="#2a2d32"/>`;

  // Labels
  svg += `<text x="${CHIP_W_28 / 2}" y="${CHIP_H_28 / 2 - 1}" text-anchor="middle" dominant-baseline="middle" fill="#aaa" font-size="5.5" font-family="monospace" font-weight="600">${label}</text>`;
  svg += `<text x="${CHIP_W_28 / 2}" y="${CHIP_H_28 / 2 + 5}" text-anchor="middle" dominant-baseline="middle" fill="#777" font-size="3.5" font-family="monospace">${sublabel}</text>`;

  // Bottom pins
  for (let i = 0; i < PIN_COUNT_28; i++) {
    const x = pinX(i);
    svg += `<rect x="${x - pinW / 2}" y="${bodyY + bodyH}" width="${pinW}" height="${pinStub}" fill="#c0c0c0" rx="0.3"/>`;
  }

  // Top pins (reversed order for DIP convention)
  for (let i = 0; i < PIN_COUNT_28; i++) {
    const x = pinX(PIN_COUNT_28 - 1 - i);
    svg += `<rect x="${x - pinW / 2}" y="0" width="${pinW}" height="${pinStub}" fill="#c0c0c0" rx="0.3"/>`;
  }

  svg += `</svg>`;
  return svg;
}

function registerDip(tagName: string, pins: PinInfo[], label: string, sublabel: string, chipW: number, chipH: number, pinCount: number, renderFn: (label: string, sublabel: string) => string) {
  if (customElements.get(tagName)) return;

  const svgContent = renderFn(label, sublabel);
  const w = chipW;
  const h = chipH;

  class DipElement extends HTMLElement {
    private _shadow: ShadowRoot;

    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.innerHTML = `<style>:host { display: block; width: ${w}px; height: ${h}px; overflow: visible; line-height: 0; } svg { display: block; }</style>${svgContent}`;
    }

    get pinInfo(): PinInfo[] {
      return pins;
    }

    get chipWidth(): number {
      return w;
    }

    get chipHeight(): number {
      return h;
    }
  }

  customElements.define(tagName, DipElement);
}

function registerDip16(tagName: string, pins: PinInfo[], label: string, sublabel: string) {
  registerDip(tagName, pins, label, sublabel, CHIP_W, CHIP_H, PIN_COUNT, renderDip16Svg);
}

function registerDip28(tagName: string, pins: PinInfo[], label: string, sublabel: string) {
  registerDip(tagName, pins, label, sublabel, CHIP_W_28, CHIP_H_28, PIN_COUNT_28, renderDip28Svg);
}

export function registerDipChips() {
  if (typeof window === "undefined") return;
  registerDip16("wokwi-74hc595", HC595_PINS, "74HC595", "SN65D3N");
  registerDip16("wokwi-74hc165", HC165_PINS, "74HC165", "SN65D3N");
  registerDip28("sb-atmega328", ATMEGA328_PINS, "ATmega328P", "SB-MCU");
}
