"use client";

import { useState, useCallback, useEffect, useRef, MutableRefObject } from "react";
import type { DiagramConnection } from "@/lib/diagram-parser";
import type { ToolType } from "@/components/ToolPalette";

const UNIT_PX = 9.6; // 0.1 inch in CSS pixels (96 dpi)
function snapToGrid(v: number): number {
  return Math.round(v / UNIT_PX) * UNIT_PX;
}

const WIRE_COLORS = ["green", "blue", "red", "gold", "orange", "purple", "pink"];
let wireColorIdx = 0;

interface WireDrawingState {
  fromRef: string;
  /** Committed path points in content-space (first = start pin position) */
  points: { x: number; y: number }[];
}

/**
 * Remove consecutive duplicate points from an array.
 */
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
 * Build an L-bend from `a` to `b`: pick the longer axis first.
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
  // Bigger delta → go that axis first
  return dx >= dy
    ? [{ x: b.x, y: a.y }] // horizontal first
    : [{ x: a.x, y: b.y }]; // vertical first
}

/**
 * Build an orthogonal preview path: committed segments + one trailing L-bend to cursor.
 */
function buildPreviewPath(
  points: { x: number; y: number }[],
  cursor: { x: number; y: number },
): string {
  if (points.length === 0) return "";

  const last = points[points.length - 1];
  const snapped = { x: snapToGrid(cursor.x), y: snapToGrid(cursor.y) };
  const bend = lBend(last, snapped);
  const allPts = [...points, ...bend, snapped];
  return dedup(allPts).map((p) => `${p.x},${p.y}`).join(" ");
}

/**
 * Convert committed points array → Wokwi hints array (h/v segments).
 */
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

  // Cancel wire drawing when tool changes away from wire (but not cursor,
  // since cursor mode allows wire completion for convenience)
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

  /**
   * Handle clicking on a pin circle.
   * - If no wire in progress: start a new wire from this pin.
   * - If wire in progress: complete the wire to this pin.
   */
  const handlePinClick = useCallback(
    (pinRef: string, pinX: number, pinY: number) => {
      if (!wireDrawing) {
        // Start a new wire
        setWireDrawing({ fromRef: pinRef, points: [{ x: pinX, y: pinY }] });
        return;
      }

      // Complete wire to destination pin
      const fromRef = wireDrawing.fromRef;
      if (fromRef === pinRef) return; // Can't connect to self

      // Build the full path including final L-bend to destination
      const last = wireDrawing.points[wireDrawing.points.length - 1];
      const dest = { x: pinX, y: pinY };
      const finalBend = lBend(last, dest);
      const fullPath = [...wireDrawing.points, ...finalBend, dest];

      // Convert path to Wokwi hints (skip first point = source, skip last = destination)
      const intermediatePoints = fullPath.slice(1, -1);
      const hints = pointsToHints([wireDrawing.points[0], ...intermediatePoints]);

      const color = WIRE_COLORS[wireColorIdx % WIRE_COLORS.length];
      wireColorIdx++;

      const conn: DiagramConnection = [fromRef, pinRef, color, hints];
      onAddConnectionRef.current?.(conn);
      setWireDrawing(null);
    },
    [wireDrawing],
  );

  /**
   * Handle clicking on empty canvas during wire drawing.
   * Adds an L-bend corner at the clicked position.
   */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!wireDrawing) return;

      // Don't process pin circle clicks (they have their own handler)
      const target = e.target as HTMLElement;
      if (target.tagName === "circle") return;

      const pt = screenToContent(e);
      const x = snapToGrid(pt.x);
      const y = snapToGrid(pt.y);

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

  /**
   * Track cursor position for preview path.
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!wireDrawing) return;
      const pt = screenToContent(e);
      setCursorPos({ x: snapToGrid(pt.x), y: snapToGrid(pt.y) });
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
