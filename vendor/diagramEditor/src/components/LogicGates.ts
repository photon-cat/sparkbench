/**
 * Logic gate schematic symbols as custom elements.
 * All pin positions are grid-aligned (multiples of UNIT = 9.6px = 0.1in).
 * Colors: blue stroke for gate outlines.
 */

const UNIT = 9.6;
const STROKE = "#3b82f6"; // blue
const STROKE_W = 1.5;
const PIN_COLOR = "#888";

interface PinInfo {
  name: string;
  x: number;
  y: number;
  signals: { type: string; signal: string }[];
  number: number;
}

// Helper: pin stub line from edge to gate body
function pinLine(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${PIN_COLOR}" stroke-width="1" stroke-linecap="round"/>`;
}

// Bubble for inverting outputs
function bubble(cx: number, cy: number, r = 2.5): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}"/>`;
}

// ──────────────────────────── NOT gate ────────────────────────────
// 1 input (A), 1 output (OUT)
// Width: 5 units, Height: 2 units, pins at y=1*UNIT
const NOT_W = 5 * UNIT;
const NOT_H = 2 * UNIT;
const NOT_PINS: PinInfo[] = [
  { name: "A", x: 0, y: 1 * UNIT, number: 1, signals: [] },
  { name: "OUT", x: 5 * UNIT, y: 1 * UNIT, number: 2, signals: [] },
];
function notSvg(): string {
  const cy = UNIT; // center y
  const bodyL = 1 * UNIT; // body starts
  const bodyR = 3.5 * UNIT; // triangle tip
  const bodyT = cy - 1 * UNIT + 2;
  const bodyB = cy + 1 * UNIT - 2;
  const bubR = 2.5;
  const bubCx = bodyR + bubR + 0.5;
  const outX = 5 * UNIT;
  let s = `<svg width="${NOT_W}" height="${NOT_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  // input stub
  s += pinLine(0, cy, bodyL, cy);
  // triangle
  s += `<polygon points="${bodyL},${bodyT} ${bodyR},${cy} ${bodyL},${bodyB}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"/>`;
  // bubble
  s += bubble(bubCx, cy, bubR);
  // output stub
  s += pinLine(bubCx + bubR, cy, outX, cy);
  s += `</svg>`;
  return s;
}

// ──────────────────────────── AND gate ────────────────────────────
// 2 inputs (A, B), 1 output (OUT)
// Width: 5 units, Height: 3 units
const GATE2_W = 5 * UNIT;
const GATE2_H = 3 * UNIT;
const AND_PINS: PinInfo[] = [
  { name: "A", x: 0, y: 1 * UNIT, number: 1, signals: [] },
  { name: "B", x: 0, y: 2 * UNIT, number: 2, signals: [] },
  { name: "OUT", x: 5 * UNIT, y: 1.5 * UNIT, number: 3, signals: [] },
];
function andSvg(): string {
  const cy = 1.5 * UNIT;
  const bL = 1 * UNIT;
  const bR = 3.5 * UNIT;
  const bT = 0.5 * UNIT;
  const bB = 2.5 * UNIT;
  const bMid = (bL + bR) / 2;
  const outX = 5 * UNIT;
  let s = `<svg width="${GATE2_W}" height="${GATE2_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  s += pinLine(0, 1 * UNIT, bL, 1 * UNIT);
  s += pinLine(0, 2 * UNIT, bL, 2 * UNIT);
  // AND body: flat left, curved right
  s += `<path d="M${bL},${bT} L${bMid},${bT} A${(bR - bMid)},${cy - bT} 0 0 1 ${bMid},${bB} L${bL},${bB} Z" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"/>`;
  s += pinLine(bR, cy, outX, cy);
  s += `</svg>`;
  return s;
}

