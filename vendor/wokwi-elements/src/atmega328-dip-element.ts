import { css, html, LitElement, svg } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ElementPin, analog, GND, i2c, spi, usart, VCC } from './pin';

// DIP-28 dimensions (mm)
const PIN_PITCH = 2.54;
const FIRST_PIN_Y = 2.54;
const TOTAL_WIDTH = 15.24;

@customElement('wokwi-atmega328-dip')
export class ATmega328DipElement extends LitElement {
  readonly pinInfo: ElementPin[] = [
    // Left side: pins 1-14, top to bottom
    { name: 'PC6', x: 0, y: FIRST_PIN_Y + 0 * PIN_PITCH, number: 1, signals: [] },
    { name: 'PD0', x: 0, y: FIRST_PIN_Y + 1 * PIN_PITCH, number: 2, signals: [usart('RX')] },
    { name: 'PD1', x: 0, y: FIRST_PIN_Y + 2 * PIN_PITCH, number: 3, signals: [usart('TX')] },
    { name: 'PD2', x: 0, y: FIRST_PIN_Y + 3 * PIN_PITCH, number: 4, signals: [] },
    {
      name: 'PD3',
      x: 0,
      y: FIRST_PIN_Y + 4 * PIN_PITCH,
      number: 5,
      signals: [{ type: 'pwm' as const }],
    },
    { name: 'PD4', x: 0, y: FIRST_PIN_Y + 5 * PIN_PITCH, number: 6, signals: [] },
    { name: 'VCC', x: 0, y: FIRST_PIN_Y + 6 * PIN_PITCH, number: 7, signals: [VCC()] },
    { name: 'GND.1', x: 0, y: FIRST_PIN_Y + 7 * PIN_PITCH, number: 8, signals: [GND()] },
    { name: 'PB6', x: 0, y: FIRST_PIN_Y + 8 * PIN_PITCH, number: 9, signals: [] },
    { name: 'PB7', x: 0, y: FIRST_PIN_Y + 9 * PIN_PITCH, number: 10, signals: [] },
    {
      name: 'PD5',
      x: 0,
      y: FIRST_PIN_Y + 10 * PIN_PITCH,
      number: 11,
      signals: [{ type: 'pwm' as const }],
    },
    {
      name: 'PD6',
      x: 0,
      y: FIRST_PIN_Y + 11 * PIN_PITCH,
      number: 12,
      signals: [{ type: 'pwm' as const }],
    },
    { name: 'PD7', x: 0, y: FIRST_PIN_Y + 12 * PIN_PITCH, number: 13, signals: [] },
    { name: 'PB0', x: 0, y: FIRST_PIN_Y + 13 * PIN_PITCH, number: 14, signals: [] },
    // Right side: pins 15-28, bottom to top
    {
      name: 'PB1',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 13 * PIN_PITCH,
      number: 15,
      signals: [{ type: 'pwm' as const }],
    },
    {
      name: 'PB2',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 12 * PIN_PITCH,
      number: 16,
      signals: [spi('SS'), { type: 'pwm' as const }],
    },
    {
      name: 'PB3',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 11 * PIN_PITCH,
      number: 17,
      signals: [spi('MOSI'), { type: 'pwm' as const }],
    },
    {
      name: 'PB4',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 10 * PIN_PITCH,
      number: 18,
      signals: [spi('MISO')],
    },
    {
      name: 'PB5',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 9 * PIN_PITCH,
      number: 19,
      signals: [spi('SCK')],
    },
    {
      name: 'AVCC',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 8 * PIN_PITCH,
      number: 20,
      signals: [VCC()],
    },
    {
      name: 'AREF',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 7 * PIN_PITCH,
      number: 21,
      signals: [],
    },
    {
      name: 'GND.2',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 6 * PIN_PITCH,
      number: 22,
      signals: [GND()],
    },
    {
      name: 'PC0',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 5 * PIN_PITCH,
      number: 23,
      signals: [analog(0)],
    },
    {
      name: 'PC1',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 4 * PIN_PITCH,
      number: 24,
      signals: [analog(1)],
    },
    {
      name: 'PC2',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 3 * PIN_PITCH,
      number: 25,
      signals: [analog(2)],
    },
    {
      name: 'PC3',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 2 * PIN_PITCH,
      number: 26,
      signals: [analog(3)],
    },
    {
      name: 'PC4',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 1 * PIN_PITCH,
      number: 27,
      signals: [i2c('SDA'), analog(4)],
    },
    {
      name: 'PC5',
      x: TOTAL_WIDTH,
      y: FIRST_PIN_Y + 0 * PIN_PITCH,
      number: 28,
      signals: [i2c('SCL'), analog(5)],
    },
  ];

