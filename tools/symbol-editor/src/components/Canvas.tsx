import React, { useRef, useCallback, useEffect, useState } from "react";
import type { EditorState, EditorAction } from "../state/editor-state";
import type { Point } from "../types";
import { Grid } from "./Grid";
import { PrimitiveRenderer } from "./PrimitiveRenderer";
import { PortRenderer } from "./PortRenderer";
import { useViewport } from "../hooks/useViewport";
import { useDrawing } from "../hooks/useDrawing";
import { screenToSymbol, hitTest, primitivesInRect } from "../utils/geometry";

interface CanvasProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  snapPoint: (p: Point) => Point;
}

export const Canvas: React.FC<CanvasProps> = ({ state, dispatch, snapPoint }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const dragRef = useRef<{ startSymPt: Point; startPrimitives: typeof state.symbol.primitives } | null>(null);
  const marqueeRef = useRef<{ start: Point; current: Point } | null>(null);
  const [marquee, setMarquee] = useState<{ start: Point; current: Point } | null>(null);

  const { viewport, activeTool, drawingState, symbol, selectedIds } = state;

  const { onWheel, startPan, movePan, endPan, isPanning } = useViewport(viewport, dispatch);
  const {
    handleCanvasClick,
    handleCanvasMove,
    handleCanvasDoubleClick,
    handleCanvasPointerUp,
    finishPath,
    cancelDrawing,
  } = useDrawing({ activeTool, drawingState, dispatch, snapPoint });

  // Track canvas size
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  const getSymbolPoint = useCallback(
    (e: React.PointerEvent | React.MouseEvent) => {
      const rect = svgRef.current!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      return screenToSymbol(
        sx,
        sy,
        size.width,
        size.height,
        viewport.offsetX,
        viewport.offsetY,
        viewport.zoom
      );
    },
    [size, viewport]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      startPan(e);
      if (e.button === 1 || e.altKey) return;
      if (e.button !== 0) return;

      const pt = getSymbolPoint(e);

      if (activeTool === "select") {
        // Check if clicking on a primitive
        const tolerance = 8 / viewport.zoom;
        for (let i = symbol.primitives.length - 1; i >= 0; i--) {
          if (hitTest(symbol.primitives[i], pt, tolerance)) {
            if (e.shiftKey) {
              const newIds = new Set(selectedIds);
              if (newIds.has(i)) newIds.delete(i);
              else newIds.add(i);
              dispatch({ type: "SELECT", ids: newIds });
            } else {
              if (!selectedIds.has(i)) {
                dispatch({ type: "SELECT", ids: new Set([i]) });
              }
              // Start drag
              dragRef.current = {
                startSymPt: pt,
                startPrimitives: [...symbol.primitives],
              };
            }
            return;
          }
        }
        // Clicked on empty space — start marquee selection
        if (!e.shiftKey) {
          dispatch({ type: "SELECT", ids: new Set() });
        }
        marqueeRef.current = { start: pt, current: pt };
        setMarquee({ start: pt, current: pt });
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // Drawing tools
      handleCanvasClick(pt, e);
    },
    [startPan, getSymbolPoint, activeTool, viewport.zoom, symbol.primitives, selectedIds, dispatch, handleCanvasClick]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (movePan(e)) return;

      const pt = getSymbolPoint(e);
      setCursorPos(snapPoint(pt));

      // Marquee selection drag
      if (marqueeRef.current) {
        marqueeRef.current.current = pt;
        setMarquee({ ...marqueeRef.current });
        return;
      }

      // Drag selected primitives
      if (dragRef.current && selectedIds.size > 0) {
        const snapped = snapPoint(pt);
        const startSnapped = snapPoint(dragRef.current.startSymPt);
        const dx = snapped.x - startSnapped.x;
        const dy = snapped.y - startSnapped.y;
        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
          // Restore original positions, then apply delta
          const prims = [...dragRef.current.startPrimitives];
          dispatch({
            type: "LOAD_SYMBOL",
            symbol: { ...symbol, primitives: prims },
            simTags: state.simTags,
          });
          dispatch({
            type: "MOVE_PRIMITIVES",
            indices: Array.from(selectedIds),
            dx,
            dy,
          });
        }
        return;
      }

      handleCanvasMove(pt);
    },
    [movePan, getSymbolPoint, snapPoint, selectedIds, handleCanvasMove, symbol, dispatch, state.simTags]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      endPan();

      // Finish marquee selection
      if (marqueeRef.current) {
        const m = marqueeRef.current;
        const rect = {
          minX: Math.min(m.start.x, m.current.x),
          minY: Math.min(m.start.y, m.current.y),
          maxX: Math.max(m.start.x, m.current.x),
          maxY: Math.max(m.start.y, m.current.y),
        };
        // Only select if the user actually dragged (not just a click)
        const w = rect.maxX - rect.minX;
        const h = rect.maxY - rect.minY;
        if (w > 2 / viewport.zoom || h > 2 / viewport.zoom) {
          const hits = primitivesInRect(symbol.primitives, rect);
          dispatch({ type: "SELECT", ids: new Set(hits) });
        }
        marqueeRef.current = null;
        setMarquee(null);
        return;
      }

      if (dragRef.current) {
        dragRef.current = null;
        return;
      }
      const pt = getSymbolPoint(e);
      handleCanvasPointerUp(pt);
    },
    [endPan, getSymbolPoint, handleCanvasPointerUp, viewport.zoom, symbol.primitives, dispatch]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      void e;
      handleCanvasDoubleClick();
    },
    [handleCanvasDoubleClick]
  );

  const handlePrimitivePointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.stopPropagation();
      if (activeTool !== "select") return;
      const pt = getSymbolPoint(e);

      if (e.shiftKey) {
        const newIds = new Set(selectedIds);
        if (newIds.has(index)) newIds.delete(index);
        else newIds.add(index);
        dispatch({ type: "SELECT", ids: newIds });
      } else {
        if (!selectedIds.has(index)) {
          dispatch({ type: "SELECT", ids: new Set([index]) });
        }
        dragRef.current = {
          startSymPt: pt,
          startPrimitives: [...symbol.primitives],
        };
      }
    },
    [activeTool, getSymbolPoint, selectedIds, dispatch, symbol.primitives]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size > 0 && activeTool === "select") {
          dispatch({ type: "REMOVE_PRIMITIVES", indices: Array.from(selectedIds) });
        }
      }
      if (e.key === "Escape") {
        cancelDrawing();
        dispatch({ type: "SELECT", ids: new Set() });
      }
      if (e.key === "Enter" && activeTool === "path") {
        finishPath();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds, activeTool, dispatch, cancelDrawing, finishPath]);

  // Compute SVG viewBox from viewport
  const vbX = viewport.offsetX - size.width / 2 / viewport.zoom;
  const vbY = viewport.offsetY - size.height / 2 / viewport.zoom;
  const vbW = size.width / viewport.zoom;
  const vbH = size.height / viewport.zoom;

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", display: "block", background: "#fafafa" }}
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      onWheel={onWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <Grid viewport={viewport} canvasWidth={size.width} canvasHeight={size.height} />

      {/* Primitives */}
      {symbol.primitives.map((prim, i) => (
        <PrimitiveRenderer
          key={i}
          primitive={prim}
          index={i}
          selected={selectedIds.has(i)}
          zoom={viewport.zoom}
          onPointerDown={handlePrimitivePointerDown}
        />
      ))}

      {/* Ports */}
      {symbol.ports.map((port, i) => (
        <PortRenderer key={`p${i}`} port={port} index={i} zoom={viewport.zoom} />
      ))}

      {/* Drawing preview */}
      {drawingState?.tool === "path" && drawingState.points.length > 0 && (
        <g>
          <polyline
            points={drawingState.points.map((p) => `${p.x},${p.y}`).join(" ")}
            stroke="#000"
            strokeWidth={0.02}
            fill="none"
            strokeDasharray={`${0.02} ${0.02}`}
          />
          {cursorPos && (
            <line
              x1={drawingState.points[drawingState.points.length - 1].x}
              y1={drawingState.points[drawingState.points.length - 1].y}
              x2={cursorPos.x}
              y2={cursorPos.y}
              stroke="#888"
              strokeWidth={0.01}
              strokeDasharray={`${0.02} ${0.02}`}
            />
          )}
          {drawingState.points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3 / viewport.zoom}
              fill="#0078ff"
            />
          ))}
        </g>
      )}

      {drawingState?.tool === "circle" && cursorPos && (
        <circle
          cx={drawingState.start.x}
          cy={drawingState.start.y}
          r={Math.sqrt(
            (cursorPos.x - drawingState.start.x) ** 2 +
              (cursorPos.y - drawingState.start.y) ** 2
          )}
          stroke="#888"
          strokeWidth={0.02}
          strokeDasharray={`${0.02} ${0.02}`}
          fill="none"
        />
      )}

      {drawingState?.tool === "box" && cursorPos && (
        <rect
          x={Math.min(drawingState.start.x, cursorPos.x)}
          y={Math.min(drawingState.start.y, cursorPos.y)}
          width={Math.abs(cursorPos.x - drawingState.start.x)}
          height={Math.abs(cursorPos.y - drawingState.start.y)}
          stroke="#888"
          strokeWidth={0.02}
          strokeDasharray={`${0.02} ${0.02}`}
          fill="none"
        />
      )}

      {/* Marquee selection box */}
      {marquee && (
        <rect
          x={Math.min(marquee.start.x, marquee.current.x)}
          y={Math.min(marquee.start.y, marquee.current.y)}
          width={Math.abs(marquee.current.x - marquee.start.x)}
          height={Math.abs(marquee.current.y - marquee.start.y)}
          fill="rgba(0,120,255,0.1)"
          stroke="rgba(0,120,255,0.6)"
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${3 / viewport.zoom} ${3 / viewport.zoom}`}
        />
      )}

      {/* Cursor crosshair */}
      {cursorPos && !isPanning.current && (
        <g opacity={0.3}>
          <line
            x1={cursorPos.x}
            y1={cursorPos.y - 5 / viewport.zoom}
            x2={cursorPos.x}
            y2={cursorPos.y + 5 / viewport.zoom}
            stroke="#0078ff"
            strokeWidth={1 / viewport.zoom}
          />
          <line
            x1={cursorPos.x - 5 / viewport.zoom}
            y1={cursorPos.y}
            x2={cursorPos.x + 5 / viewport.zoom}
            y2={cursorPos.y}
            stroke="#0078ff"
            strokeWidth={1 / viewport.zoom}
          />
        </g>
      )}

      {/* Coord display */}
      {cursorPos && (
        <text
          x={vbX + 5 / viewport.zoom}
          y={vbY + vbH - 5 / viewport.zoom}
          fontSize={12 / viewport.zoom}
          fill="#666"
          style={{ userSelect: "none" }}
        >
          {cursorPos.x.toFixed(3)}, {cursorPos.y.toFixed(3)}
        </text>
      )}
    </svg>
  );
};
