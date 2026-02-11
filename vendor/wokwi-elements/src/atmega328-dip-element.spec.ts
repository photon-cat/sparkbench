import { describe, it } from 'vitest';
import { ATmega328DipElement } from './atmega328-dip-element';
import { renderToPng, savePng } from './utils/test-utils';

describe('ATmega328DipElement', () => {
  it('should render to svg', async () => {
    const pngData = await renderToPng(new ATmega328DipElement());
    await savePng('wokwi-atmega328-dip', pngData);
  });
});