// ──────────────────────────── OR gate ────────────────────────────
const OR_PINS: PinInfo[] = [
  { name: "A", x: 0, y: 1 * UNIT, number: 1, signals: [] },
  { name: "B", x: 0, y: 2 * UNIT, number: 2, signals: [] },
  { name: "OUT", x: 5 * UNIT, y: 1.5 * UNIT, number: 3, signals: [] },
];
function orSvg(): string {
  const cy = 1.5 * UNIT;
  const bL = 1 * UNIT;
  const bT = 0.5 * UNIT;
  const bB = 2.5 * UNIT;
  const tipX = 3.5 * UNIT;
  const outX = 5 * UNIT;
  const curveIn = 0.4 * UNIT; // input side curve depth
  let s = `<svg width="${GATE2_W}" height="${GATE2_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  s += pinLine(0, 1 * UNIT, bL + curveIn * 0.5, 1 * UNIT);
  s += pinLine(0, 2 * UNIT, bL + curveIn * 0.5, 2 * UNIT);
  // OR body
  s += `<path d="M${bL},${bT} Q${bL + 2 * UNIT},${bT} ${tipX},${cy} Q${bL + 2 * UNIT},${bB} ${bL},${bB} Q${bL + curveIn},${cy} ${bL},${bT}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"/>`;
  s += pinLine(tipX, cy, outX, cy);
  s += `</svg>`;
  return s;
}

// ──────────────────────────── XOR gate ────────────────────────────
const XOR_PINS: PinInfo[] = [...OR_PINS.map(p => ({ ...p }))];
function xorSvg(): string {
  const cy = 1.5 * UNIT;
  const bL = 1 * UNIT;
  const bT = 0.5 * UNIT;
  const bB = 2.5 * UNIT;
  const tipX = 3.5 * UNIT;
  const outX = 5 * UNIT;
  const curveIn = 0.4 * UNIT;
  const xorGap = 3;
  let s = `<svg width="${GATE2_W}" height="${GATE2_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  s += pinLine(0, 1 * UNIT, bL + curveIn * 0.5, 1 * UNIT);
  s += pinLine(0, 2 * UNIT, bL + curveIn * 0.5, 2 * UNIT);
  // Extra input curve (XOR marker)
  s += `<path d="M${bL - xorGap},${bT} Q${bL - xorGap + curveIn},${cy} ${bL - xorGap},${bB}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}"/>`;
  // OR body
  s += `<path d="M${bL},${bT} Q${bL + 2 * UNIT},${bT} ${tipX},${cy} Q${bL + 2 * UNIT},${bB} ${bL},${bB} Q${bL + curveIn},${cy} ${bL},${bT}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"/>`;
  s += pinLine(tipX, cy, outX, cy);
  s += `</svg>`;
  return s;
}

// ──────────────────────────── NAND gate ────────────────────────────
const NAND_PINS: PinInfo[] = [
  { name: "A", x: 0, y: 1 * UNIT, number: 1, signals: [] },
  { name: "B", x: 0, y: 2 * UNIT, number: 2, signals: [] },
  { name: "OUT", x: 5 * UNIT, y: 1.5 * UNIT, number: 3, signals: [] },
];
function nandSvg(): string {
  const cy = 1.5 * UNIT;
  const bL = 1 * UNIT;
  const bR = 3.2 * UNIT;
  const bT = 0.5 * UNIT;
  const bB = 2.5 * UNIT;
  const bMid = (bL + bR) / 2;
  const bubR = 2.5;
  const bubCx = bR + bubR + 0.5;
  const outX = 5 * UNIT;
  let s = `<svg width="${GATE2_W}" height="${GATE2_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  s += pinLine(0, 1 * UNIT, bL, 1 * UNIT);
  s += pinLine(0, 2 * UNIT, bL, 2 * UNIT);
  s += `<path d="M${bL},${bT} L${bMid},${bT} A${(bR - bMid)},${cy - bT} 0 0 1 ${bMid},${bB} L${bL},${bB} Z" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"/>`;
  s += bubble(bubCx, cy, bubR);
  s += pinLine(bubCx + bubR, cy, outX, cy);
  s += `</svg>`;
  return s;
}

