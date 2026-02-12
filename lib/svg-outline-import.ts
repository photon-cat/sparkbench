/**
 * Parse SVG path/line/rect elements into KiCad Edge.Cuts S-expression nodes.
 *
 * Supports SVG path commands: M, L, H, V, Z, A (absolute and relative).
 * Bezier curves (C, S, Q, T) are approximated as line segments.
 */

import type { List } from "@kicanvas/kicad/tokenizer";

interface ImportOptions {
  /** Scale factor: SVG units → mm. Default 1 (assumes SVG is already in mm). */
  scale?: number;
  /** X offset in mm. */
  offsetX?: number;
  /** Y offset in mm. */
  offsetY?: number;
}

/**
 * Convert an SVG path `d` attribute into Edge.Cuts gr_line/gr_arc S-expression nodes.
 */
export function svgPathToEdgeCuts(pathD: string, options?: ImportOptions): List[] {
  const scale = options?.scale ?? 1;
  const ox = options?.offsetX ?? 0;
  const oy = options?.offsetY ?? 0;

  const nodes: List[] = [];
  const commands = parseSVGPath(pathD);

  let cx = 0, cy = 0;     // current position
  let mx = 0, my = 0;     // move-to origin (for Z close)

  for (const cmd of commands) {
    const abs = cmd.type === cmd.type.toUpperCase();
    const t = cmd.type.toUpperCase();

    switch (t) {
      case "M": {
        if (abs) { cx = cmd.args[0]!; cy = cmd.args[1]!; }
        else { cx += cmd.args[0]!; cy += cmd.args[1]!; }
        mx = cx; my = cy;
        // M can have implicit L pairs after the first point
        for (let i = 2; i < cmd.args.length; i += 2) {
          const x1 = cx, y1 = cy;
          if (abs) { cx = cmd.args[i]!; cy = cmd.args[i + 1]!; }
          else { cx += cmd.args[i]!; cy += cmd.args[i + 1]!; }
          nodes.push(makeGrLine(x1, y1, cx, cy, scale, ox, oy));
        }
        break;
      }
      case "L": {
        for (let i = 0; i < cmd.args.length; i += 2) {
          const x1 = cx, y1 = cy;
          if (abs) { cx = cmd.args[i]!; cy = cmd.args[i + 1]!; }
          else { cx += cmd.args[i]!; cy += cmd.args[i + 1]!; }
          nodes.push(makeGrLine(x1, y1, cx, cy, scale, ox, oy));
        }
        break;
      }
      case "H": {
        for (const val of cmd.args) {
          const x1 = cx;
          cx = abs ? val : cx + val;
          nodes.push(makeGrLine(x1, cy, cx, cy, scale, ox, oy));
        }
        break;
      }
      case "V": {
        for (const val of cmd.args) {
          const y1 = cy;
          cy = abs ? val : cy + val;
          nodes.push(makeGrLine(cx, y1, cx, cy, scale, ox, oy));
        }
        break;
      }
      case "Z": {
        if (cx !== mx || cy !== my) {
          nodes.push(makeGrLine(cx, cy, mx, my, scale, ox, oy));
        }
        cx = mx; cy = my;
        break;
      }
      case "A": {
        // SVG arc: rx ry x-rotation large-arc-flag sweep-flag x y
        for (let i = 0; i < cmd.args.length; i += 7) {
          const x1 = cx, y1 = cy;
          const endX = abs ? cmd.args[i + 5]! : cx + cmd.args[i + 5]!;
          const endY = abs ? cmd.args[i + 6]! : cy + cmd.args[i + 6]!;
          // Approximate arc as line segment for simplicity
          // TODO: proper arc → gr_arc conversion using midpoint
          nodes.push(makeGrLine(x1, y1, endX, endY, scale, ox, oy));
          cx = endX; cy = endY;
        }
        break;
      }
      // Bezier curves: approximate with line to endpoint
      case "C": {
        for (let i = 0; i < cmd.args.length; i += 6) {
          const x1 = cx, y1 = cy;
          const endX = abs ? cmd.args[i + 4]! : cx + cmd.args[i + 4]!;
          const endY = abs ? cmd.args[i + 5]! : cy + cmd.args[i + 5]!;
          nodes.push(makeGrLine(x1, y1, endX, endY, scale, ox, oy));
          cx = endX; cy = endY;
        }
        break;
      }
      case "S": {
        for (let i = 0; i < cmd.args.length; i += 4) {
          const x1 = cx, y1 = cy;
          const endX = abs ? cmd.args[i + 2]! : cx + cmd.args[i + 2]!;
          const endY = abs ? cmd.args[i + 3]! : cy + cmd.args[i + 3]!;
          nodes.push(makeGrLine(x1, y1, endX, endY, scale, ox, oy));
          cx = endX; cy = endY;
        }
        break;
      }
      case "Q": {
        for (let i = 0; i < cmd.args.length; i += 4) {
          const x1 = cx, y1 = cy;
          const endX = abs ? cmd.args[i + 2]! : cx + cmd.args[i + 2]!;
          const endY = abs ? cmd.args[i + 3]! : cy + cmd.args[i + 3]!;
          nodes.push(makeGrLine(x1, y1, endX, endY, scale, ox, oy));
          cx = endX; cy = endY;
        }
        break;
      }
      case "T": {
        for (let i = 0; i < cmd.args.length; i += 2) {
          const x1 = cx, y1 = cy;
          const endX = abs ? cmd.args[i]! : cx + cmd.args[i]!;
          const endY = abs ? cmd.args[i + 1]! : cy + cmd.args[i + 1]!;
          nodes.push(makeGrLine(x1, y1, endX, endY, scale, ox, oy));
          cx = endX; cy = endY;
        }
        break;
      }
    }
  }

  return nodes;
}

/** Create a gr_line S-expression node. */
function makeGrLine(
  x1: number, y1: number, x2: number, y2: number,
  scale: number, ox: number, oy: number,
): List {
  return [
    "gr_line",
    ["start", round6(x1 * scale + ox), round6(y1 * scale + oy)],
    ["end", round6(x2 * scale + ox), round6(y2 * scale + oy)],
    ["layer", "Edge.Cuts"],
    ["width", 0.1],
    ["uuid", crypto.randomUUID()],
  ];
}

function round6(n: number): number {
  return Math.round(n * 1000000) / 1000000;
}

// ── SVG path parser ───────────────────────────────────────────────

interface PathCommand {
  type: string;   // M, m, L, l, H, h, V, v, Z, z, A, a, C, c, S, s, Q, q, T, t
  args: number[];
}

function parseSVGPath(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  // Split on command letters, keeping the letter
  const re = /([MmLlHhVvZzAaCcSsQqTt])([^MmLlHhVvZzAaCcSsQqTt]*)/g;
  let match;
  while ((match = re.exec(d)) !== null) {
    const type = match[1]!;
    const argStr = match[2]!.trim();
    const args: number[] = [];
    if (argStr) {
      // Parse numbers (handle comma and whitespace separation, negative numbers)
      const numRe = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
      let numMatch;
      while ((numMatch = numRe.exec(argStr)) !== null) {
        args.push(parseFloat(numMatch[0]));
      }
    }
    commands.push({ type, args });
  }
  return commands;
}
