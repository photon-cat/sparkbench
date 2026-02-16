#!/usr/bin/env npx tsx
/**
 * Wire-overlap validator for SparkBench diagram.json files.
 *
 * Checks that no wire segment passes through a non-Arduino component's
 * bounding box (except the two parts the wire connects to).
 *
 * Usage:  npx tsx scripts/test-wire-overlap.ts [project-slug]
 *         Defaults to checking all projects.
 */

import fs from "fs";
import path from "path";

// ── Types ──────────────────────────────────────────────────────────
interface Point { x: number; y: number; }
interface Rect  { x: number; y: number; w: number; h: number; }
interface PartDef {
  type: string; id: string;
  top: number; left: number;
  rotate?: number;
  attrs: Record<string, string>;
}
type Connection = [string, string, string, string[]];

// ── Known part sizes (px) ──────────────────────────────────────────
// Measured from Wokwi web components / DipChip.ts
const PART_SIZES: Record<string, { w: number; h: number }> = {
  "wokwi-arduino-uno":   { w: 230, h: 290 },
  "wokwi-arduino-nano":  { w: 180, h: 60  },
  "wokwi-74hc595":       { w: 67,  h: 29  }, // DIP-16
  "wokwi-74hc165":       { w: 67,  h: 29  },
  "wokwi-led":           { w: 18,  h: 28  },
  "wokwi-pushbutton":    { w: 42,  h: 30  },
  "wokwi-potentiometer": { w: 70,  h: 100 },
  "wokwi-servo":         { w: 90,  h: 60  },
  "wokwi-resistor":      { w: 58,  h: 19  },
  "wokwi-ssd1306":       { w: 64,  h: 48  },
  "wokwi-buzzer":        { w: 30,  h: 30  },
  "wokwi-slide-switch":  { w: 50,  h: 20  },
  "wokwi-dht22":         { w: 50,  h: 50  },
};

// ── Known pin offsets (relative to part top-left, before rotation) ──
// Only need pins that appear in connections.
const PIN_OFFSETS: Record<string, Record<string, Point>> = {
  "wokwi-arduino-uno": {
    "2": { x: 196, y: 29 }, "3": { x: 186, y: 29 }, "4": { x: 177, y: 29 },
    "5": { x: 167, y: 29 }, "6": { x: 158, y: 29 }, "7": { x: 148, y: 29 },
    "8": { x: 139, y: 29 }, "9": { x: 129, y: 29 }, "10": { x: 120, y: 29 },
    "11": { x: 110, y: 29 }, "12": { x: 100, y: 29 }, "13": { x: 91, y: 29 },
    "A0": { x: 158, y: 280 }, "A1": { x: 148, y: 280 }, "A2": { x: 139, y: 280 },
    "A3": { x: 129, y: 280 }, "A4": { x: 120, y: 280 }, "A5": { x: 110, y: 280 },
    "5V": { x: 82, y: 280 }, "3.3V": { x: 72, y: 280 },
    "GND.1": { x: 196, y: 280 }, "GND.2": { x: 62, y: 280 }, "GND.3": { x: 53, y: 280 },
  },
  "wokwi-74hc595": {
    // DIP-16: pins along top (1-8) and bottom (9-16)
    // Left to right along top: Q1(1),Q2(2),Q3(3),Q4(4),Q5(5),Q6(6),Q7(7),GND(8)
    // Right to left along bottom: VCC(16),Q0(15),DS(14),OE(13),STCP(12),SHCP(11),MR(10),Q7S(9)
    "Q0":   { x: 57, y: 29 }, "Q1":   { x: 0, y: 0 },  "Q2":   { x: 10, y: 0 },
    "Q3":   { x: 19, y: 0 },  "Q4":   { x: 29, y: 0 },  "Q5":   { x: 38, y: 0 },
    "Q6":   { x: 48, y: 0 },  "Q7":   { x: 57, y: 0 },
    "GND":  { x: 67, y: 0 },
    "VCC":  { x: 0, y: 29 },  "DS":   { x: 10, y: 29 }, "OE":   { x: 19, y: 29 },
    "STCP": { x: 29, y: 29 }, "SHCP": { x: 38, y: 29 }, "MR":   { x: 48, y: 29 },
    "Q7S":  { x: 67, y: 29 },
  },
  "wokwi-led": {
    "A": { x: 5, y: 0 },
    "C": { x: 13, y: 0 },
  },
  "wokwi-pushbutton": {
    "1.l": { x: 0, y: 10 },  "2.l": { x: 0, y: 20 },
    "1.r": { x: 42, y: 10 }, "2.r": { x: 42, y: 20 },
  },
  "wokwi-potentiometer": {
    "GND": { x: 12, y: 100 },
    "SIG": { x: 35, y: 100 },
    "VCC": { x: 58, y: 100 },
  },
  "wokwi-servo": {
    "PWM": { x: 10, y: 0 },
    "V+":  { x: 20, y: 0 },
    "GND": { x: 30, y: 0 },
  },
};