// ──────────────────────────── NOR gate ────────────────────────────
const NOR_PINS: PinInfo[] = [...OR_PINS.map(p => ({ ...p }))];
function norSvg(): string {
  const cy = 1.5 * UNIT;
  const bL = 1 * UNIT;
  const bT = 0.5 * UNIT;
  const bB = 2.5 * UNIT;
  const tipX = 3.2 * UNIT;
  const outX = 5 * UNIT;
  const curveIn = 0.4 * UNIT;
  const bubR = 2.5;
  const bubCx = tipX + bubR + 0.5;
  let s = `<svg width="${GATE2_W}" height="${GATE2_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  s += pinLine(0, 1 * UNIT, bL + curveIn * 0.5, 1 * UNIT);
  s += pinLine(0, 2 * UNIT, bL + curveIn * 0.5, 2 * UNIT);
  s += `<path d="M${bL},${bT} Q${bL + 2 * UNIT},${bT} ${tipX},${cy} Q${bL + 2 * UNIT},${bB} ${bL},${bB} Q${bL + curveIn},${cy} ${bL},${bT}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"/>`;
  s += bubble(bubCx, cy, bubR);
  s += pinLine(bubCx + bubR, cy, outX, cy);
  s += `</svg>`;
  return s;
}

// ──────────────────────────── XNOR gate ────────────────────────────
const XNOR_PINS: PinInfo[] = [...OR_PINS.map(p => ({ ...p }))];
function xnorSvg(): string {
  const cy = 1.5 * UNIT;
  const bL = 1 * UNIT;
  const bT = 0.5 * UNIT;
  const bB = 2.5 * UNIT;
  const tipX = 3.2 * UNIT;
  const outX = 5 * UNIT;
  const curveIn = 0.4 * UNIT;
  const xorGap = 3;
  const bubR = 2.5;
  const bubCx = tipX + bubR + 0.5;
  let s = `<svg width="${GATE2_W}" height="${GATE2_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  s += pinLine(0, 1 * UNIT, bL + curveIn * 0.5, 1 * UNIT);
  s += pinLine(0, 2 * UNIT, bL + curveIn * 0.5, 2 * UNIT);
  s += `<path d="M${bL - xorGap},${bT} Q${bL - xorGap + curveIn},${cy} ${bL - xorGap},${bB}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}"/>`;
  s += `<path d="M${bL},${bT} Q${bL + 2 * UNIT},${bT} ${tipX},${cy} Q${bL + 2 * UNIT},${bB} ${bL},${bB} Q${bL + curveIn},${cy} ${bL},${bT}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"/>`;
  s += bubble(bubCx, cy, bubR);
  s += pinLine(bubCx + bubR, cy, outX, cy);
  s += `</svg>`;
  return s;
}

// ──────────────────────────── MUX (2:1) ────────────────────────────
// Inputs: A, B, SEL — Output: OUT
const MUX_W = 4 * UNIT;
const MUX_H = 3 * UNIT;
const MUX_PINS: PinInfo[] = [
  { name: "A", x: 0, y: 1 * UNIT, number: 1, signals: [] },
  { name: "B", x: 0, y: 2 * UNIT, number: 2, signals: [] },
  { name: "SEL", x: 2 * UNIT, y: 3 * UNIT, number: 3, signals: [] },
  { name: "OUT", x: 4 * UNIT, y: 1.5 * UNIT, number: 4, signals: [] },
];
function muxSvg(): string {
  const cy = 1.5 * UNIT;
  const bL = 1 * UNIT;
  const bR = 3 * UNIT;
  const bT = 0.3 * UNIT;
  const bB = 2.7 * UNIT;
  const outX = 4 * UNIT;
  let s = `<svg width="${MUX_W}" height="${MUX_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  s += pinLine(0, 1 * UNIT, bL, 1 * UNIT);
  s += pinLine(0, 2 * UNIT, bL, 2 * UNIT);
  // Trapezoid body
  s += `<polygon points="${bL},${bT} ${bR},${0.8 * UNIT} ${bR},${2.2 * UNIT} ${bL},${bB}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"/>`;
  // SEL line from bottom
  s += pinLine(2 * UNIT, 3 * UNIT, 2 * UNIT, bB);
  // Output
  s += pinLine(bR, cy, outX, cy);
  s += `</svg>`;
  return s;
}

// ──────────────────────────── Flip-Flop D ────────────────────────────
// Inputs: D, CLK — Outputs: Q, Q_bar
const FF_W = 5 * UNIT;
const FF_H = 3 * UNIT;
const FFD_PINS: PinInfo[] = [
  { name: "D", x: 0, y: 1 * UNIT, number: 1, signals: [] },
  { name: "CLK", x: 0, y: 2 * UNIT, number: 2, signals: [] },
  { name: "Q", x: 5 * UNIT, y: 1 * UNIT, number: 3, signals: [] },
  { name: "Q_bar", x: 5 * UNIT, y: 2 * UNIT, number: 4, signals: [] },
];
function ffdSvg(): string {
  const bL = 1 * UNIT;
  const bR = 4 * UNIT;
  const bT = 0.3 * UNIT;
  const bB = 2.7 * UNIT;
  const outX = 5 * UNIT;
  let s = `<svg width="${FF_W}" height="${FF_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  // Box
  s += `<rect x="${bL}" y="${bT}" width="${bR - bL}" height="${bB - bT}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" rx="1"/>`;
  // Input stubs
  s += pinLine(0, 1 * UNIT, bL, 1 * UNIT);
  s += pinLine(0, 2 * UNIT, bL, 2 * UNIT);
  // Clock triangle
  s += `<polygon points="${bL},${2 * UNIT - 3} ${bL + 4},${2 * UNIT} ${bL},${2 * UNIT + 3}" fill="none" stroke="${STROKE}" stroke-width="1"/>`;
  // Output stubs
  s += pinLine(bR, 1 * UNIT, outX, 1 * UNIT);
  s += pinLine(bR, 2 * UNIT, outX, 2 * UNIT);
  // Labels
  s += `<text x="${bL + 4}" y="${1 * UNIT + 1}" fill="${STROKE}" font-size="6" font-family="monospace" font-weight="600">D</text>`;
  s += `<text x="${bR - 3}" y="${1 * UNIT + 1}" fill="${STROKE}" font-size="6" font-family="monospace" font-weight="600" text-anchor="end">Q</text>`;
  // Q bar (Q with overline)
  const qbY = 2 * UNIT;
  s += `<text x="${bR - 3}" y="${qbY + 1}" fill="${STROKE}" font-size="6" font-family="monospace" font-weight="600" text-anchor="end">Q</text>`;
  s += `<line x1="${bR - 10}" y1="${qbY - 4}" x2="${bR - 3}" y2="${qbY - 4}" stroke="${STROKE}" stroke-width="0.8"/>`;
  s += `</svg>`;
  return s;
}

