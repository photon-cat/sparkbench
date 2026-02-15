import { useState, useCallback, useEffect, useRef, MutableRefObject } from "react";
import type { DiagramConnection } from "../lib/diagram-types";
import { snapToGrid, getSnapMode, type SnapMode } from "../lib/constants";

export type ToolType = "cursor" | "wire";

const WIRE_COLOR_CYCLE = ["green", "blue", "red", "gold", "orange", "purple", "pink"];
let wireColorIdx = 0;

/**
 * Auto-determine wire color based on pin function per Wokwi spec:
 * GND pins → black, 5V/VCC pins → red, otherwise → cycle through colors.
 */
function autoWireColor(fromRef: string): string {
  const pin = fromRef.split(":")[1] || "";
  const pinUpper = pin.toUpperCase();
  if (pinUpper.startsWith("GND")) return "black";
  if (pinUpper === "5V" || pinUpper === "VCC" || pinUpper === "3.3V" || pinUpper === "3V3") return "red";
  const color = WIRE_COLOR_CYCLE[wireColorIdx % WIRE_COLOR_CYCLE.length];
  wireColorIdx++;
  return color;
}

interface WireDrawingState {
  fromRef: string;
  points: { x: number; y: number }[];
}

function dedup(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length === 0) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = out[out.length - 1];
    if (Math.abs(pts[i].x - prev.x) > 0.5 || Math.abs(pts[i].y - prev.y) > 0.5) {
      out.push(pts[i]);
    }
  }
  return out;
}

/**
 * Build an L-bend from `a` to `b`: horizontal-first to match Wokwi.
 * Returns 0-1 intermediate corner points.
 */
function lBend(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number }[] {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  if (dx < 0.5 && dy < 0.5) return [];
  if (dx < 0.5 || dy < 0.5) return []; // already axis-aligned
  // Vertical first (matches Wokwi wire drawing preview)
  return [{ x: a.x, y: b.y }];
}

function buildPreviewPath(
  points: { x: number; y: number }[],
  cursor: { x: number; y: number },
): string {
  if (points.length === 0) return "";

  const last = points[points.length - 1];
  const bend = lBend(last, cursor);
  const allPts = [...points, ...bend, cursor];
  return dedup(allPts).map((p) => `${p.x},${p.y}`).join(" ");
}

function pointsToHints(pts: { x: number; y: number }[]): string[] {
  const cleaned = dedup(pts);
  const hints: string[] = [];
  for (let i = 1; i < cleaned.length; i++) {
    const dx = cleaned[i].x - cleaned[i - 1].x;
    const dy = cleaned[i].y - cleaned[i - 1].y;
    if (Math.abs(dx) > 0.5) hints.push(`h${Math.round(dx)}`);
    if (Math.abs(dy) > 0.5) hints.push(`v${Math.round(dy)}`);
  }
  return hints;
}

export interface UseWireDrawingOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onAddConnection?: (conn: DiagramConnection) => void;
  zoomRef: MutableRefObject<number>;
  panRef: MutableRefObject<{ x: number; y: number }>;
  activeTool: ToolType;
}

export interface UseWireDrawingReturn {
  wireDrawing: WireDrawingState | null;
  cursorPos: { x: number; y: number };
  isDrawing: boolean;
  previewPath: string;
  handlePinClick: (pinRef: string, pinX: number, pinY: number) => void;
  handleCanvasClick: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  cancelDrawing: () => void;
}

export function useWireDrawing({
  containerRef,
  onAddConnection,
  zoomRef,
  panRef,
  activeTool,
}: UseWireDrawingOptions): UseWireDrawingReturn {
  const [wireDrawing, setWireDrawing] = useState<WireDrawingState | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const onAddConnectionRef = useRef(onAddConnection);
  onAddConnectionRef.current = onAddConnection;

  useEffect(() => {
    if (activeTool !== "wire" && activeTool !== "cursor") setWireDrawing(null);
  }, [activeTool]);

  /** Convert a mouse event to content-space coordinates */
  const screenToContent = useCallback(
    (e: React.MouseEvent): { x: number; y: number } => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const zoom = zoomRef.current;
      return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };
    },
    [containerRef, zoomRef],
  );

  const handlePinClick = useCallback(
    (pinRef: string, pinX: number, pinY: number) => {
      if (!wireDrawing) {
        setWireDrawing({ fromRef: pinRef, points: [{ x: pinX, y: pinY }] });
        return;
      }

      const fromRef = wireDrawing.fromRef;
      if (fromRef === pinRef) return;

      const last = wireDrawing.points[wireDrawing.points.length - 1];
      const dest = { x: pinX, y: pinY };
      const finalBend = lBend(last, dest);
      const fullPath = [...wireDrawing.points, ...finalBend, dest];

      const intermediatePoints = fullPath.slice(1, -1);
      const hints = pointsToHints([wireDrawing.points[0], ...intermediatePoints]);

      const color = autoWireColor(wireDrawing.fromRef);

      const conn: DiagramConnection = [fromRef, pinRef, color, hints];
      onAddConnectionRef.current?.(conn);
      setWireDrawing(null);
    },
    [wireDrawing],
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!wireDrawing) return;

      const target = e.target as HTMLElement;
      if (target.tagName === "circle") return;

      const pt = screenToContent(e);
      const mode = getSnapMode(e);
      const x = snapToGrid(pt.x, mode);
      const y = snapToGrid(pt.y, mode);

      const last = wireDrawing.points[wireDrawing.points.length - 1];
      const bend = lBend(last, { x, y });

      setWireDrawing((prev) => {
        if (!prev) return prev;
        const newPoints = dedup([...prev.points, ...bend, { x, y }]);
        return { ...prev, points: newPoints };
      });
    },
    [wireDrawing, screenToContent],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!wireDrawing) return;
      const pt = screenToContent(e);
      const mode = getSnapMode(e);
      setCursorPos({ x: snapToGrid(pt.x, mode), y: snapToGrid(pt.y, mode) });
    },
    [wireDrawing, screenToContent],
  );

  const isDrawing = wireDrawing !== null;
  const previewPath = wireDrawing ? buildPreviewPath(wireDrawing.points, cursorPos) : "";

  const cancelDrawing = useCallback(() => {
    setWireDrawing(null);
  }, []);

  return {
    wireDrawing,
    cursorPos,
    isDrawing,
    previewPath,
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
    cancelDrawing,
  };
}
