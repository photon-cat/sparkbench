import { css, html, LitElement, nothing, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ElementPin } from './pin';
import type { ICDefinition, ICPinDefinition } from './schematic/types';

const PIN_PITCH = 2.54;
const STUB_LENGTH = 5.08;
const BUBBLE_RADIUS = 0.6;
const CLOCK_SIZE = 1.2;
const CHAR_WIDTH = 1.1;
const PIN_NAME_FONT = 1.6;
const PIN_NUM_FONT = 1.0;
const CHIP_NAME_FONT = 2.2;

interface Layout {
  bodyWidth: number;
  bodyHeight: number;
  bodyX: number;
  bodyRight: number;
  totalWidth: number;
}

@customElement('wokwi-schematic-ic')
export class SchematicICElement extends LitElement {
  @property({ type: Object })
  definition?: ICDefinition;

  static styles = css`
    text {
      user-select: none;
    }
  `;

  private computeLayout(): Layout | null {
    const def = this.definition;
    if (!def) return null;

    const leftCount = def.pins.left.length;
    const rightCount = def.pins.right.length;
    const maxPins = Math.max(leftCount, rightCount);

    const bodyHeight = (maxPins + 1) * PIN_PITCH;

    const maxLeftLen = leftCount > 0 ? Math.max(...def.pins.left.map((p) => p.name.length)) : 0;
    const maxRightLen =
      rightCount > 0 ? Math.max(...def.pins.right.map((p) => p.name.length)) : 0;

    const bodyWidth = Math.max((maxLeftLen + maxRightLen) * CHAR_WIDTH + 5, 10);

    const hasLeft = leftCount > 0;
    const hasRight = rightCount > 0;
    const bodyX = hasLeft ? STUB_LENGTH : 0;
    const bodyRight = bodyX + bodyWidth;
    const totalWidth = bodyWidth + (hasLeft ? STUB_LENGTH : 0) + (hasRight ? STUB_LENGTH : 0);

    return { bodyWidth, bodyHeight, bodyX, bodyRight, totalWidth };
  }

  get pinInfo(): ElementPin[] {
    const def = this.definition;
    const layout = this.computeLayout();
    if (!def || !layout) return [];

    const { totalWidth } = layout;
    const pins: ElementPin[] = [];

    const allPinDefs = [...def.pins.left, ...def.pins.right];
    const nameCounts = new Map<string, number>();
    for (const p of allPinDefs) {
      nameCounts.set(p.name, (nameCounts.get(p.name) || 0) + 1);
    }
    const nameIndex = new Map<string, number>();

    const resolveName = (pinDef: ICPinDefinition): string => {
      if (nameCounts.get(pinDef.name)! > 1) {
        const idx = (nameIndex.get(pinDef.name) || 0) + 1;
        nameIndex.set(pinDef.name, idx);
        return `${pinDef.name}.${idx}`;
      }
      return pinDef.name;
    };

    def.pins.left.forEach((pinDef, i) => {
      pins.push({
        name: resolveName(pinDef),
        x: 0,
        y: PIN_PITCH + i * PIN_PITCH,
        number: pinDef.number,
        signals: pinDef.signals || [],
        description: pinDef.description,
      });
    });

    def.pins.right.forEach((pinDef, i) => {
      pins.push({
        name: resolveName(pinDef),
        x: totalWidth,
        y: PIN_PITCH + i * PIN_PITCH,
        number: pinDef.number,
        signals: pinDef.signals || [],
        description: pinDef.description,
      });
    });

    return pins;
  }