// ──────────────────────────── Flip-Flop DR ────────────────────────────
// Inputs: D, CLK, R — Outputs: Q, Q_bar
const FFDR_W = 5 * UNIT;
const FFDR_H = 4 * UNIT;
const FFDR_PINS: PinInfo[] = [
  { name: "D", x: 0, y: 1 * UNIT, number: 1, signals: [] },
  { name: "CLK", x: 0, y: 2 * UNIT, number: 2, signals: [] },
  { name: "R", x: 2.5 * UNIT, y: 4 * UNIT, number: 3, signals: [] },
  { name: "Q", x: 5 * UNIT, y: 1 * UNIT, number: 4, signals: [] },
  { name: "Q_bar", x: 5 * UNIT, y: 2 * UNIT, number: 5, signals: [] },
];
function ffdrSvg(): string {
  const bL = 1 * UNIT;
  const bR = 4 * UNIT;
  const bT = 0.3 * UNIT;
  const bB = 3 * UNIT;
  const outX = 5 * UNIT;
  let s = `<svg width="${FFDR_W}" height="${FFDR_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="${bL}" y="${bT}" width="${bR - bL}" height="${bB - bT}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" rx="1"/>`;
  s += pinLine(0, 1 * UNIT, bL, 1 * UNIT);
  s += pinLine(0, 2 * UNIT, bL, 2 * UNIT);
  s += `<polygon points="${bL},${2 * UNIT - 3} ${bL + 4},${2 * UNIT} ${bL},${2 * UNIT + 3}" fill="none" stroke="${STROKE}" stroke-width="1"/>`;
  // Reset from bottom
  s += pinLine(2.5 * UNIT, 4 * UNIT, 2.5 * UNIT, bB);
  s += pinLine(bR, 1 * UNIT, outX, 1 * UNIT);
  s += pinLine(bR, 2 * UNIT, outX, 2 * UNIT);
  // Labels
  s += `<text x="${bL + 4}" y="${1 * UNIT + 1}" fill="${STROKE}" font-size="6" font-family="monospace" font-weight="600">D</text>`;
  s += `<text x="${bR - 3}" y="${1 * UNIT + 1}" fill="${STROKE}" font-size="6" font-family="monospace" font-weight="600" text-anchor="end">Q</text>`;
  const qbY = 2 * UNIT;
  s += `<text x="${bR - 3}" y="${qbY + 1}" fill="${STROKE}" font-size="6" font-family="monospace" font-weight="600" text-anchor="end">Q</text>`;
  s += `<line x1="${bR - 10}" y1="${qbY - 4}" x2="${bR - 3}" y2="${qbY - 4}" stroke="${STROKE}" stroke-width="0.8"/>`;
  s += `<text x="${2.5 * UNIT}" y="${bB - 3}" fill="${STROKE}" font-size="5" font-family="monospace" font-weight="600" text-anchor="middle">R</text>`;
  s += `</svg>`;
  return s;
}

