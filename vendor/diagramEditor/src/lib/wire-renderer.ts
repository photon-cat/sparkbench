/**
 * Wire renderer for Wokwi diagram.json connections.
 *
 * Spec: https://docs.wokwi.com/diagram-format#wire-placement-mini-language
 */

import type { DiagramConnection } from "./diagram-types";

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
  connectionIndex: number;
}

/**
 * Convert a full wire path back to Wokwi h/v hint segments.
 */
export function pathToHints(points: Point[]): string[] {
  const cleaned = cleanPath(points);
  const hints: string[] = [];
  for (let i = 1; i < cleaned.length; i++) {
    const dx = cleaned[i].x - cleaned[i - 1].x;
    const dy = cleaned[i].y - cleaned[i - 1].y;
    if (Math.abs(dx) > 0.5) hints.push(`h${Math.round(dx)}`);
    if (Math.abs(dy) > 0.5) hints.push(`v${Math.round(dy)}`);
  }
  return hints;
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
 * Returns 0-1 intermediate points (forming an L shape).
 * Wokwi routes horizontal-first for the auto-bridge gap.
 */
function autoRoute(a: Point, b: Point): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return [];
  if (Math.abs(dy) < 0.5) return [];
  if (Math.abs(dx) < 0.5) return [];

  // Wokwi routes horizontal-first: go to target X, then vertical
  return [{ x: b.x, y: a.y }];
}

/**
 * Clean a wire path by removing near-duplicate and collinear points.
 */
function cleanPath(points: Point[]): Point[] {
  if (points.length <= 1) return points;

  // Step 1: Remove near-duplicate consecutive points
  const deduped: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (Math.abs(points[i].x - prev.x) > 0.5 || Math.abs(points[i].y - prev.y) > 0.5) {
      deduped.push(points[i]);
    }
  }

  // Step 2: Remove collinear mid-points (3 consecutive points on same axis)
  if (deduped.length <= 2) return deduped;
  const result: Point[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = result[result.length - 1];
    const cur = deduped[i];
    const next = deduped[i + 1];
    const sameX = Math.abs(prev.x - cur.x) < 0.5 && Math.abs(cur.x - next.x) < 0.5;
    const sameY = Math.abs(prev.y - cur.y) < 0.5 && Math.abs(cur.y - next.y) < 0.5;
    if (!sameX && !sameY) {
      result.push(cur);
    }
  }
  result.push(deduped[deduped.length - 1]);
  return result;
}

function buildWirePath(start: Point, end: Point, hints: string[]): Point[] {
  if (!hints || hints.length === 0) {
    if (Math.abs(start.x - end.x) < 0.5 || Math.abs(start.y - end.y) < 0.5) {
      return [start, end];
    }
    // Horizontal-first routing to match Wokwi
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
  const toSegs = parseSegments(toHints).reverse();

  const fromPath = trace(start, fromSegs);
  const toPath = trace(end, toSegs);

  const looseA = fromPath[fromPath.length - 1];
  const looseB = toPath[toPath.length - 1];
  const bridge = autoRoute(looseA, looseB);

  toPath.reverse();
  const raw = [...fromPath, ...bridge, ...toPath];
  return cleanPath(raw);
}

export function renderWires(
  connections: DiagramConnection[],
  pinPositions: Map<string, PinPosition>,
): RenderedWire[] {
  const wires: RenderedWire[] = [];

  for (let ci = 0; ci < connections.length; ci++) {
    const [fromRef, toRef, color, hints] = connections[ci];
    const s = pinPositions.get(fromRef);
    const e = pinPositions.get(toRef);
    if (!s || !e) continue;

    const points = buildWirePath(s, e, hints || []);
    wires.push({ points, color: mapColor(color), fromRef, toRef, connectionIndex: ci });
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
    cyan: "#0cc",
    limegreen: "#8f0",
    magenta: "#f0f",
    violet: "#80f",
  };
  return map[color] || color;
}