  update(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('definition')) {
      this.dispatchEvent(new CustomEvent('pininfo-change'));
    }
    super.update(changedProperties);
  }

  private renderLeftPin(pin: ICPinDefinition, index: number, bodyX: number) {
    const y = PIN_PITCH + index * PIN_PITCH;
    const stubEnd = pin.inverted ? bodyX - 2 * BUBBLE_RADIUS : bodyX;
    const nameX = bodyX + (pin.clock ? CLOCK_SIZE + 0.5 : 0.8);

    return svg`
      <line x1="0" y1="${y}" x2="${stubEnd}" y2="${y}"
            stroke="black" stroke-width="0.15" />
      ${pin.inverted
        ? svg`<circle cx="${bodyX - BUBBLE_RADIUS}" cy="${y}"
                      r="${BUBBLE_RADIUS}" fill="#FFFDE7" stroke="black" stroke-width="0.15" />`
        : nothing}
      ${pin.clock
        ? svg`<polygon points="${bodyX},${y - CLOCK_SIZE / 2} ${bodyX + CLOCK_SIZE},${y} ${bodyX},${y + CLOCK_SIZE / 2}"
                       fill="none" stroke="black" stroke-width="0.15" />`
        : nothing}
      <text x="${nameX}" y="${y + PIN_NAME_FONT * 0.35}"
            font-size="${PIN_NAME_FONT}" font-family="monospace" fill="black">
        ${pin.name}
      </text>
      <text x="0.4" y="${y - 0.4}"
            font-size="${PIN_NUM_FONT}" font-family="monospace" fill="#888">
        ${pin.number}
      </text>
    `;
  }

  private renderRightPin(
    pin: ICPinDefinition,
    index: number,
    bodyRight: number,
    totalWidth: number,
  ) {
    const y = PIN_PITCH + index * PIN_PITCH;
    const stubStart = pin.inverted ? bodyRight + 2 * BUBBLE_RADIUS : bodyRight;
    const nameX = bodyRight - (pin.clock ? CLOCK_SIZE + 0.5 : 0.8);

    return svg`
      <line x1="${stubStart}" y1="${y}" x2="${totalWidth}" y2="${y}"
            stroke="black" stroke-width="0.15" />
      ${pin.inverted
        ? svg`<circle cx="${bodyRight + BUBBLE_RADIUS}" cy="${y}"
                      r="${BUBBLE_RADIUS}" fill="#FFFDE7" stroke="black" stroke-width="0.15" />`
        : nothing}
      ${pin.clock
        ? svg`<polygon points="${bodyRight},${y - CLOCK_SIZE / 2} ${bodyRight - CLOCK_SIZE},${y} ${bodyRight},${y + CLOCK_SIZE / 2}"
                       fill="none" stroke="black" stroke-width="0.15" />`
        : nothing}
      <text x="${nameX}" y="${y + PIN_NAME_FONT * 0.35}"
            font-size="${PIN_NAME_FONT}" font-family="monospace" fill="black" text-anchor="end">
        ${pin.name}
      </text>
      <text x="${totalWidth - 0.4}" y="${y - 0.4}"
            font-size="${PIN_NUM_FONT}" font-family="monospace" fill="#888" text-anchor="end">
        ${pin.number}
      </text>
    `;
  }

  render() {
    const def = this.definition;
    const layout = this.computeLayout();
    if (!def || !layout) return html``;

    const { bodyWidth, bodyHeight, bodyX, bodyRight, totalWidth } = layout;
    const rotateChipName = bodyHeight > bodyWidth;
    const cx = bodyX + bodyWidth / 2;
    const cy = bodyHeight / 2;
    const notchR = 1.2;

    return html`
      <svg
        width="${totalWidth}mm"
        height="${bodyHeight}mm"
        viewBox="0 0 ${totalWidth} ${bodyHeight}"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Body with pin-1 notch -->
        <path
          d="M ${bodyX} 0
             H ${cx - notchR}
             A ${notchR} ${notchR} 0 0 0 ${cx + notchR} 0
             H ${bodyRight}
             V ${bodyHeight}
             H ${bodyX}
             Z"
          fill="#FFFDE7"
          stroke="black"
          stroke-width="0.2"
        />

        <!-- Left pins -->
        ${def.pins.left.map((pin, i) => this.renderLeftPin(pin, i, bodyX))}

        <!-- Right pins -->
        ${def.pins.right.map((pin, i) => this.renderRightPin(pin, i, bodyRight, totalWidth))}

        <!-- Chip name -->
        <text
          transform="translate(${cx}, ${cy})${rotateChipName ? ' rotate(-90)' : ''}"
          text-anchor="middle"
          dominant-baseline="central"
          font-size="${CHIP_NAME_FONT}"
          font-family="monospace"
          fill="black"
        >
          ${def.name}
        </text>
      </svg>
    `;
  }
}