// ──────────────────────────── Flip-Flop DSR ────────────────────────────
// Inputs: D, CLK, S, R — Outputs: Q, Q_bar
const FFDSR_W = 5 * UNIT;
const FFDSR_H = 4 * UNIT;
const FFDSR_PINS: PinInfo[] = [
  { name: "D", x: 0, y: 1 * UNIT, number: 1, signals: [] },
  { name: "CLK", x: 0, y: 2 * UNIT, number: 2, signals: [] },
  { name: "S", x: 2.5 * UNIT, y: 0, number: 3, signals: [] },
  { name: "R", x: 2.5 * UNIT, y: 4 * UNIT, number: 4, signals: [] },
  { name: "Q", x: 5 * UNIT, y: 1 * UNIT, number: 5, signals: [] },
  { name: "Q_bar", x: 5 * UNIT, y: 2 * UNIT, number: 6, signals: [] },
];
function ffdsrSvg(): string {
  const bL = 1 * UNIT;
  const bR = 4 * UNIT;
  const bT = 0.5 * UNIT;
  const bB = 3.5 * UNIT;
  const outX = 5 * UNIT;
  let s = `<svg width="${FFDSR_W}" height="${FFDSR_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="${bL}" y="${bT}" width="${bR - bL}" height="${bB - bT}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" rx="1"/>`;
  s += pinLine(0, 1 * UNIT, bL, 1 * UNIT);
  s += pinLine(0, 2 * UNIT, bL, 2 * UNIT);
  s += `<polygon points="${bL},${2 * UNIT - 3} ${bL + 4},${2 * UNIT} ${bL},${2 * UNIT + 3}" fill="none" stroke="${STROKE}" stroke-width="1"/>`;
  // Set from top, Reset from bottom
  s += pinLine(2.5 * UNIT, 0, 2.5 * UNIT, bT);
  s += pinLine(2.5 * UNIT, 4 * UNIT, 2.5 * UNIT, bB);
  s += pinLine(bR, 1 * UNIT, outX, 1 * UNIT);
  s += pinLine(bR, 2 * UNIT, outX, 2 * UNIT);
  // Labels
  s += `<text x="${bL + 4}" y="${1 * UNIT + 1}" fill="${STROKE}" font-size="6" font-family="monospace" font-weight="600">D</text>`;
  s += `<text x="${bR - 3}" y="${1 * UNIT + 1}" fill="${STROKE}" font-size="6" font-family="monospace" font-weight="600" text-anchor="end">Q</text>`;
  const qbY = 2 * UNIT;
  s += `<text x="${bR - 3}" y="${qbY + 1}" fill="${STROKE}" font-size="6" font-family="monospace" font-weight="600" text-anchor="end">Q</text>`;
  s += `<line x1="${bR - 10}" y1="${qbY - 4}" x2="${bR - 3}" y2="${qbY - 4}" stroke="${STROKE}" stroke-width="0.8"/>`;
  s += `<text x="${2.5 * UNIT}" y="${bT + 7}" fill="${STROKE}" font-size="5" font-family="monospace" font-weight="600" text-anchor="middle">S</text>`;
  s += `<text x="${2.5 * UNIT}" y="${bB - 3}" fill="${STROKE}" font-size="5" font-family="monospace" font-weight="600" text-anchor="middle">R</text>`;
  s += `</svg>`;
  return s;
}

