export const UNIT_PX = 9.6; // 0.1 inch in CSS pixels (96 dpi)
export const GRID_UNITS = 2000; // total grid size in 0.1in (-1000 to +1000)
export const GRID_PX = GRID_UNITS * UNIT_PX;
export const ORIGIN_PX = (GRID_UNITS / 2) * UNIT_PX; // content center = unit 0
export const RULER_SIZE = 28;
export const TICK_INTERVAL = 25; // ruler tick every 25 units (2.5 in)
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;

export function snapToGrid(v: number): number {
  return Math.round(v / UNIT_PX) * UNIT_PX;
}
