"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Diagram, DiagramPart, DiagramConnection, DiagramLabel } from "@/lib/diagram-parser";
import type { AVRRunner } from "@/lib/avr-runner";
import {
  wireComponents,
  cleanupWiring,
  WiredComponent,
} from "@/lib/wire-components";
import {
  renderWires,
  pathToHints,
  type RenderedWire,
  type PinPosition,
  type Point,
} from "@/lib/wire-renderer";
import { useWireDrawing, type ToolType } from "@/hooks/useWireDrawing";
import { useDragParts } from "@/hooks/useDragParts";
import {
  UNIT_PX,
  GRID_PX,
  ORIGIN_PX,
  RULER_SIZE,
  MIN_ZOOM,
  MAX_ZOOM,
  getSnapMode,
  snapToGrid,
  type SnapMode,
} from "@/lib/constants";
import { registerDipChips } from "./DipChip";
import { registerLogicGates } from "./LogicGates";
import SensorPanel from "./SensorPanel";

let elementsLoaded = false;
function ensureElementsLoaded(): Promise<void> {
  if (elementsLoaded) return Promise.resolve();
  elementsLoaded = true;
  return import("@wokwi/elements").then(() => {
    registerDipChips();
    registerLogicGates();
  });
}

interface ElementPin { name: string; x: number; y: number; }
interface CanvasPin { ref: string; x: number; y: number; name: string; }

function pinToCanvas(
  part: DiagramPart,
  pin: ElementPin,
  elWidth: number,
  elHeight: number,
): { x: number; y: number } {
  const θ = part.rotate ? (part.rotate * Math.PI) / 180 : 0;
  const ox = part.left + ORIGIN_PX;
  const oy = part.top + ORIGIN_PX;

  if (!θ) {
    return { x: ox + pin.x, y: oy + pin.y };
  }

  const dx = pin.x - elWidth / 2;
  const dy = pin.y - elHeight / 2;
  const cos = Math.cos(θ);
  const sin = Math.sin(θ);

  return {
    x: ox + elWidth / 2 + (dx * cos + dy * sin),
    y: oy + elHeight / 2 + (-dx * sin + dy * cos),
  };
}

// Wire color shortcut map per Wokwi spec
const WIRE_COLOR_SHORTCUTS: Record<string, string> = {
  "0": "#333", "1": "brown", "2": "red", "3": "orange", "4": "gold",
  "5": "green", "6": "blue", "7": "violet", "8": "gray", "9": "white",
  "c": "cyan", "l": "limegreen", "m": "magenta", "p": "purple", "y": "yellow",
};

export interface DiagramCanvasProps {
  diagram: Diagram | null;
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onPartMove?: (partId: string, top: number, left: number) => void;
  onAddConnection?: (conn: DiagramConnection) => void;
  onUpdateConnection?: (index: number, conn: DiagramConnection) => void;
  onDeleteConnection?: (index: number) => void;
  onWireSelect?: (connectionIndex: number | null) => void;
  onWireColorChange?: (index: number, color: string) => void;
  selectedPartId: string | null;
  onPartSelect?: (partId: string | null) => void;
  onDeletePart?: (partId: string) => void;
  onPartRotate?: (partId: string, angle: number) => void;
  onDuplicatePart?: (partId: string) => void;
  placingPartId?: string | null;
  onFinishPlacing?: () => void;
  showGrid: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  runner: AVRRunner | null;
  mcuId?: string;
  simRunning?: boolean;
}