// ──────────────────────────── Clock Generator ────────────────────────────
// Output: OUT
const CLK_W = 4 * UNIT;
const CLK_H = 2 * UNIT;
const CLK_PINS: PinInfo[] = [
  { name: "OUT", x: 4 * UNIT, y: 1 * UNIT, number: 1, signals: [] },
];
function clkSvg(): string {
  const cy = 1 * UNIT;
  const bL = 0.5 * UNIT;
  const bR = 3 * UNIT;
  const bT = 0.3 * UNIT;
  const bB = 1.7 * UNIT;
  const outX = 4 * UNIT;
  let s = `<svg width="${CLK_W}" height="${CLK_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  // Box
  s += `<rect x="${bL}" y="${bT}" width="${bR - bL}" height="${bB - bT}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" rx="1"/>`;
  // Clock waveform inside
  const wL = bL + 3;
  const wR = bR - 3;
  const wT = bT + 3;
  const wB = bB - 3;
  const wMid = (wL + wR) / 2;
  const q1 = wL + (wMid - wL) / 2;
  const q3 = wMid + (wR - wMid) / 2;
  s += `<polyline points="${wL},${wB} ${wL},${wT} ${q1},${wT} ${q1},${wB} ${wMid},${wB} ${wMid},${wT} ${q3},${wT} ${q3},${wB} ${wR},${wB}" fill="none" stroke="${STROKE}" stroke-width="1" stroke-linejoin="round"/>`;
  // Output
  s += pinLine(bR, cy, outX, cy);
  s += `</svg>`;
  return s;
}

// ──────────────────────────── Junction ────────────────────────────
// Single pin "J" — a small dot used as a wire junction
const JUNC_SIZE = 1 * UNIT;
const JUNC_PINS: PinInfo[] = [
  { name: "J", x: 0, y: 0, number: 1, signals: [] },
];
function juncSvg(): string {
  return `<svg width="${JUNC_SIZE}" height="${JUNC_SIZE}" style="overflow:visible;display:block" xmlns="http://www.w3.org/2000/svg">
    <circle cx="0" cy="0" r="3" fill="#4ade80"/>
  </svg>`;
}

// ──────────────────────────── GND symbol ────────────────────────────
const GND_W = 2 * UNIT;
const GND_H = 2 * UNIT;
const GND_PINS: PinInfo[] = [
  { name: "GND", x: 1 * UNIT, y: 0, number: 1, signals: [{ type: "power", signal: "GND" }] },
];
function gndSvg(): string {
  const cx = 1 * UNIT;
  const topY = 0;
  const barY = 0.8 * UNIT;
  let s = `<svg width="${GND_W}" height="${GND_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  s += `<line x1="${cx}" y1="${topY}" x2="${cx}" y2="${barY}" stroke="${PIN_COLOR}" stroke-width="1"/>`;
  s += `<line x1="${cx - 8}" y1="${barY}" x2="${cx + 8}" y2="${barY}" stroke="${STROKE}" stroke-width="${STROKE_W}"/>`;
  s += `<line x1="${cx - 5}" y1="${barY + 4}" x2="${cx + 5}" y2="${barY + 4}" stroke="${STROKE}" stroke-width="${STROKE_W}"/>`;
  s += `<line x1="${cx - 2}" y1="${barY + 8}" x2="${cx + 2}" y2="${barY + 8}" stroke="${STROKE}" stroke-width="${STROKE_W}"/>`;
  s += `</svg>`;
  return s;
}