// ── Geometry helpers ───────────────────────────────────────────────

function getPartBBox(part: PartDef): Rect {
  const size = PART_SIZES[part.type];
  if (!size) return { x: part.left, y: part.top, w: 40, h: 40 }; // fallback
  let { w, h } = size;
  if (part.rotate === 90 || part.rotate === 270 || part.rotate === -90) {
    [w, h] = [h, w];
  }
  return { x: part.left, y: part.top, w, h };
}

function getPinPos(part: PartDef, pinName: string): Point | null {
  const offsets = PIN_OFFSETS[part.type];
  if (!offsets || !offsets[pinName]) return null;
  const off = offsets[pinName];

  if (!part.rotate) {
    return { x: part.left + off.x, y: part.top + off.y };
  }

  // Apply rotation around part center
  const size = PART_SIZES[part.type];
  if (!size) return null;
  const cx = size.w / 2, cy = size.h / 2;
  const dx = off.x - cx, dy = off.y - cy;
  const θ = (part.rotate * Math.PI) / 180;
  const cos = Math.cos(θ), sin = Math.sin(θ);

  // Rotated part dimensions
  const rw = part.rotate === 90 || part.rotate === 270 ? size.h : size.w;
  const rh = part.rotate === 90 || part.rotate === 270 ? size.w : size.h;

  return {
    x: part.left + rw / 2 + (dx * cos + dy * sin),
    y: part.top + rh / 2 + (-dx * sin + dy * cos),
  };
}

// ── Wire path tracing (simplified from wire-renderer.ts) ──────────

function buildWirePath(start: Point, end: Point, hints: string[]): Point[] {
  if (!hints || hints.length === 0) {
    if (Math.abs(start.x - end.x) < 0.5 || Math.abs(start.y - end.y) < 0.5) {
      return [start, end];
    }
    return [start, { x: end.x, y: start.y }, end];
  }

  const starIdx = hints.indexOf("*");
  const fromHints = starIdx === -1 ? hints : hints.slice(0, starIdx);
  const toHints = starIdx === -1 ? [] : hints.slice(starIdx + 1);

  const fromSegs = parseSegs(fromHints);
  const toSegs = parseSegs(toHints).reverse();

  const fromPath = traceSegs(start, fromSegs);
  const toPath = traceSegs(end, toSegs);

  const looseA = fromPath[fromPath.length - 1];
  const looseB = toPath[toPath.length - 1];

  // Auto-route: horizontal-first L-shape
  const bridge: Point[] = [];
  const dx = looseB.x - looseA.x;
  const dy = looseB.y - looseA.y;
  if (Math.abs(dx) > 0.5 && Math.abs(dy) > 0.5) {
    bridge.push({ x: looseB.x, y: looseA.y });
  }

  toPath.reverse();
  return [...fromPath, ...bridge, ...toPath];
}

function parseSegs(arr: string[]): Array<{ axis: "h"|"v"; value: number }> {
  const segs: Array<{ axis: "h"|"v"; value: number }> = [];
  for (const s of arr) {
    const ch = s.charAt(0) as "h"|"v";
    if (ch !== "h" && ch !== "v") continue;
    const v = parseFloat(s.substring(1));
    if (!isNaN(v)) segs.push({ axis: ch, value: v });
  }
  return segs;
}

function traceSegs(origin: Point, segs: Array<{ axis: "h"|"v"; value: number }>): Point[] {
  const pts: Point[] = [{ ...origin }];
  let cur = { ...origin };
  for (const s of segs) {
    cur = s.axis === "h"
      ? { x: cur.x + s.value, y: cur.y }
      : { x: cur.x, y: cur.y + s.value };
    pts.push({ ...cur });
  }
  return pts;
}

// ── Segment-vs-Rectangle intersection ─────────────────────────────

/** Inflate a rect by `margin` on each side */
function inflateRect(r: Rect, margin: number): Rect {
  return { x: r.x - margin, y: r.y - margin, w: r.w + 2 * margin, h: r.h + 2 * margin };
}

/** Check if a line segment (p1→p2) intersects a rectangle */
function segmentIntersectsRect(p1: Point, p2: Point, r: Rect): boolean {
  // Quick check: if both endpoints are outside on the same side, no intersection
  const rx2 = r.x + r.w, ry2 = r.y + r.h;

  // Check if either endpoint is inside
  if (pointInRect(p1, r) || pointInRect(p2, r)) return true;

  // Check intersection with each edge
  return (
    segmentsIntersect(p1, p2, { x: r.x, y: r.y }, { x: rx2, y: r.y }) || // top
    segmentsIntersect(p1, p2, { x: r.x, y: ry2 }, { x: rx2, y: ry2 }) || // bottom
    segmentsIntersect(p1, p2, { x: r.x, y: r.y }, { x: r.x, y: ry2 }) || // left
    segmentsIntersect(p1, p2, { x: rx2, y: r.y }, { x: rx2, y: ry2 })     // right
  );
}

