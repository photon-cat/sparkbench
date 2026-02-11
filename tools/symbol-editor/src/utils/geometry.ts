import type { Point, Primitive } from "../types";

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function primitiveBounds(p: Primitive): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  switch (p.type) {
    case "path": {
      const xs = p.points.map((pt) => pt.x);
      const ys = p.points.map((pt) => pt.y);
      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    }
    case "circle":
      return {
        minX: p.x - p.radius,
        minY: p.y - p.radius,
        maxX: p.x + p.radius,
        maxY: p.y + p.radius,
      };
    case "text":
      return { minX: p.x, minY: p.y - 0.05, maxX: p.x + 0.1, maxY: p.y + 0.05 };
    case "box":
      return { minX: p.x, minY: p.y, maxX: p.x + p.width, maxY: p.y + p.height };
  }
}

export function hitTest(p: Primitive, pt: Point, tolerance: number): boolean {
  const b = primitiveBounds(p);
  const expanded = {
    minX: b.minX - tolerance,
    minY: b.minY - tolerance,
    maxX: b.maxX + tolerance,
    maxY: b.maxY + tolerance,
  };
  return (
    pt.x >= expanded.minX &&
    pt.x <= expanded.maxX &&
    pt.y >= expanded.minY &&
    pt.y <= expanded.maxY
  );
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsIntersect(a: Rect, b: Rect): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function primitivesInRect(
  primitives: Primitive[],
  rect: Rect
): number[] {
  const result: number[] = [];
  for (let i = 0; i < primitives.length; i++) {
    const b = primitiveBounds(primitives[i]);
    if (boundsIntersect(rect, b)) {
      result.push(i);
    }
  }
  return result;
}

export function screenToSymbol(
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): Point {
  return {
    x: (screenX - canvasWidth / 2) / zoom + offsetX,
    y: (screenY - canvasHeight / 2) / zoom + offsetY,
  };
}

export function symbolToScreen(
  symX: number,
  symY: number,
  canvasWidth: number,
  canvasHeight: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): Point {
  return {
    x: (symX - offsetX) * zoom + canvasWidth / 2,
    y: (symY - offsetY) * zoom + canvasHeight / 2,
  };
}