  static styles = css`
    text {
      user-select: none;
    }
  `;

  render() {
    const leftLabels = [
      'PC6',
      'PD0',
      'PD1',
      'PD2',
      'PD3',
      'PD4',
      'VCC',
      'GND',
      'PB6',
      'PB7',
      'PD5',
      'PD6',
      'PD7',
      'PB0',
    ];
    const rightLabels = [
      'PB1',
      'PB2',
      'PB3',
      'PB4',
      'PB5',
      'AVCC',
      'AREF',
      'GND',
      'PC0',
      'PC1',
      'PC2',
      'PC3',
      'PC4',
      'PC5',
    ];

    return html`
      <svg
        width="15.24mm"
        height="38.1mm"
        viewBox="0 0 15.24 38.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- IC Body -->
        <rect x="3.81" y="0.5" width="7.62" height="37.1" rx="0.3" ry="0.3" fill="#292c2d" />
        <rect
          x="3.81"
          y="0.5"
          width="7.62"
          height="37.1"
          rx="0.3"
          ry="0.3"
          fill="none"
          stroke="#3a3d3e"
          stroke-width="0.15"
        />

        <!-- Pin 1 notch (semicircle at top center) -->
        <path d="M 6.62 0.5 A 1.0 1.0 0 0 1 8.62 0.5" fill="#1a1a1a" />

        <!-- Pin 1 dot -->
        <circle cx="5.0" cy="3.5" r="0.4" fill="#4a4a4a" />

        <!-- Pin leads - left side (pins 1-14) -->
        ${Array.from({ length: 14 }, (_, i) => {
          const y = FIRST_PIN_Y + i * PIN_PITCH;
          return svg`<rect x="0.3" y="${y - 0.3}" width="3.51" height="0.6" rx="0.05" fill="#9DA8AB" />`;
        })}

        <!-- Pin leads - right side (pins 15-28) -->
        ${Array.from({ length: 14 }, (_, i) => {
          const y = FIRST_PIN_Y + i * PIN_PITCH;
          return svg`<rect x="11.43" y="${y - 0.3}" width="3.51" height="0.6" rx="0.05" fill="#9DA8AB" />`;
        })}

        <!-- Chip label -->
        <text
          transform="translate(7.62, 19.05) rotate(-90)"
          text-anchor="middle"
          font-size="2.0"
          fill="#ccc"
          font-family="monospace"
        >
          ATmega328P
        </text>

        <!-- Pin labels - left side -->
        ${leftLabels.map((label, i) => {
          const y = FIRST_PIN_Y + i * PIN_PITCH;
          return svg`<text x="4.2" y="${y + 0.35}" font-size="0.9" fill="#8a8a8a" font-family="monospace">${label}</text>`;
        })}

        <!-- Pin labels - right side -->
        ${rightLabels.map((label, i) => {
          const y = FIRST_PIN_Y + (13 - i) * PIN_PITCH;
          return svg`<text x="11.04" y="${y + 0.35}" font-size="0.9" fill="#8a8a8a" font-family="monospace" text-anchor="end">${label}</text>`;
        })}
      </svg>
    `;
  }
}
