/**
 * Wire renderer for Wokwi diagram.json connections.
 *
 * Spec: https://docs.wokwi.com/diagram-format#wire-placement-mini-language
 *
 * Wire placement mini-language:
 * - "v" + pixels: move vertically
 * - "h" + pixels: move horizontally
 * - "*" splits source-side and target-side instructions
 *
 * Instructions BEFORE "*" are applied outward from the SOURCE pin.
 * Instructions AFTER "*" are applied in REVERSE ORDER outward from the TARGET pin.
 * The two loose ends are then connected with orthogonal (h+v) segments.
 */

import type { DiagramConnection } from "./diagram-parser";

export interface Point {
  x: number;
  y: number;
}

export interface PinPosition {
  x: number;
  y: number;
}

export interface RenderedWire {
  points: Point[];
  color: string;
  fromRef: string;
  toRef: string;
}

export function parseRef(ref: string): { componentId: string; pinName: string } {
  const i = ref.indexOf(":");
  if (i === -1) return { componentId: ref, pinName: "" };
  return { componentId: ref.substring(0, i), pinName: ref.substring(i + 1) };
}

interface Segment {
  axis: "h" | "v";
  value: number;
}

function parseSegments(arr: string[]): Segment[] {
  const segs: Segment[] = [];
  for (const s of arr) {
    const ch = s.charAt(0);
    if (ch !== "h" && ch !== "v") continue;
    const v = parseFloat(s.substring(1));
    if (isNaN(v)) continue;
    segs.push({ axis: ch, value: v });
  }
  return segs;
}

/** Trace a path from an origin following a list of h/v segments. */
function trace(origin: Point, segs: Segment[]): Point[] {
  const pts: Point[] = [{ ...origin }];
  let cur = { ...origin };
  for (const s of segs) {
    cur =
      s.axis === "h"
        ? { x: cur.x + s.value, y: cur.y }
        : { x: cur.x, y: cur.y + s.value };
    pts.push({ ...cur });
  }
  return pts;
}

/**
 * Auto-route between two loose ends using orthogonal segments.
 * Returns 0–2 intermediate points (forming an L or Z shape).
 */
function autoRoute(a: Point, b: Point): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  // Already same point
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return [];
  // Already aligned horizontally
  if (Math.abs(dy) < 0.5) return [];
  // Already aligned vertically
  if (Math.abs(dx) < 0.5) return [];

  // L-shape: go horizontal first, then vertical
  return [{ x: b.x, y: a.y }];
}

function buildWirePath(start: Point, end: Point, hints: string[]): Point[] {
  if (!hints || hints.length === 0) {
    // No routing hints — straight horizontal then vertical
    if (Math.abs(start.x - end.x) < 0.5 || Math.abs(start.y - end.y) < 0.5) {
      return [start, end];
    }
    return [start, { x: end.x, y: start.y }, end];
  }

  const starIdx = hints.indexOf("*");
  let fromHints: string[];
  let toHints: string[];

  if (starIdx === -1) {
    fromHints = hints;
    toHints = [];
  } else {
    fromHints = hints.slice(0, starIdx);
    toHints = hints.slice(starIdx + 1);
  }

  const fromSegs = parseSegments(fromHints);
  // Per spec: to-segments are applied in REVERSE ORDER from the target pin
  const toSegs = parseSegments(toHints).reverse();

  // Trace from source pin
  const fromPath = trace(start, fromSegs);
  // Trace from target pin (segments already reversed per spec)
  const toPath = trace(end, toSegs);

  // The loose ends that need connecting
  const looseA = fromPath[fromPath.length - 1];
  const looseB = toPath[toPath.length - 1];

  // Auto-route the gap with orthogonal segments
  const bridge = autoRoute(looseA, looseB);

  // Reverse toPath so it goes from the loose end back to the target pin
  toPath.reverse();

  return [...fromPath, ...bridge, ...toPath];
}

export function renderWires(
  connections: DiagramConnection[],
  pinPositions: Map<string, PinPosition>,
): RenderedWire[] {
  const wires: RenderedWire[] = [];

  for (const [fromRef, toRef, color, hints] of connections) {
    const s = pinPositions.get(fromRef);
    const e = pinPositions.get(toRef);
    if (!s || !e) continue;

    const points = buildWirePath(s, e, hints || []);
    wires.push({ points, color: mapColor(color), fromRef, toRef });
  }

  return wires;
}

function mapColor(color: string): string {
  const map: Record<string, string> = {
    black: "#555",
    red: "#e00",
    green: "#0c0",
    blue: "#06f",
    gold: "#da2",
    orange: "#f80",
    purple: "#80f",
    gray: "#888",
    white: "#ddd",
    yellow: "#fc0",
    pink: "#f6b",
    brown: "#852",
  };
  return map[color] || color;
}