function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  // Collinear overlap cases
  if (d1 === 0 && onSegment(b1, b2, a1)) return true;
  if (d2 === 0 && onSegment(b1, b2, a2)) return true;
  if (d3 === 0 && onSegment(a1, a2, b1)) return true;
  if (d4 === 0 && onSegment(a1, a2, b2)) return true;
  return false;
}

function onSegment(p: Point, q: Point, r: Point): boolean {
  return r.x >= Math.min(p.x, q.x) && r.x <= Math.max(p.x, q.x) &&
         r.y >= Math.min(p.y, q.y) && r.y <= Math.max(p.y, q.y);
}

// ── Main validator ─────────────────────────────────────────────────

interface Violation {
  wireIndex: number;
  wireLabel: string;
  overlappedPart: string;
  segStart: Point;
  segEnd: Point;
}

function validateDiagram(diagramPath: string): Violation[] {
  const raw = JSON.parse(fs.readFileSync(diagramPath, "utf-8"));
  const parts: PartDef[] = raw.parts ?? [];
  const connections: Connection[] = raw.connections ?? [];

  // Exempt part types (OK to route wires over)
  const EXEMPT_TYPES = new Set(["wokwi-arduino-uno", "wokwi-arduino-nano", "wokwi-arduino-mega"]);

  const partsById = new Map<string, PartDef>();
  for (const p of parts) partsById.set(p.id, p);

  // Build bounding boxes for non-exempt parts
  const bboxes: Array<{ id: string; rect: Rect }> = [];
  for (const p of parts) {
    if (EXEMPT_TYPES.has(p.type)) continue;
    bboxes.push({ id: p.id, rect: inflateRect(getPartBBox(p), 3) }); // 3px margin
  }

  // Build pin position map
  const pinPos = new Map<string, Point>();
  for (const p of parts) {
    const offsets = PIN_OFFSETS[p.type];
    if (!offsets) continue;
    for (const pinName of Object.keys(offsets)) {
      const pos = getPinPos(p, pinName);
      if (pos) pinPos.set(`${p.id}:${pinName}`, pos);
    }
  }

  const violations: Violation[] = [];

  for (let ci = 0; ci < connections.length; ci++) {
    const [fromRef, toRef, , hints] = connections[ci];
    const start = pinPos.get(fromRef);
    const end = pinPos.get(toRef);
    if (!start || !end) continue;

    const fromPartId = fromRef.split(":")[0];
    const toPartId = toRef.split(":")[0];
    const connectedParts = new Set([fromPartId, toPartId]);

    const wirePath = buildWirePath(start, end, hints || []);

    // Check each wire segment against each non-exempt, non-connected part
    for (let si = 0; si < wirePath.length - 1; si++) {
      const p1 = wirePath[si];
      const p2 = wirePath[si + 1];

      for (const { id, rect } of bboxes) {
        if (connectedParts.has(id)) continue;
        if (segmentIntersectsRect(p1, p2, rect)) {
          violations.push({
            wireIndex: ci,
            wireLabel: `${fromRef} → ${toRef}`,
            overlappedPart: id,
            segStart: p1,
            segEnd: p2,
          });
        }
      }
    }
  }

  return violations;
}

// ── CLI ────────────────────────────────────────────────────────────

const projectsDir = path.join(__dirname, "..", "projects");
const slug = process.argv[2];

const projectDirs = slug
  ? [path.join(projectsDir, slug)]
  : fs.readdirSync(projectsDir)
      .map(d => path.join(projectsDir, d))
      .filter(d => fs.statSync(d).isDirectory());

let totalViolations = 0;
let totalProjects = 0;

for (const dir of projectDirs) {
  const diagramPath = path.join(dir, "diagram.json");
  if (!fs.existsSync(diagramPath)) continue;

  totalProjects++;
  const projectName = path.basename(dir);
  const violations = validateDiagram(diagramPath);

  if (violations.length === 0) {
    console.log(`✓ ${projectName}: no wire-over-part overlaps`);
  } else {
    console.log(`✗ ${projectName}: ${violations.length} wire overlap(s)`);
    for (const v of violations) {
      console.log(`    wire ${v.wireIndex} (${v.wireLabel}) crosses ${v.overlappedPart}`);
      console.log(`      segment: (${Math.round(v.segStart.x)},${Math.round(v.segStart.y)}) → (${Math.round(v.segEnd.x)},${Math.round(v.segEnd.y)})`);
    }
    totalViolations += violations.length;
  }
}

console.log(`\nChecked ${totalProjects} project(s), ${totalViolations} violation(s)`);
process.exit(totalViolations > 0 ? 1 : 0);
