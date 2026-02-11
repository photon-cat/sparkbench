export interface Point {
  x: number;
  y: number;
}

export interface PathPrimitive {
  type: "path";
  points: Point[];
  color: string;
  fill?: boolean;
  closed?: boolean;
}

export interface CirclePrimitive {
  type: "circle";
  x: number;
  y: number;
  radius: number;
  color: string;
  fill?: boolean;
}

export interface TextPrimitive {
  type: "text";
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  anchor: "start" | "middle" | "end";
  color: string;
}

export interface BoxPrimitive {
  type: "box";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fill?: boolean;
}

export type Primitive = PathPrimitive | CirclePrimitive | TextPrimitive | BoxPrimitive;

export interface Port {
  x: number;
  y: number;
  labels: string[];
}

export interface SchSymbol {
  primitives: Primitive[];
  ports: Port[];
  center: Point;
  size: { width: number; height: number };
}

export type SimTag =
  | { role: "glow"; color: string }
  | { role: "voltage-text" }
  | { role: "current-color" }
  | { role: "segment"; index: number }
  | { role: "display-area" };

export type Tool = "select" | "path" | "circle" | "text" | "box" | "port";

export interface DrawingPath {
  tool: "path";
  points: Point[];
}

export interface DrawingShape {
  tool: "circle" | "box";
  start: Point;
  current: Point;
}

export type DrawingState = DrawingPath | DrawingShape;

export interface Viewport {
  offsetX: number;
  offsetY: number;
  zoom: number;
}
