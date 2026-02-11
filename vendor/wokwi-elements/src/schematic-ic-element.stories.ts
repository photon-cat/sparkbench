import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import './schematic-ic-element';
import './utils/show-pins-element';
import {
  ALL_DEFINITIONS,
  IC_74HC00,
  IC_74HC595,
  IC_ATMEGA328P,
  IC_MPU6050,
} from './schematic/definitions';
import type { ICDefinition } from './schematic/types';

interface SchematicICArgs {
  definition: ICDefinition;
}

const meta = {
  title: 'Schematic IC',
  component: 'wokwi-schematic-ic',
  render: (args) => html`<wokwi-schematic-ic .definition=${args.definition}></wokwi-schematic-ic>`,
} satisfies Meta<SchematicICArgs>;

export default meta;
type Story = StoryObj<SchematicICArgs>;

export const ShiftRegister74HC595: Story = {
  name: '74HC595 Shift Register',
  args: { definition: IC_74HC595 },
};

export const NANDGate74HC00: Story = {
  name: '74HC00 NAND Gate',
  args: { definition: IC_74HC00 },
};

export const MPU6050IMU: Story = {
  name: 'MPU6050 IMU',
  args: { definition: IC_MPU6050 },
};

export const ATmega328P: Story = {
  name: 'ATmega328P',
  args: { definition: IC_ATMEGA328P },
};

export const Catalog: Story = {
  name: 'Catalog',
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start;">
      ${ALL_DEFINITIONS.map(
        (def) => html`<wokwi-schematic-ic .definition=${def}></wokwi-schematic-ic>`,
      )}
    </div>
  `,
};

export const WithShowPins: Story = {
  name: 'With Show Pins',
  render: () => html`
    <wokwi-show-pins>
      <wokwi-schematic-ic .definition=${IC_74HC595}></wokwi-schematic-ic>
    </wokwi-show-pins>
  `,
};
