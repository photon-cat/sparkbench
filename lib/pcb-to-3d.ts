/**
 * Extract 3D geometry data from a KicadPCB board object.
 * Converts KiCanvas parsed data into simple arrays for Three.js rendering.
 */

import type { KicadPCB } from "@kicanvas/kicad/board";

export interface BoardOutline {
  points: { x: number; y: number }[];
  width: number;
  height: number;
  minX: number;
  minY: number;
}

export interface Pad3D {
  /** Absolute position in board coords (mm) */
  x: number;
  y: number;
  /** Pad width/height (mm) */
  width: number;
  height: number;
  shape: "circle" | "rect" | "oval" | "roundrect" | "trapezoid" | "custom";
  type: "thru_hole" | "smd" | "connect" | "np_thru_hole";
  drillDiameter: number;
  rotation: number;
  layer: string;
}

export interface Footprint3D {
  reference: string;
  value: string;
  x: number;
  y: number;
  rotation: number;
  layer: string;
  pads: Pad3D[];
  silkLines: { x1: number; y1: number; x2: number; y2: number }[];
}

export interface Trace3D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  layer: string;
}

export interface Via3D {
  x: number;
  y: number;
  size: number;
  drill: number;
}

export interface PCB3DData {
  outline: BoardOutline;
  thickness: number;
  footprints: Footprint3D[];
  traces: Trace3D[];
  vias: Via3D[];
}

/** Extract ordered board outline points from Edge.Cuts drawings */
function extractOutline(board: KicadPCB): BoardOutline {
  const bbox = board.edge_cuts_bbox;
  const points: { x: number; y: number }[] = [];

  // Collect all Edge.Cuts line segments
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const d of board.drawings) {
    if ((d as any).layer !== "Edge.Cuts") continue;
    if ("start" in d && "end" in d) {
      const start = (d as any).start;
      const end = (d as any).end;
      if (start && end) {
        edges.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
      }
    }
  }

  if (edges.length === 0) {
    // Fallback: use bbox
    return {
      points: [
        { x: bbox.x, y: bbox.y },
        { x: bbox.x + bbox.w, y: bbox.y },
        { x: bbox.x + bbox.w, y: bbox.y + bbox.h },
        { x: bbox.x, y: bbox.y + bbox.h },
      ],
      width: bbox.w,
      height: bbox.h,
      minX: bbox.x,
      minY: bbox.y,
    };
  }

  // Chain edge segments into an ordered polygon
  const remaining = [...edges];
  const EPSILON = 0.01;

  // Start with the first edge
  const first = remaining.shift()!;
  points.push({ x: first.x1, y: first.y1 });
  let currentEnd = { x: first.x2, y: first.y2 };
  points.push({ ...currentEnd });

  while (remaining.length > 0) {
    let found = false;
    for (let i = 0; i < remaining.length; i++) {
      const e = remaining[i]!;
      if (Math.abs(e.x1 - currentEnd.x) < EPSILON && Math.abs(e.y1 - currentEnd.y) < EPSILON) {
        currentEnd = { x: e.x2, y: e.y2 };
        points.push({ ...currentEnd });
        remaining.splice(i, 1);
        found = true;
        break;
      }
      if (Math.abs(e.x2 - currentEnd.x) < EPSILON && Math.abs(e.y2 - currentEnd.y) < EPSILON) {
        currentEnd = { x: e.x1, y: e.y1 };
        points.push({ ...currentEnd });
        remaining.splice(i, 1);
        found = true;
        break;
      }
    }
    if (!found) break;
  }

  // Remove last point if it closes the loop (same as first)
  if (points.length > 1) {
    const last = points[points.length - 1]!;
    const firstPt = points[0]!;
    if (Math.abs(last.x - firstPt.x) < EPSILON && Math.abs(last.y - firstPt.y) < EPSILON) {
      points.pop();
    }
  }

  return {
    points,
    width: bbox.w,
    height: bbox.h,
    minX: bbox.x,
    minY: bbox.y,
  };
}

/** Transform a pad's local position to absolute board coordinates */
function absPadPosition(
  fpX: number, fpY: number, fpRot: number,
  padX: number, padY: number, padRot: number,
): { x: number; y: number; rotation: number } {
  const rad = (fpRot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: fpX + padX * cos - padY * sin,
    y: fpY + padX * sin + padY * cos,
    rotation: fpRot + padRot,
  };
}

/** Transform a silkscreen line's local position to absolute board coordinates */
function absLinePosition(
  fpX: number, fpY: number, fpRot: number,
  x: number, y: number,
): { x: number; y: number } {
  const rad = (fpRot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: fpX + x * cos - y * sin,
    y: fpY + x * sin + y * cos,
  };
}

/** Main extraction function: parse KicadPCB into 3D-ready data */
export function extractPCB3DData(board: KicadPCB): PCB3DData {
  const outline = extractOutline(board);
  const thickness = board.general?.thickness ?? 1.6;

  // Extract footprints with pads and silkscreen
  const footprints: Footprint3D[] = [];
  for (const fp of board.footprints) {
    const fpX = fp.at?.position?.x ?? 0;
    const fpY = fp.at?.position?.y ?? 0;
    const fpRot = fp.at?.rotation ?? 0;

    const pads: Pad3D[] = [];
    for (const pad of fp.pads) {
      const padX = pad.at?.position?.x ?? 0;
      const padY = pad.at?.position?.y ?? 0;
      const padRot = pad.at?.rotation ?? 0;
      const abs = absPadPosition(fpX, fpY, fpRot, padX, padY, padRot);

      pads.push({
        x: abs.x,
        y: abs.y,
        width: pad.size?.x ?? 1.6,
        height: pad.size?.y ?? 1.6,
        shape: pad.shape ?? "circle",
        type: pad.type ?? "thru_hole",
        drillDiameter: pad.drill?.diameter ?? 0,
        rotation: abs.rotation,
        layer: fp.layer ?? "F.Cu",
      });
    }

    // Extract silkscreen lines (fp_line on F.SilkS or B.SilkS)
    const silkLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const drawing of fp.drawings) {
      if ("start" in drawing && "end" in drawing) {
        const d = drawing as any;
        if (d.layer === "F.SilkS" || d.layer === "B.SilkS") {
          const s = absLinePosition(fpX, fpY, fpRot, d.start?.x ?? 0, d.start?.y ?? 0);
          const e = absLinePosition(fpX, fpY, fpRot, d.end?.x ?? 0, d.end?.y ?? 0);
          silkLines.push({ x1: s.x, y1: s.y, x2: e.x, y2: e.y });
        }
      }
    }

    footprints.push({
      reference: fp.reference ?? "",
      value: fp.value ?? "",
      x: fpX,
      y: fpY,
      rotation: fpRot,
      layer: fp.layer ?? "F.Cu",
      pads,
      silkLines,
    });
  }

  // Extract traces
  const traces: Trace3D[] = [];
  for (const seg of board.segments) {
    const s = seg as any;
    traces.push({
      x1: s.start?.x ?? 0,
      y1: s.start?.y ?? 0,
      x2: s.end?.x ?? 0,
      y2: s.end?.y ?? 0,
      width: s.width ?? 0.25,
      layer: s.layer ?? "F.Cu",
    });
  }

  // Extract vias
  const vias: Via3D[] = [];
  for (const via of board.vias) {
    vias.push({
      x: via.at?.position?.x ?? 0,
      y: via.at?.position?.y ?? 0,
      size: via.size ?? 0.8,
      drill: via.drill ?? 0.4,
    });
  }

  return { outline, thickness, footprints, traces, vias };
}