export default function DiagramCanvas({
  diagram,
  activeTool,
  onToolChange,
  onPartMove,
  onAddConnection,
  onUpdateConnection,
  onDeleteConnection,
  onWireSelect,
  selectedPartId,
  onPartSelect,
  onDeletePart,
  onPartRotate,
  onDuplicatePart,
  placingPartId,
  onFinishPlacing,
  showGrid,
  onWireColorChange,
  onZoomIn,
  onZoomOut,
  runner,
  mcuId,
  simRunning,
}: DiagramCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const wiredRef = useRef<Map<string, WiredComponent>>(new Map());
  const [sensorEntries, setSensorEntries] = useState<{ id: string; type: string; wc: WiredComponent }[]>([]);
  const [ready, setReady] = useState(false);
  const [wires, setWires] = useState<RenderedWire[]>([]);
  const [allPins, setAllPins] = useState<CanvasPin[]>([]);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(ORIGIN_PX - 100);
  const [panY, setPanY] = useState(ORIGIN_PX - 50);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panStateRef = useRef({ x: panX, y: panY });
  panStateRef.current = { x: panX, y: panY };

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  const lockedRef = useRef(false);
  lockedRef.current = !!simRunning;

  const placingPartIdRef = useRef<string | null>(null);
  placingPartIdRef.current = placingPartId ?? null;
  const onFinishPlacingRef = useRef(onFinishPlacing);
  onFinishPlacingRef.current = onFinishPlacing;

  const {
    wireDrawing,
    isDrawing,
    previewPath,
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
    cancelDrawing,
  } = useWireDrawing({ containerRef, onAddConnection, zoomRef, panRef: panStateRef, activeTool });

  const isDrawingRef = useRef(false);
  isDrawingRef.current = isDrawing;

  // Wire selection & handle dragging
  const [selectedWireIdx, setSelectedWireIdx] = useState<number | null>(null);
  const dragStateRef = useRef<{
    wireIdx: number;
    segIdx: number;
    axis: "h" | "v";
    origPoints: Point[];
    startContent: { x: number; y: number };
  } | null>(null);
  const [dragPreviewPoints, setDragPreviewPoints] = useState<Point[] | null>(null);
  const dragPreviewRef = useRef<Point[] | null>(null);
  const onUpdateConnectionRef = useRef(onUpdateConnection);
  onUpdateConnectionRef.current = onUpdateConnection;

  const handlePartMove = useCallback(
    (partId: string, top: number, left: number) => {
      onPartMove?.(partId, top - ORIGIN_PX, left - ORIGIN_PX);
    },
    [onPartMove],
  );
  const handlePartSelectFromDrag = useCallback(
    (partId: string) => {
      onPartSelect?.(partId);
      setSelectedWireIdx(null);
    },
    [onPartSelect],
  );
  // Live-update wires while dragging a part (reads DOM positions)
  const dragRafRef = useRef(0);
  const computePinsRef = useRef<((diag: Diagram) => boolean) | null>(null);
  const handlePartDrag = useCallback(() => {
    if (dragRafRef.current) return; // throttle to one per frame
    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = 0;
      if (diagram) computePinsRef.current?.(diagram);
    });
  }, [diagram]);
  const { attachDragHandlers } = useDragParts({ onPartMove: handlePartMove, onPartSelect: handlePartSelectFromDrag, onPartDrag: handlePartDrag, zoomRef, lockedRef });

  // Wire handle drag helpers
  const screenToContentForHandle = useCallback((clientX: number, clientY: number) => {
    const vp = viewportRef.current;
    if (!vp) return { x: 0, y: 0 };
    const rect = vp.getBoundingClientRect();
    const sx = clientX - rect.left - RULER_SIZE;
    const sy = clientY - rect.top - RULER_SIZE;
    const z = zoomRef.current;
    return {
      x: sx / z + panStateRef.current.x,
      y: sy / z + panStateRef.current.y,
    };
  }, []);

  const splitSegment = useCallback((points: Point[], segIdx: number, offset: number, mode: SnapMode = "normal"): Point[] => {
    const p0 = points[segIdx];
    const p1 = points[segIdx + 1];
    const dx = Math.abs(p1.x - p0.x);
    const dy = Math.abs(p1.y - p0.y);
    const isHorizontal = dx > dy;

    // Snap the absolute target position to grid, then derive offset
    let snappedOffset: number;
    if (isHorizontal) {
      const targetY = snapToGrid(p0.y + offset, mode);
      snappedOffset = targetY - p0.y;
    } else {
      const targetX = snapToGrid(p0.x + offset, mode);
      snappedOffset = targetX - p0.x;
    }
    if (Math.abs(snappedOffset) < 0.5) return points;

    const before = points.slice(0, segIdx + 1);
    const after = points.slice(segIdx + 1);

    if (isHorizontal) {
      before.push({ x: p0.x, y: p0.y + snappedOffset });
      after.unshift({ x: p1.x, y: p1.y + snappedOffset });
    } else {
      before.push({ x: p0.x + snappedOffset, y: p0.y });
      after.unshift({ x: p1.x + snappedOffset, y: p1.y });
    }

    return [...before, ...after];
  }, []);

  const handleHandlePointerDown = useCallback((e: React.PointerEvent, wireIdx: number, segIdx: number) => {
    e.stopPropagation();
    e.preventDefault();
    const wire = wires[wireIdx];
    if (!wire) return;

    const p0 = wire.points[segIdx];
    const p1 = wire.points[segIdx + 1];
    const dx = Math.abs(p1.x - p0.x);
    const dy = Math.abs(p1.y - p0.y);
    const axis: "h" | "v" = dx > dy ? "h" : "v";

    const contentPos = screenToContentForHandle(e.clientX, e.clientY);
    dragStateRef.current = {
      wireIdx,
      segIdx,
      axis,
      origPoints: [...wire.points],
      startContent: contentPos,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [wires, screenToContentForHandle]);

  const handleHandlePointerMove = useCallback((e: React.PointerEvent) => {
    const ds = dragStateRef.current;
    if (!ds) return;
    const contentPos = screenToContentForHandle(e.clientX, e.clientY);
    const mode = getSnapMode(e);

    const offset = ds.axis === "h"
      ? contentPos.y - ds.startContent.y
      : contentPos.x - ds.startContent.x;

    const newPoints = splitSegment(ds.origPoints, ds.segIdx, offset, mode);
    dragPreviewRef.current = newPoints;
    setDragPreviewPoints(newPoints);
  }, [screenToContentForHandle, splitSegment]);

  const handleHandlePointerUp = useCallback(() => {
    const ds = dragStateRef.current;
    const preview = dragPreviewRef.current;
    if (!ds || !preview) {
      dragStateRef.current = null;
      dragPreviewRef.current = null;
      setDragPreviewPoints(null);
      return;
    }

    const wire = wires[ds.wireIdx];
    if (wire && diagram) {
      const conn = diagram.connections[wire.connectionIndex];
      if (conn) {
        const hints = pathToHints(preview);
        const newConn: DiagramConnection = [conn[0], conn[1], conn[2], hints];
        onUpdateConnectionRef.current?.(wire.connectionIndex, newConn);
      }
    }

    dragStateRef.current = null;
    dragPreviewRef.current = null;
    setDragPreviewPoints(null);
  }, [wires, diagram]);

  useEffect(() => {
    if (isDrawing) setSelectedWireIdx(null);
  }, [isDrawing]);

  useEffect(() => {
    if (selectedWireIdx !== null) {
      const wire = wires[selectedWireIdx];
      onWireSelect?.(wire ? wire.connectionIndex : null);
    } else {
      onWireSelect?.(null);
    }
  }, [selectedWireIdx, wires, onWireSelect]);

  // Placement mode: part follows cursor, snapping anchor pin to grid
  const handlePlacementMove = useCallback((e: React.PointerEvent) => {
    const pid = placingPartIdRef.current;
    if (pid && containerRef.current && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left - RULER_SIZE;
      const sy = e.clientY - rect.top - RULER_SIZE;
      const z = zoomRef.current;
      const contentX = sx / z + panStateRef.current.x;
      const contentY = sy / z + panStateRef.current.y;

      const wrapper = containerRef.current.querySelector(`[data-part-id="${pid}"]`) as HTMLElement | null;
      if (wrapper) {
        // Use first pin as snap anchor so pins land on grid points
        const el = wrapper.firstElementChild as any;
        const pins = el?.pinInfo;
        const pinOx = pins?.[0]?.x ?? 0;
        const pinOy = pins?.[0]?.y ?? 0;

        const mode = getSnapMode(e);
        const step = mode === "none" ? 0 : (mode === "fine" ? UNIT_PX / 2 : UNIT_PX);
        let snapX: number, snapY: number;
        if (step === 0) {
          snapX = contentX;
          snapY = contentY;
        } else {
          // Snap so that (partPos + pinOffset) is on grid
          snapX = Math.round((contentX + pinOx) / step) * step - pinOx;
          snapY = Math.round((contentY + pinOy) / step) * step - pinOy;
        }

        wrapper.style.top = `${snapY}px`;
        wrapper.style.left = `${snapX}px`;
        wrapper.style.opacity = "0.7";
      }
    }
  }, []);

  const prevPartsKeyRef = useRef<string>("");

  // Pan drag state
  const panDragRef = useRef<{
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    pointerId: number;
    target: HTMLElement;
  } | null>(null);

  useEffect(() => {
    ensureElementsLoaded().then(() => setReady(true));
  }, []);

  // Ref for wire color change
  const onWireColorChangeRef = useRef(onWireColorChange);
  onWireColorChangeRef.current = onWireColorChange;

  // Helper: apply zoom centered on viewport center
  const applyZoomStep = useCallback((factor: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const mx = (rect.width - RULER_SIZE) / 2;
    const my = (rect.height - RULER_SIZE) / 2;
    const oldZoom = zoomRef.current;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * factor));
    const contentX = mx / oldZoom + panStateRef.current.x;
    const contentY = my / oldZoom + panStateRef.current.y;
    const newPanX = contentX - mx / newZoom;
    const newPanY = contentY - my / newZoom;
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
    zoomRef.current = newZoom;
    panStateRef.current = { x: newPanX, y: newPanY };
  }, []);

  // Fit to window: compute bounding box of all parts and zoom to fit
  const fitToWindow = useCallback(() => {
    if (!diagram || diagram.parts.length === 0 || !viewportRef.current) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const part of diagram.parts) {
      const el = elementsRef.current.get(part.id);
      const w = el ? (el.offsetWidth || 120) : 120;
      const h = el ? (el.offsetHeight || 80) : 80;
      const px = part.left + ORIGIN_PX;
      const py = part.top + ORIGIN_PX;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px + w);
      maxY = Math.max(maxY, py + h);
    }
    const padding = 60;
    minX -= padding; minY -= padding; maxX += padding; maxY += padding;
    const rect = viewportRef.current.getBoundingClientRect();
    const vpW = rect.width - RULER_SIZE;
    const vpH = rect.height - RULER_SIZE;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(vpW / contentW, vpH / contentH)));
    const newPanX = minX - (vpW / newZoom - contentW) / 2;
    const newPanY = minY - (vpH / newZoom - contentH) / 2;
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
    zoomRef.current = newZoom;
    panStateRef.current = { x: newPanX, y: newPanY };
  }, [diagram]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (el.isContentEditable || el.closest(".monaco-editor")) return;

      // Wire color shortcuts (work when wire is selected or while drawing)
      const colorKey = e.key.toLowerCase();
      if (WIRE_COLOR_SHORTCUTS[colorKey] && !e.ctrlKey && !e.metaKey) {
        const color = WIRE_COLOR_SHORTCUTS[colorKey];
        if (selectedWireIdx !== null) {
          const wire = wires[selectedWireIdx];
          if (wire) onWireColorChangeRef.current?.(wire.connectionIndex, color);
          return;
        }
      }

      // Block editing shortcuts while simulation is running (allow zoom/fit/escape)
      const locked = lockedRef.current;

      if ((e.key === "w" || e.key === "W") && !locked) {
        onToolChange("wire");
      } else if (e.key === "Escape") {
        if (placingPartIdRef.current) {
          onDeletePart?.(placingPartIdRef.current);
          onFinishPlacingRef.current?.();
          onToolChange("cursor");
        } else if (isDrawing) {
          cancelDrawing();
        } else {
          onPartSelect?.(null);
          setSelectedWireIdx(null);
          onToolChange("cursor");
        }
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedPartId && !locked) {
        e.preventDefault();
        onDeletePart?.(selectedPartId);
        onPartSelect?.(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedWireIdx !== null && !locked) {
        e.preventDefault();
        const wire = wires[selectedWireIdx];
        if (wire) onDeleteConnection?.(wire.connectionIndex);
        setSelectedWireIdx(null);
      } else if ((e.key === "r" || e.key === "R") && selectedPartId && !e.ctrlKey && !e.metaKey && !locked) {
        e.preventDefault();
        onPartRotate?.(selectedPartId, 90);
      } else if ((e.key === "d" || e.key === "D") && selectedPartId && !e.ctrlKey && !e.metaKey && !locked) {
        e.preventDefault();
        onDuplicatePart?.(selectedPartId);
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        applyZoomStep(1.15);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        applyZoomStep(1 / 1.15);
      } else if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        fitToWindow();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onToolChange, selectedPartId, onDeletePart, onPartSelect, onPartRotate, onDuplicatePart, isDrawing, cancelDrawing, selectedWireIdx, wires, onDeleteConnection, applyZoomStep, fitToWindow]);

  // Zoom with scroll wheel
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const mx = e.clientX - rect.left - RULER_SIZE;
      const my = e.clientY - rect.top - RULER_SIZE;
      if (mx < 0 || my < 0) return;

      const oldZoom = zoomRef.current;
      const factor = e.deltaY < 0 ? 1.07 : 1 / 1.07;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * factor));

      const contentX = mx / oldZoom + panStateRef.current.x;
      const contentY = my / oldZoom + panStateRef.current.y;
      const newPanX = contentX - mx / newZoom;
      const newPanY = contentY - my / newZoom;

      setZoom(newZoom);
      setPanX(newPanX);
      setPanY(newPanY);
      zoomRef.current = newZoom;
      panStateRef.current = { x: newPanX, y: newPanY };
    };

    vp.addEventListener("wheel", handleWheel, { passive: false });
    return () => vp.removeEventListener("wheel", handleWheel);
  }, []);

  // Pan handler
  const handlePanStart = useCallback((e: React.PointerEvent) => {
    if (placingPartIdRef.current) return;
    if (e.button === 1) {
      e.preventDefault();
    } else if (e.button === 0) {
      if (isDrawingRef.current) return;
      if (activeToolRef.current !== "cursor") return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-part-id]")) return;
      if (target.tagName === "circle" || target.tagName === "polyline" || target.tagName === "rect") return;
    } else {
      return;
    }

    panDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origPanX: panStateRef.current.x,
      origPanY: panStateRef.current.y,
      pointerId: e.pointerId,
      target: e.currentTarget as HTMLElement,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const handlePanMove = useCallback((e: React.PointerEvent) => {
    if (!panDragRef.current) return;
    const z = zoomRef.current;
    const dx = e.clientX - panDragRef.current.startX;
    const dy = e.clientY - panDragRef.current.startY;
    const newPanX = panDragRef.current.origPanX - dx / z;
    const newPanY = panDragRef.current.origPanY - dy / z;
    setPanX(newPanX);
    setPanY(newPanY);
    panStateRef.current = { x: newPanX, y: newPanY };
  }, []);

  const handlePanEnd = useCallback((_e: React.PointerEvent) => {
    if (!panDragRef.current) return;
    panDragRef.current.target.releasePointerCapture(panDragRef.current.pointerId);
    panDragRef.current = null;
  }, []);

  // Pin click dispatch — find the closest pin to the click point
  const handlePinClickDispatch = useCallback(
    (clickX: number, clickY: number) => {
      if (lockedRef.current) return;
      let bestDist = Infinity;
      let bestPin: CanvasPin | null = null;
      for (const pin of allPins) {
        const dx = pin.x - clickX;
        const dy = pin.y - clickY;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          bestPin = pin;
        }
      }
      if (bestPin && bestDist < 15 * 15) {
        handlePinClick(bestPin.ref, bestPin.x, bestPin.y);
      }
    },
    [handlePinClick, allPins],
  );

  // Compute pins & wires
  const computePinsAndWires = useCallback((diag: Diagram): boolean => {
    const pinPositions = new Map<string, PinPosition>();
    const pinList: CanvasPin[] = [];
    let elementsWithPins = 0;

    for (const part of diag.parts) {
      const el = elementsRef.current.get(part.id);
      if (!el) continue;
      const pins: ElementPin[] = (el as any).pinInfo;
      if (!pins || pins.length === 0) continue;
      elementsWithPins++;
      // Use wrapper div dimensions (matches CSS rotation center)
      const wrapper = el.parentElement;
      const w = (el as any).chipWidth ?? wrapper?.offsetWidth ?? el.offsetWidth ?? 0;
      const h = (el as any).chipHeight ?? wrapper?.offsetHeight ?? el.offsetHeight ?? 0;
      // Read actual DOM position for pin calculation — the wrapper may have
      // been moved by drag before the diagram state has caught up.
      const domTop = wrapper ? parseFloat(wrapper.style.top) || 0 : part.top + ORIGIN_PX;
      const domLeft = wrapper ? parseFloat(wrapper.style.left) || 0 : part.left + ORIGIN_PX;
      const livePart = { ...part, top: domTop - ORIGIN_PX, left: domLeft - ORIGIN_PX };
      for (const pin of pins) {
        const pos = pinToCanvas(livePart, pin, w, h);
        const ref = `${part.id}:${pin.name}`;
        pinPositions.set(ref, pos);
        pinList.push({ ref, x: pos.x, y: pos.y, name: pin.name });
      }
    }
    if (elementsWithPins < diag.parts.length / 2) return false;
    setWires(renderWires(diag.connections, pinPositions));
    setAllPins(pinList);
    return true;
  }, []);
  computePinsRef.current = computePinsAndWires;

  // Create DOM elements for parts
  useEffect(() => {
    if (!ready || !diagram || !containerRef.current) return;
    const container = containerRef.current;

    const partsKey = diagram.parts.map((p) => `${p.id}|${p.type}`).join(",");
    const isPositionOnly = prevPartsKeyRef.current === partsKey && prevPartsKeyRef.current !== "";
    prevPartsKeyRef.current = partsKey;

    if (isPositionOnly) {
      for (const part of diagram.parts) {
        const wrapper = container.querySelector(`[data-part-id="${part.id}"]`) as HTMLElement | null;
        if (wrapper) {
          wrapper.style.top = `${part.top + ORIGIN_PX}px`;
          wrapper.style.left = `${part.left + ORIGIN_PX}px`;
          wrapper.style.transform = part.rotate ? `rotate(${part.rotate}deg)` : "";
        }
        const el = elementsRef.current.get(part.id);
        if (el) {
          for (const [key, value] of Object.entries(part.attrs || {})) {
            if (value === "" || value === undefined) {
              el.removeAttribute(key);
            } else if (el.getAttribute(key) !== value) {
              el.setAttribute(key, value);
            }
          }
        }
      }
      let attempt = 0;
      const tryCompute = () => {
        attempt++;
        if (!computePinsAndWires(diagram) && attempt < 5) setTimeout(tryCompute, attempt * 200);
      };
      tryCompute();
      return;
    }

    const existing = container.querySelectorAll("[data-part-id]");
    existing.forEach((el) => el.remove());
    elementsRef.current.clear();

    for (const part of diagram.parts) {
      const wrapper = document.createElement("div");
      wrapper.style.position = "absolute";
      wrapper.style.top = `${part.top + ORIGIN_PX}px`;
      wrapper.style.left = `${part.left + ORIGIN_PX}px`;
      wrapper.style.zIndex = "1";
      if (part.rotate) wrapper.style.transform = `rotate(${part.rotate}deg)`;
      wrapper.dataset.partId = part.id;
      attachDragHandlers(wrapper, part.id);

      const el = document.createElement(part.type);
      for (const [key, value] of Object.entries(part.attrs || {})) el.setAttribute(key, value);
      wrapper.appendChild(el);
      container.appendChild(wrapper);
      elementsRef.current.set(part.id, el);
    }

    let attempt = 0;
    const tryCompute = () => {
      attempt++;
      if (!computePinsAndWires(diagram) && attempt < 5) setTimeout(tryCompute, attempt * 200);
    };
    setTimeout(tryCompute, 400);
  }, [ready, diagram, attachDragHandlers, computePinsAndWires]);

  // --- Wire components to runner ---
  useEffect(() => {
    if (!runner || !diagram || elementsRef.current.size === 0) return;
    cleanupWiring(wiredRef.current);
    const wired = wireComponents(runner, diagram, mcuId);
    wiredRef.current = wired;

    // Collect sensor parts for SensorPanel
    const sensors: { id: string; type: string; wc: WiredComponent }[] = [];
    for (const [id, wc] of wired) {
      if (wc.part.type === "wokwi-dht22" || wc.part.type === "wokwi-mpu6050") {
        sensors.push({ id, type: wc.part.type, wc });
      }
    }
    setSensorEntries(sensors);

    for (const [id, wc] of wired) {
      const el = elementsRef.current.get(id);
      if (!el) continue;
      if (wc.part.type === "wokwi-led") wc.onStateChange = (high) => { (el as any).value = high; };
      else if (wc.part.type === "wokwi-buzzer") wc.onStateChange = (high) => { (el as any).hasSignal = high; };
      else if (wc.part.type === "wokwi-arduino-uno") (el as any).ledPower = true;
      else if (wc.part.type === "wokwi-servo") {
        wc.onAngleChange = (angle) => { (el as any).angle = angle; };
      } else if (wc.part.type === "wokwi-7segment") {
        wc.onSegmentChange = (values) => { (el as any).values = values; };
      }
      if (wc.ssd1306) {
        wc.ssd1306.onFrameReady = (imageData) => {
          (el as any).imageData = imageData;
          (el as any).redraw?.();
        };
      }
    }

    for (const [id, wc] of wired) {
      if (wc.part.type !== "wokwi-pushbutton") continue;
      const el = elementsRef.current.get(id);
      if (!el) continue;
      const onPress = () => wc.setPressed?.(true);
      const onRelease = () => wc.setPressed?.(false);
      el.addEventListener("button-press", onPress);
      el.addEventListener("button-release", onRelease);
      const wrapper = el.parentElement;
      if (wrapper) {
        wrapper.addEventListener("pointerdown", onPress);
        wrapper.addEventListener("pointerup", onRelease);
        wrapper.addEventListener("pointerleave", onRelease);
      }
    }

    // Slide switch toggle handling
    for (const [id, wc] of wired) {
      if (wc.part.type !== "wokwi-slide-switch" || !wc.setState) continue;
      const el = elementsRef.current.get(id);
      if (!el) continue;
      let toggled = false;
      const onClick = (e: Event) => {
        e.stopPropagation();
        toggled = !toggled;
        (el as any).value = toggled ? 1 : 0;
        wc.setState!(toggled);
      };
      const wrapper = el.parentElement;
      if (wrapper) {
        wrapper.addEventListener("click", onClick);
        wrapper.style.cursor = "pointer";
      }
    }

    // Potentiometer input handling
    for (const [id, wc] of wired) {
      if ((wc.part.type !== "wokwi-potentiometer" && wc.part.type !== "wokwi-slide-potentiometer") || !wc.setValue) continue;
      const el = elementsRef.current.get(id);
      if (!el) continue;
      const onInput = () => {
        wc.setValue!(Math.round((el as any).value));
      };
      el.addEventListener("input", onInput);
    }

    // Rotary encoder handling
    for (const [id, wc] of wired) {
      if (wc.part.type !== "wokwi-ky-040") continue;
      const el = elementsRef.current.get(id);
      if (!el) continue;
      el.addEventListener("rotate-cw", () => wc.stepCW?.());
      el.addEventListener("rotate-ccw", () => wc.stepCCW?.());
      el.addEventListener("button-press", () => wc.pressEncoderButton?.());
      el.addEventListener("button-release", () => wc.releaseEncoderButton?.());
    }

    const keyMap = new Map<string, WiredComponent>();
    for (const [, wc] of wired) {
      if (wc.part.type !== "wokwi-pushbutton") continue;
      const key = wc.part.attrs.key;
      if (key) keyMap.set(key, wc);
    }
    const inEditor = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable || !!el.closest(".monaco-editor");
    };
    const handleKeyDown = (e: KeyboardEvent) => { if (inEditor(e)) return; const wc = keyMap.get(e.key); if (wc) wc.setPressed?.(true); };
    const handleKeyUp = (e: KeyboardEvent) => { if (inEditor(e)) return; const wc = keyMap.get(e.key); if (wc) wc.setPressed?.(false); };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      // Reset visual state of all wired components
      for (const [id, wc] of wiredRef.current) {
        const el = elementsRef.current.get(id);
        if (!el) continue;
        if (wc.part.type === "wokwi-led") (el as any).value = false;
        else if (wc.part.type === "wokwi-buzzer") (el as any).hasSignal = false;
        else if (wc.part.type === "wokwi-arduino-uno") (el as any).ledPower = false;
        else if (wc.part.type === "wokwi-slide-switch") (el as any).value = 0;
      }
      cleanupWiring(wiredRef.current);
      setSensorEntries([]);
    };
  }, [runner, diagram]);

  // Clean up placement opacity
  useEffect(() => {
    if (placingPartId || !containerRef.current) return;
    const wrappers = containerRef.current.querySelectorAll("[data-part-id]");
    wrappers.forEach((el) => {
      (el as HTMLElement).style.opacity = "";
    });
  }, [placingPartId]);

  // Selection highlight
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const wrappers = container.querySelectorAll("[data-part-id]");
    wrappers.forEach((el) => {
      const wrapper = el as HTMLElement;
      if (wrapper.dataset.partId === selectedPartId) {
        wrapper.style.outline = "2px solid #2563eb";
        wrapper.style.outlineOffset = "2px";
        wrapper.style.borderRadius = "4px";
      } else {
        wrapper.style.outline = "";
        wrapper.style.outlineOffset = "";
        wrapper.style.borderRadius = "";
      }
    });
  }, [selectedPartId, diagram]);

  // Highlighted wires
  const highlightedWireIndices = new Set<number>();
  if (hoveredPin) {
    wires.forEach((wire, i) => {
      if (wire.fromRef === hoveredPin || wire.toRef === hoveredPin) highlightedWireIndices.add(i);
    });
  }

  // Compute visible ruler ticks
  const GRID_HALF = 1000;
  const vpW = viewportRef.current?.clientWidth ?? 800;
  const vpH = viewportRef.current?.clientHeight ?? 600;
  const innerW = vpW - RULER_SIZE;
  const innerH = vpH - RULER_SIZE;

  const visMinX = Math.max(-GRID_HALF, Math.floor((panX - ORIGIN_PX) / UNIT_PX));
  const visMaxX = Math.min(GRID_HALF, Math.ceil(((panX + innerW / zoom) - ORIGIN_PX) / UNIT_PX));
  const visMinY = Math.max(-GRID_HALF, Math.floor((panY - ORIGIN_PX) / UNIT_PX));
  const visMaxY = Math.min(GRID_HALF, Math.ceil(((panY + innerH / zoom) - ORIGIN_PX) / UNIT_PX));

  const pixelsPerUnit = UNIT_PX * zoom;
  const smallTickStep = pixelsPerUnit >= 4 ? 1 : pixelsPerUnit >= 2 ? 5 : 10;

  const xTicks: { u: number; big: boolean }[] = [];
  const startX = Math.floor(visMinX / smallTickStep) * smallTickStep;
  for (let u = startX; u <= visMaxX; u += smallTickStep) {
    xTicks.push({ u, big: u % 10 === 0 });
  }

  const yTicks: { u: number; big: boolean }[] = [];
  const startY = Math.floor(visMinY / smallTickStep) * smallTickStep;
  for (let u = startY; u <= visMaxY; u += smallTickStep) {
    yTicks.push({ u, big: u % 10 === 0 });
  }

  const screenX = (u: number) => ((u * UNIT_PX + ORIGIN_PX) - panX) * zoom;
  const screenY = (u: number) => ((u * UNIT_PX + ORIGIN_PX) - panY) * zoom;

  const cursorStyle = placingPartId
    ? "crosshair"
    : activeTool === "cursor"
      ? (isDrawing ? "crosshair" : "default")
      : "crosshair";

  const labels = diagram?.labels ?? [];

  return (
    <div ref={viewportRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {!diagram ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#666" }}>
          Loading diagram...
        </div>
      ) : (
      <>
      {/* Corner box */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: RULER_SIZE, height: RULER_SIZE,
        background: "#1a1a1a", zIndex: 30, borderRight: "1px solid #333", borderBottom: "1px solid #333",
      }} />
      {/* Top ruler */}
      <div style={{
        position: "absolute", top: 0, left: RULER_SIZE, right: 0, height: RULER_SIZE,
        background: "#1a1a1a", borderBottom: "1px solid #333", zIndex: 20, overflow: "hidden", pointerEvents: "none",
      }}>
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: RULER_SIZE }}>
          {xTicks.map(({ u, big }) => {
            const sx = screenX(u);
            if (sx < -50 || sx > innerW + 50) return null;
            const tickH = big ? 10 : 4;
            return (
              <g key={u}>
                <line x1={sx} y1={RULER_SIZE - tickH} x2={sx} y2={RULER_SIZE}
                  stroke={big ? "#e53935" : "#666"} strokeWidth={big ? 1 : 0.5} />
                {big && (
                  <text x={sx + 3} y={12} fill="#888" fontSize={9} fontFamily="monospace">
                    {u / 10}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Left ruler */}
      <div style={{
        position: "absolute", top: RULER_SIZE, left: 0, bottom: 0, width: RULER_SIZE,
        background: "#1a1a1a", borderRight: "1px solid #333", zIndex: 20, overflow: "hidden", pointerEvents: "none",
      }}>
        <svg style={{ position: "absolute", top: 0, left: 0, width: RULER_SIZE, height: "100%" }}>
          {yTicks.map(({ u, big }) => {
            const sy = screenY(u);
            if (sy < -50 || sy > innerH + 50) return null;
            const tickW = big ? 10 : 4;
            return (
              <g key={u}>
                <line x1={RULER_SIZE - tickW} y1={sy} x2={RULER_SIZE} y2={sy}
                  stroke={big ? "#e53935" : "#666"} strokeWidth={big ? 1 : 0.5} />
                {big && (
                  <text x={2} y={sy - 3} fill="#888" fontSize={9} fontFamily="monospace">
                    {u / 10}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Inner viewport */}
      <div
        style={{
          position: "absolute", top: RULER_SIZE, left: RULER_SIZE, right: 0, bottom: 0,
          overflow: "hidden",
          cursor: cursorStyle,
        }}
        onPointerDown={handlePanStart}
        onPointerMove={(e) => { handlePanMove(e); handlePlacementMove(e); }}
        onPointerUp={handlePanEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          if (isDrawingRef.current) cancelDrawing();
        }}
      >
        {/* Transform wrapper */}
        <div
          style={{
            position: "absolute",
            transformOrigin: "0 0",
            transform: `scale(${zoom}) translate(${-panX}px, ${-panY}px)`,
            width: GRID_PX,
            height: GRID_PX,
          }}
        >
          <div
            ref={containerRef}
            onClick={(e) => {
              // Finalize part placement on click
              if (placingPartIdRef.current && containerRef.current) {
                const pid = placingPartIdRef.current;
                const wrapper = containerRef.current.querySelector(`[data-part-id="${pid}"]`) as HTMLElement | null;
                if (wrapper) {
                  const top = parseFloat(wrapper.style.top) - ORIGIN_PX;
                  const left = parseFloat(wrapper.style.left) - ORIGIN_PX;
                  onPartMove?.(pid, top, left);
                  wrapper.style.opacity = "";
                }
                onFinishPlacingRef.current?.();
                return;
              }
              handleCanvasClick(e as any);
              const target = e.target as HTMLElement;
              if (!target.closest("[data-part-id]")) {
                onPartSelect?.(null);
                setSelectedWireIdx(null);
              }
            }}
            onMouseMove={handleMouseMove}
            style={{ position: "relative", width: GRID_PX, height: GRID_PX }}
          >
            {/* Dot grid background */}
            {showGrid && (
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
                <defs>
                  <pattern id="grid-dots" width={UNIT_PX} height={UNIT_PX} patternUnits="userSpaceOnUse">
                    <circle cx={0} cy={0} r={0.5} fill="#555" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-dots)" />
              </svg>
            )}

            {/* Wire SVG overlay */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5, overflow: "visible" }}>
              {/* Wire polylines */}
              {wires.map((wire, i) => {
                const isHighlighted = highlightedWireIndices.has(i);
                const isSelected = selectedWireIdx === i;
                const pts = (isSelected && dragPreviewPoints) ? dragPreviewPoints : wire.points;
                return (
                  <g key={i}>
                    <polyline
                      points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={12}
                      style={{ pointerEvents: isDrawing ? "none" : "stroke", cursor: "pointer" }}
                      onClick={(e) => { e.stopPropagation(); setSelectedWireIdx(i); onPartSelect?.(null); }}
                      onDoubleClick={(e) => { e.stopPropagation(); onDeleteConnection?.(wire.connectionIndex); }}
                    />
                    <polyline
                      points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={wire.color}
                      strokeWidth={isSelected ? 2.5 : (isHighlighted ? 3 : 1.5)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={hoveredPin ? (isHighlighted ? 1 : 0.2) : (isSelected ? 1 : 0.85)}
                      style={{ transition: "opacity 0.15s, stroke-width 0.15s", pointerEvents: "none" }}
                    />
                  </g>
                );
              })}
              {/* Wire drag handles — rendered after all wires so they always sit on top */}
              {selectedWireIdx != null && (() => {
                const wire = wires[selectedWireIdx];
                if (!wire) return null;
                const pts = dragPreviewPoints || wire.points;
                if (pts.length < 2) return null;
                return pts.slice(0, -1).map((p0, segIdx) => {
                  const p1 = pts[segIdx + 1];
                  const mx = (p0.x + p1.x) / 2;
                  const my = (p0.y + p1.y) / 2;
                  const segDx = Math.abs(p1.x - p0.x);
                  const segDy = Math.abs(p1.y - p0.y);
                  const isHoriz = segDx > segDy;
                  if (Math.max(segDx, segDy) < 5) return null;
                  return (
                    <g key={`h${segIdx}`}>
                      <rect
                        x={mx - 5} y={my - 5} width={10} height={10} rx={2}
                        fill="#fff" stroke="#06f" strokeWidth={1.5}
                        style={{ pointerEvents: "all", cursor: isHoriz ? "ns-resize" : "ew-resize" }}
                        onPointerDown={(e) => handleHandlePointerDown(e, selectedWireIdx, segIdx)}
                        onPointerMove={handleHandlePointerMove}
                        onPointerUp={handleHandlePointerUp}
                      />
                      {isHoriz ? (
                        <>
                          <line x1={mx - 3} y1={my - 1.5} x2={mx + 3} y2={my - 1.5} stroke="#06f" strokeWidth={0.8} style={{ pointerEvents: "none" }} />
                          <line x1={mx - 3} y1={my + 1.5} x2={mx + 3} y2={my + 1.5} stroke="#06f" strokeWidth={0.8} style={{ pointerEvents: "none" }} />
                        </>
                      ) : (
                        <>
                          <line x1={mx - 1.5} y1={my - 3} x2={mx - 1.5} y2={my + 3} stroke="#06f" strokeWidth={0.8} style={{ pointerEvents: "none" }} />
                          <line x1={mx + 1.5} y1={my - 3} x2={mx + 1.5} y2={my + 3} stroke="#06f" strokeWidth={0.8} style={{ pointerEvents: "none" }} />
                        </>
                      )}
                    </g>
                  );
                });
              })()}
              {wireDrawing && (
                <polyline points={previewPath} fill="none" stroke="#0f0" strokeWidth={2}
                  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" opacity={0.9}
                  style={{ pointerEvents: "none" }} />
              )}
            </svg>

            {/* Netlabels */}
            {labels.length > 0 && (
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 8, overflow: "visible" }}>
                {labels.filter((l) => l.x !== 0 || l.y !== 0).map((label) => {
                  const textW = Math.max(label.name.length * 7, 20);
                  return (
                    <g key={label.id}>
                      <path
                        d={`M${label.x},${label.y} l-8,-12 l-${textW},0 l0,24 l${textW},0 Z`}
                        fill="rgba(0, 180, 80, 0.15)"
                        stroke="#00b450"
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                        style={{ pointerEvents: "none" }}
                      />
                      <text
                        x={label.x - 12 - textW / 2}
                        y={label.y + 4}
                        fill="#00e060"
                        fontSize={11}
                        fontFamily="monospace"
                        fontWeight={600}
                        textAnchor="middle"
                        style={{ pointerEvents: "none" }}
                      >
                        {label.name}
                      </text>
                      <circle cx={label.x} cy={label.y} r={3} fill="#00b450" style={{ pointerEvents: "none" }} />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Pin hit areas + highlights */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 10, overflow: "visible" }}>
              {allPins.map((pin) => {
                const isHovered = hoveredPin === pin.ref;
                const isWireStart = wireDrawing?.fromRef === pin.ref;
                return (
                  <g key={pin.ref}>
                    {/* Small pin dot always visible */}
                    <circle cx={pin.x} cy={pin.y} r={2} fill="#999" opacity={0.5}
                      style={{ pointerEvents: "none" }} />
                    {(isHovered || isWireStart) && (
                      <>
                        <circle cx={pin.x} cy={pin.y} r={6}
                          fill={isWireStart ? "rgba(0, 255, 0, 0.3)" : "rgba(0, 200, 0, 0.25)"}
                          stroke={isWireStart ? "#0f0" : "#0c0"} strokeWidth={1.5} />
                        <circle cx={pin.x} cy={pin.y} r={2.5} fill={isWireStart ? "#0f0" : "#0c0"} />
                      </>
                    )}
                    <circle cx={pin.x} cy={pin.y} r={4.5} fill="transparent"
                      style={{ pointerEvents: "all", cursor: "crosshair" }}
                      onMouseEnter={() => { setHoveredPin(pin.ref); setTooltipPos({ x: pin.x, y: pin.y }); }}
                      onMouseLeave={() => setHoveredPin(null)}
                      onClick={(e) => { e.stopPropagation(); handlePinClickDispatch(pin.x, pin.y); }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Sensor sliders during simulation */}
            {simRunning && sensorEntries.length > 0 && (
              <SensorPanel sensors={sensorEntries} />
            )}

            {/* Pin tooltip */}
            {hoveredPin && (
              <div style={{
                position: "absolute", left: tooltipPos.x + 12, top: tooltipPos.y - 32,
                background: "rgba(0, 0, 0, 0.9)", color: "#0c0", padding: "4px 10px",
                borderRadius: 4, fontSize: 13, fontFamily: "monospace",
                fontWeight: 600, whiteSpace: "nowrap", zIndex: 20, pointerEvents: "none",
                border: "1px solid #0c0", boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}>
                {hoveredPin}
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
