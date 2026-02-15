export const UNIT_PX = 9.6; // 0.1 inch in CSS pixels (96 dpi)
export const FINE_UNIT_PX = UNIT_PX / 2; // 0.05 inch (1.27mm) fine grid
export const GRID_UNITS = 2000; // total grid size in 0.1in (-1000 to +1000)
export const GRID_PX = GRID_UNITS * UNIT_PX;
export const ORIGIN_PX = (GRID_UNITS / 2) * UNIT_PX; // content center = unit 0
export const RULER_SIZE = 28;
export const TICK_INTERVAL = 25; // ruler tick every 25 units (2.5 in)
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;

export type SnapMode = "normal" | "fine" | "none";

/** Determine snap mode from modifier keys (Shift = disable, Alt/Ctrl = fine) */
export function getSnapMode(e: { shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey?: boolean }): SnapMode {
  if (e.shiftKey) return "none";
  if (e.altKey || e.ctrlKey) return "fine";
  return "normal";
}

export function snapToGrid(v: number, mode: SnapMode = "normal"): number {
  if (mode === "none") return v;
  const step = mode === "fine" ? FINE_UNIT_PX : UNIT_PX;
  return Math.round(v / step) * step;
}

/** Snap a delta value (for dragging) */
export function snapDelta(d: number, mode: SnapMode = "normal"): number {
  if (mode === "none") return d;
  const step = mode === "fine" ? FINE_UNIT_PX : UNIT_PX;
  return Math.round(d / step) * step;
}
