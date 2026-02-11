import { join } from 'path';

/**
 * @type {import('vite').UserConfig}
 */
const config = {
  base: '',
  resolve: {
    alias: { avr8js: join(__dirname, '../src') },
  },
  server: {
    port: 8001,
    open: true,
  },
};

export default config;
