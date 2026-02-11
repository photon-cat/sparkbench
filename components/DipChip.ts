/**
 * Generic DIP IC chip rendering for components not in @wokwi/elements.
 * Pin positions extracted from the actual Wokwi bundle.
 *
 * Key formula: rs(t) = (1.1 + 2.54 * t) * MM_TO_PX
 * where MM_TO_PX = 3.7795275591 (CSS px per mm at 96 DPI)
 */

const MM = 3.7795275591;

/** Pin x-position for DIP-16, matching Wokwi's coordinate system */
const rs = (t: number) => (1.1 + 2.54 * t) * MM;

/** Pin info compatible with @wokwi/elements ElementPin */
interface PinInfo {
  name: string;
  x: number;
  y: number;
  signals: { type: string; signal: string }[];
  number: number;
}

/**
 * 74HC595 pin layout (horizontal DIP-16):
 * - Bottom row (y=30): pins 1-8, left to right (Q1..GND)
 * - Top row (y=0): pins 9-16, right to left (Q7S..VCC)
 */
const HC595_PINS: PinInfo[] = [
  // Bottom row: pins 1-8 (y=30)
  { name: "Q1", y: 30, x: rs(0), number: 1, signals: [] },
  { name: "Q2", y: 30, x: rs(1), number: 2, signals: [] },
  { name: "Q3", y: 30, x: rs(2), number: 3, signals: [] },
  { name: "Q4", y: 30, x: rs(3), number: 4, signals: [] },
  { name: "Q5", y: 30, x: rs(4), number: 5, signals: [] },
  { name: "Q6", y: 30, x: rs(5), number: 6, signals: [] },
  { name: "Q7", y: 30, x: rs(6), number: 7, signals: [] },
  { name: "GND", y: 30, x: rs(7), number: 8, signals: [{ type: "power", signal: "GND" }] },
  // Top row: pins 9-16 (y=0), right to left
  { name: "Q7S", y: 0, x: rs(7), number: 9, signals: [] },
  { name: "MR", y: 0, x: rs(6), number: 10, signals: [] },
  { name: "SHCP", y: 0, x: rs(5), number: 11, signals: [] },
  { name: "STCP", y: 0, x: rs(4), number: 12, signals: [] },
  { name: "OE", y: 0, x: rs(3), number: 13, signals: [] },
  { name: "DS", y: 0, x: rs(2), number: 14, signals: [] },
  { name: "Q0", y: 0, x: rs(1), number: 15, signals: [] },
  { name: "VCC", y: 0, x: rs(0), number: 16, signals: [{ type: "power", signal: "VCC" }] },
];

// Element dimensions
const CHIP_W = rs(7) + rs(0); // symmetric: last pin + first pin offset
const CHIP_H = 30;

export function registerDipChips() {
  if (typeof window === "undefined") return;

  // Register wokwi-74hc595
  if (!customElements.get("wokwi-74hc595")) {
    class HC595Element extends HTMLElement {
      private _shadow: ShadowRoot;

      constructor() {
        super();
        this._shadow = this.attachShadow({ mode: "open" });
        this._render();
      }

      get pinInfo(): PinInfo[] {
        return HC595_PINS;
      }

      private _render() {
        const w = CHIP_W;
        const h = CHIP_H;
        const bodyPad = 3; // padding from pins to body edge
        const bodyX = rs(0) - bodyPad;
        const bodyW = rs(7) - rs(0) + bodyPad * 2;
        const bodyY = 5;
        const bodyH = h - 10;
        const pinR = 1.5;

        let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;

        // Chip body
        svg += `<rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="2" fill="#333" stroke="#555" stroke-width="0.8"/>`;

        // Notch on left side (pin 1 indicator)
        svg += `<path d="M ${bodyX} ${h / 2 - 3} A 3 3 0 0 1 ${bodyX} ${h / 2 + 3}" fill="#444" stroke="#555" stroke-width="0.5"/>`;

        // Label
        svg += `<text x="${w / 2}" y="${h / 2 - 1}" text-anchor="middle" dominant-baseline="middle" fill="#aaa" font-size="6" font-family="monospace">74HC595</text>`;
        svg += `<text x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle" dominant-baseline="middle" fill="#777" font-size="4" font-family="monospace">S65D3N</text>`;

        // Bottom row pins (1-8)
        for (let i = 0; i < 8; i++) {
          const x = rs(i);
          svg += `<line x1="${x}" y1="${h}" x2="${x}" y2="${bodyY + bodyH}" stroke="#999" stroke-width="1.5"/>`;
          svg += `<circle cx="${x}" cy="${h}" r="${pinR}" fill="#bbb"/>`;
        }

        // Top row pins (9-16)
        for (let i = 0; i < 8; i++) {
          const x = rs(7 - i);
          svg += `<line x1="${x}" y1="0" x2="${x}" y2="${bodyY}" stroke="#999" stroke-width="1.5"/>`;
          svg += `<circle cx="${x}" cy="0" r="${pinR}" fill="#bbb"/>`;
        }

        svg += `</svg>`;

        this._shadow.innerHTML = `<style>:host { display: inline-block; line-height: 0; }</style>${svg}`;
      }
    }

    customElements.define("wokwi-74hc595", HC595Element);
  }
}
