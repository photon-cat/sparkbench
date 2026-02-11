"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { DiagramConnection } from "@/lib/diagram-parser";

const MM_PX = 3.7795275591; // 1 mm in CSS pixels (96 dpi)
function snapToGrid(v: number): number {
  return Math.round(v / MM_PX) * MM_PX;
}

const WIRE_COLORS = ["green", "blue", "red", "gold", "orange", "purple", "pink"];
let wireColorIdx = 0;

interface WireDrawingState {
  fromRef: string;
  points: { x: number; y: number }[];
}

/**
 * Build an orthogonal preview path: fixed segments + one trailing L-bend to cursor.
 */
function buildPreviewPath(
  points: { x: number; y: number }[],
  cursor: { x: number; y: number },
): string {
  if (points.length === 0) return "";

  const last = points[points.length - 1];
  const snapped = { x: snapToGrid(cursor.x), y: snapToGrid(cursor.y) };

  const dx = Math.abs(snapped.x - last.x);
  const dy = Math.abs(snapped.y - last.y);

  const mid = dx >= dy
    ? { x: snapped.x, y: last.y }
    : { x: last.x, y: snapped.y };

  const allPts = [...points, mid, snapped];
  return allPts.map((p) => `${p.x},${p.y}`).join(" ");
}

export interface UseWireDrawingOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onAddConnection?: (conn: DiagramConnection) => void;
}

export interface UseWireDrawingReturn {
  wireDrawing: WireDrawingState | null;
  cursorPos: { x: number; y: number };
  isDrawing: boolean;
  previewPath: string;
  handlePinClick: (pinRef: string, pinX: number, pinY: number) => void;
  handleCanvasClick: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
}

export function useWireDrawing({
  containerRef,
  onAddConnection,
}: UseWireDrawingOptions): UseWireDrawingReturn {
  const [wireDrawing, setWireDrawing] = useState<WireDrawingState | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const onAddConnectionRef = useRef(onAddConnection);
  onAddConnectionRef.current = onAddConnection;

  // Cancel wire drawing with Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWireDrawing(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handlePinClick = useCallback(
    (pinRef: string, pinX: number, pinY: number) => {
      if (!wireDrawing) {
        setWireDrawing({ fromRef: pinRef, points: [{ x: pinX, y: pinY }] });
        return;
      }

      const fromRef = wireDrawing.fromRef;
      if (fromRef === pinRef) return;

      const pts = wireDrawing.points;
      const hints: string[] = [];
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        if (Math.abs(dx) > 0.5) hints.push(`h${Math.round(dx)}`);
        if (Math.abs(dy) > 0.5) hints.push(`v${Math.round(dy)}`);
      }

      const color = WIRE_COLORS[wireColorIdx % WIRE_COLORS.length];
      wireColorIdx++;

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

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = snapToGrid(e.clientX - rect.left + (containerRef.current?.parentElement?.scrollLeft || 0));
      const y = snapToGrid(e.clientY - rect.top + (containerRef.current?.parentElement?.scrollTop || 0));

      const last = wireDrawing.points[wireDrawing.points.length - 1];
      const dx = Math.abs(x - last.x);
      const dy = Math.abs(y - last.y);

      const mid = dx >= dy
        ? { x, y: last.y }
        : { x: last.x, y };

      setWireDrawing((prev) => {
        if (!prev) return prev;
        return { ...prev, points: [...prev.points, mid, { x, y }] };
      });
    },
    [wireDrawing, containerRef],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!wireDrawing) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = snapToGrid(e.clientX - rect.left + (containerRef.current?.parentElement?.scrollLeft || 0));
      const y = snapToGrid(e.clientY - rect.top + (containerRef.current?.parentElement?.scrollTop || 0));

      setCursorPos({ x, y });
    },
    [wireDrawing, containerRef],
  );

  const isDrawing = wireDrawing !== null;
  const previewPath = wireDrawing ? buildPreviewPath(wireDrawing.points, cursorPos) : "";

  return {
    wireDrawing,
    cursorPos,
    isDrawing,
    previewPath,
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
  };
}