// ──────────────────────────── VCC symbol ────────────────────────────
const VCC_W = 2 * UNIT;
const VCC_H = 2 * UNIT;
const VCC_PINS: PinInfo[] = [
  { name: "VCC", x: 1 * UNIT, y: 2 * UNIT, number: 1, signals: [{ type: "power", signal: "VCC" }] },
];
function vccSvg(): string {
  const cx = 1 * UNIT;
  const botY = 2 * UNIT;
  const barY = 1.2 * UNIT;
  let s = `<svg width="${VCC_W}" height="${VCC_H}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
  s += `<line x1="${cx}" y1="${botY}" x2="${cx}" y2="${barY}" stroke="${PIN_COLOR}" stroke-width="1"/>`;
  s += `<line x1="${cx - 8}" y1="${barY}" x2="${cx + 8}" y2="${barY}" stroke="#ef4444" stroke-width="${STROKE_W}"/>`;
  s += `<text x="${cx}" y="${barY - 3}" fill="#ef4444" font-size="6" font-family="monospace" font-weight="600" text-anchor="middle">VCC</text>`;
  s += `</svg>`;
  return s;
}

// ──────────────────────────── Registration ────────────────────────────

interface GateDef {
  tag: string;
  pins: PinInfo[];
  svgFn: () => string;
  width: number;
  height: number;
}

const GATE_DEFS: GateDef[] = [
  { tag: "wokwi-gate-not",       pins: NOT_PINS,   svgFn: notSvg,   width: NOT_W,   height: NOT_H },
  { tag: "wokwi-gate-and-2",     pins: AND_PINS,   svgFn: andSvg,   width: GATE2_W, height: GATE2_H },
  { tag: "wokwi-gate-or-2",      pins: OR_PINS,    svgFn: orSvg,    width: GATE2_W, height: GATE2_H },
  { tag: "wokwi-gate-xor-2",     pins: XOR_PINS,   svgFn: xorSvg,   width: GATE2_W, height: GATE2_H },
  { tag: "wokwi-gate-nand-2",    pins: NAND_PINS,  svgFn: nandSvg,  width: GATE2_W, height: GATE2_H },
  { tag: "wokwi-gate-nor-2",     pins: NOR_PINS,   svgFn: norSvg,   width: GATE2_W, height: GATE2_H },
  { tag: "wokwi-gate-xnor-2",    pins: XNOR_PINS,  svgFn: xnorSvg,  width: GATE2_W, height: GATE2_H },
  { tag: "wokwi-mux-2",          pins: MUX_PINS,   svgFn: muxSvg,   width: MUX_W,   height: MUX_H },
  { tag: "wokwi-flip-flop-d",    pins: FFD_PINS,   svgFn: ffdSvg,   width: FF_W,    height: FF_H },
  { tag: "wokwi-flip-flop-dr",   pins: FFDR_PINS,  svgFn: ffdrSvg,  width: FFDR_W,  height: FFDR_H },
  { tag: "wokwi-flip-flop-dsr",  pins: FFDSR_PINS, svgFn: ffdsrSvg, width: FFDSR_W, height: FFDSR_H },
  { tag: "wokwi-clock-generator", pins: CLK_PINS,  svgFn: clkSvg,   width: CLK_W,   height: CLK_H },
  { tag: "wokwi-junction",        pins: JUNC_PINS, svgFn: juncSvg,  width: JUNC_SIZE, height: JUNC_SIZE },
  { tag: "wokwi-gnd",             pins: GND_PINS,  svgFn: gndSvg,   width: GND_W,   height: GND_H },
  { tag: "wokwi-vcc",             pins: VCC_PINS,  svgFn: vccSvg,   width: VCC_W,   height: VCC_H },
];

// ──────────────────────────── Text element ────────────────────────────
// Free text label — reads "text" attribute, no pins
function registerTextElement() {
  const tag = "wokwi-text";
  if (customElements.get(tag)) return;

  const DEFAULT_TEXT = "(click to edit)";

  class TextElement extends HTMLElement {
    private _shadow: ShadowRoot;
    private _span: HTMLSpanElement;

    static get observedAttributes() { return ["text"]; }

    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.innerHTML = `<style>:host { display: inline-block; overflow: visible; } span { font-family: monospace; font-size: 12px; white-space: pre; } span.placeholder { color: #666; font-style: italic; } span.filled { color: #ccc; }</style><span></span>`;
      this._span = this._shadow.querySelector("span")!;
    }

    private _update() {
      const val = this.getAttribute("text") || "";
      if (val) {
        this._span.textContent = val;
        this._span.className = "filled";
      } else {
        this._span.textContent = DEFAULT_TEXT;
        this._span.className = "placeholder";
      }
    }

    connectedCallback() {
      this._update();
    }

    attributeChangedCallback() {
      this._update();
    }

    get pinInfo(): PinInfo[] { return []; }
    get chipWidth(): number {
      const val = this.getAttribute("text") || DEFAULT_TEXT;
      return Math.max(20, val.length * 7.2);
    }
    get chipHeight(): number { return 16; }
  }

  customElements.define(tag, TextElement);
}

export function registerLogicGates() {
  if (typeof window === "undefined") return;

  registerTextElement();

  for (const def of GATE_DEFS) {
    if (customElements.get(def.tag)) continue;

    const svgContent = def.svgFn();
    const pins = def.pins;
    const w = def.width;
    const h = def.height;

    const ElementClass = class extends HTMLElement {
      private _shadow: ShadowRoot;
      constructor() {
        super();
        this._shadow = this.attachShadow({ mode: "open" });
        this._shadow.innerHTML = `<style>:host { display: block; width: ${w}px; height: ${h}px; overflow: visible; line-height: 0; } svg { display: block; }</style>${svgContent}`;
      }
      get pinInfo(): PinInfo[] { return pins; }
      get chipWidth(): number { return w; }
      get chipHeight(): number { return h; }
    };

    customElements.define(def.tag, ElementClass);
  }
}
