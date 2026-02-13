"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Diagram, DiagramPart, DiagramConnection, DiagramLabel } from "@/lib/diagram-parser";
import type { AVRRunner } from "@/lib/avr-runner";
import type { ToolType } from "@/components/ToolPalette";
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
import { useWireDrawing } from "@/hooks/useWireDrawing";
import { useDragParts } from "@/hooks/useDragParts";

const UNIT_PX = 9.6; // 0.1 inch in CSS pixels (96 dpi)
const GRID_UNITS = 2000; // total grid size in 0.1in (-1000 to +1000)
const GRID_PX = GRID_UNITS * UNIT_PX;
const ORIGIN_PX = (GRID_UNITS / 2) * UNIT_PX; // content center = unit 0
const RULER_SIZE = 28;
const TICK_INTERVAL = 25; // ruler tick every 25 units (2.5 in)
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

let elementsLoaded = false;
function ensureElementsLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (elementsLoaded) return Promise.resolve();
  elementsLoaded = true;
  return import("@wokwi/elements").then(() => {
    return import("./DipChip").then((m) => m.registerDipChips());
  });
}

interface ElementPin { name: string; x: number; y: number; }
interface CanvasPin { ref: string; x: number; y: number; name: string; }

interface SimulationCanvasProps {
  diagram: Diagram | null;
  runner: AVRRunner | null;
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onPartMove?: (partId: string, top: number, left: number) => void;
  onAddConnection?: (conn: DiagramConnection) => void;
  onUpdateConnection?: (index: number, conn: DiagramConnection) => void;
  onDeleteConnection?: (index: number) => void;
  onWireSelect?: (connectionIndex: number | null) => void;
  onAddLabel?: (label: DiagramLabel) => void;
  onDeleteLabel?: (labelId: string) => void;
  onMoveLabel?: (labelId: string, x: number, y: number) => void;
  selectedPartId: string | null;
  selectedLabelId: string | null;
  onPartSelect?: (partId: string | null) => void;
  onLabelSelect?: (labelId: string | null) => void;
  onDeletePart?: (partId: string) => void;
  onPartRotate?: (partId: string, angle: number) => void;
  placingPartId?: string | null;
  onFinishPlacing?: () => void;
  placingLabelId?: string | null;
  onFinishPlacingLabel?: () => void;
  onCancelPlacingLabel?: () => void;
  onPlaceLabelAt?: (labelId: string, pinRef: string, x: number, y: number) => void;
}

function pinToCanvas(
  part: DiagramPart,
  pin: ElementPin,
  elWidth: number,
  elHeight: number,
): { x: number; y: number } {
  const θ = part.rotate ? (part.rotate * Math.PI) / 180 : 0;
  // Parts are positioned at (left + ORIGIN_PX, top + ORIGIN_PX) in content space
  const ox = part.left + ORIGIN_PX;
  const oy = part.top + ORIGIN_PX;

  if (!θ) {
    return { x: ox + pin.x, y: oy + pin.y };
  }

  // CSS rotate() is clockwise-positive, so the transform matrix is:
  //   x' = cx + dx*cos(θ) + dy*sin(θ)
  //   y' = cy - dx*sin(θ) + dy*cos(θ)
  const dx = pin.x - elWidth / 2;
  const dy = pin.y - elHeight / 2;
  const cos = Math.cos(θ);
  const sin = Math.sin(θ);

  return {
    x: ox + elWidth / 2 + (dx * cos + dy * sin),
    y: oy + elHeight / 2 + (-dx * sin + dy * cos),
  };
}

export default function SimulationCanvas({
  diagram,
  runner,
  activeTool,
  onToolChange,
  onPartMove,
  onAddConnection,
  onUpdateConnection,
  onDeleteConnection,
  onWireSelect,
  onAddLabel,
  onDeleteLabel,
  onMoveLabel,
  selectedPartId,
  selectedLabelId,
  onPartSelect,
  onLabelSelect,
  onDeletePart,
  onPartRotate,
  placingPartId,
  onFinishPlacing,
  placingLabelId,
  onFinishPlacingLabel,
  onCancelPlacingLabel,
  onPlaceLabelAt,
}: SimulationCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const wiredRef = useRef<Map<string, WiredComponent>>(new Map());
  const [ready, setReady] = useState(false);
  const [wires, setWires] = useState<RenderedWire[]>([]);
  const [allPins, setAllPins] = useState<CanvasPin[]>([]);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Zoom + pan state (panX/panY = content pixel at viewport top-left)
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(ORIGIN_PX - 100);
  const [panY, setPanY] = useState(ORIGIN_PX - 50);

  // Refs for hooks that need current zoom/pan without re-creating callbacks
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panStateRef = useRef({ x: panX, y: panY });
  panStateRef.current = { x: panX, y: panY };

  // Keep activeTool in a ref for use in callbacks without re-creating them
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  // Placement mode refs
  const placingPartIdRef = useRef<string | null>(null);
  placingPartIdRef.current = placingPartId ?? null;
  const onFinishPlacingRef = useRef(onFinishPlacing);
  onFinishPlacingRef.current = onFinishPlacing;

  // Label placement mode refs + ghost position
  const placingLabelIdRef = useRef<string | null>(null);
  placingLabelIdRef.current = placingLabelId ?? null;
  const onFinishPlacingLabelRef = useRef(onFinishPlacingLabel);
  onFinishPlacingLabelRef.current = onFinishPlacingLabel;
  const onCancelPlacingLabelRef = useRef(onCancelPlacingLabel);
  onCancelPlacingLabelRef.current = onCancelPlacingLabel;
  const onMoveLabelRef = useRef(onMoveLabel);
  onMoveLabelRef.current = onMoveLabel;
  const onPlaceLabelAtRef = useRef(onPlaceLabelAt);
  onPlaceLabelAtRef.current = onPlaceLabelAt;
  const [ghostLabelPos, setGhostLabelPos] = useState<{ x: number; y: number } | null>(null);
  const ghostLabelPosRef = useRef(ghostLabelPos);
  ghostLabelPosRef.current = ghostLabelPos;

  const {
    wireDrawing,
    isDrawing,
    previewPath,
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
    cancelDrawing,
  } = useWireDrawing({ containerRef, onAddConnection, zoomRef, panRef: panStateRef, activeTool });

  // Wire drawing ref (for pan handler to check without re-creating callback)
  const isDrawingRef = useRef(false);
  isDrawingRef.current = isDrawing;

  // --- Wire selection & handle dragging ---
  const [selectedWireIdx, setSelectedWireIdx] = useState<number | null>(null);
  const dragStateRef = useRef<{
    wireIdx: number;
    segIdx: number;
    axis: "h" | "v";
    origPoints: Point[];
    startContent: { x: number; y: number };
  } | null>(null);
  // Live-preview points during drag (overrides wires[selectedWireIdx].points)
  const [dragPreviewPoints, setDragPreviewPoints] = useState<Point[] | null>(null);
  const dragPreviewRef = useRef<Point[] | null>(null);
  const onUpdateConnectionRef = useRef(onUpdateConnection);
  onUpdateConnectionRef.current = onUpdateConnection;

  // Wrapper: useDragParts reports positions including ORIGIN_PX offset;
  // subtract it so diagram coordinates stay origin-relative.
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
  const { attachDragHandlers } = useDragParts({ onPartMove: handlePartMove, onPartSelect: handlePartSelectFromDrag, zoomRef });

  // --- Wire handle drag helpers ---
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

  /** Split a segment into 3 by shifting it perpendicular by `offset`. */
  const splitSegment = useCallback((points: Point[], segIdx: number, offset: number): Point[] => {
    const p0 = points[segIdx];
    const p1 = points[segIdx + 1];
    const dx = Math.abs(p1.x - p0.x);
    const dy = Math.abs(p1.y - p0.y);
    const isHorizontal = dx > dy;

    const snappedOffset = Math.round(offset / UNIT_PX) * UNIT_PX;
    if (Math.abs(snappedOffset) < 0.5) return points;

    const before = points.slice(0, segIdx + 1);
    const after = points.slice(segIdx + 1);

    if (isHorizontal) {
      // Horizontal segment → shift vertically
      before.push({ x: p0.x, y: p0.y + snappedOffset });
      after.unshift({ x: p1.x, y: p1.y + snappedOffset });
    } else {
      // Vertical segment → shift horizontally
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

    // Compute perpendicular offset (horizontal seg → vertical offset, and vice versa)
    const offset = ds.axis === "h"
      ? contentPos.y - ds.startContent.y
      : contentPos.x - ds.startContent.x;

    const newPoints = splitSegment(ds.origPoints, ds.segIdx, offset);
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

    // Commit: convert preview points to hints and update the connection
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

  // Deselect wire when tool changes or wire drawing starts
  useEffect(() => {
    if (isDrawing) setSelectedWireIdx(null);
  }, [isDrawing]);

  // Notify parent about wire selection changes
  useEffect(() => {
    if (selectedWireIdx !== null) {
      const wire = wires[selectedWireIdx];
      onWireSelect?.(wire ? wire.connectionIndex : null);
    } else {
      onWireSelect?.(null);
    }
  }, [selectedWireIdx, wires, onWireSelect]);

  // --- Placement mode: part follows cursor ---
  const handlePlacementMove = useCallback((e: React.PointerEvent) => {
    // Part placement
    const pid = placingPartIdRef.current;
    if (pid && containerRef.current && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left - RULER_SIZE;
      const sy = e.clientY - rect.top - RULER_SIZE;
      const z = zoomRef.current;
      const contentX = sx / z + panStateRef.current.x;
      const contentY = sy / z + panStateRef.current.y;
      const snapX = Math.round(contentX / UNIT_PX) * UNIT_PX;
      const snapY = Math.round(contentY / UNIT_PX) * UNIT_PX;

      const wrapper = containerRef.current.querySelector(`[data-part-id="${pid}"]`) as HTMLElement | null;
      if (wrapper) {
        wrapper.style.top = `${snapY}px`;
        wrapper.style.left = `${snapX}px`;
        wrapper.style.opacity = "0.7";
      }
    }

    // Label placement: update ghost position
    const lid = placingLabelIdRef.current;
    if (lid && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left - RULER_SIZE;
      const sy = e.clientY - rect.top - RULER_SIZE;
      const z = zoomRef.current;
      const contentX = sx / z + panStateRef.current.x;
      const contentY = sy / z + panStateRef.current.y;
      setGhostLabelPos({ x: contentX, y: contentY });
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

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "w" || e.key === "W") {
        onToolChange("wire");
      } else if (e.key === "l" || e.key === "L") {
        onToolChange("label");
      } else if (e.key === "Escape") {
        if (placingLabelIdRef.current) {
          onCancelPlacingLabelRef.current?.();
          setGhostLabelPos(null);
        } else if (placingPartIdRef.current) {
          onDeletePart?.(placingPartIdRef.current);
          onFinishPlacingRef.current?.();
          onToolChange("cursor");
        } else if (isDrawing) {
          // Cancel wire but stay in wire mode so user can start a new wire
          cancelDrawing();
        } else {
          onPartSelect?.(null);
          onLabelSelect?.(null);
          setSelectedWireIdx(null);
          onToolChange("cursor");
        }
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedPartId) {
        e.preventDefault();
        onDeletePart?.(selectedPartId);
        onPartSelect?.(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedLabelId) {
        e.preventDefault();
        onDeleteLabel?.(selectedLabelId);
        onLabelSelect?.(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedWireIdx !== null) {
        e.preventDefault();
        const wire = wires[selectedWireIdx];
        if (wire) onDeleteConnection?.(wire.connectionIndex);
        setSelectedWireIdx(null);
      } else if ((e.key === "r" || e.key === "R") && selectedPartId && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onPartRotate?.(selectedPartId, 90);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onToolChange, selectedPartId, onDeletePart, onPartSelect, onPartRotate, isDrawing, cancelDrawing, selectedWireIdx, wires, onDeleteConnection, selectedLabelId, onDeleteLabel, onLabelSelect]);

  // --- Zoom with scroll wheel ---
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      // Mouse position relative to the inner viewport (after ruler)
      const mx = e.clientX - rect.left - RULER_SIZE;
      const my = e.clientY - rect.top - RULER_SIZE;
      if (mx < 0 || my < 0) return;

      const oldZoom = zoomRef.current;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * factor));

      // Keep content point under cursor stationary
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

  // --- Pan handler: middle-click always pans; left-click only in cursor mode on empty space ---
  const handlePanStart = useCallback((e: React.PointerEvent) => {
    if (placingPartIdRef.current || placingLabelIdRef.current) return; // Don't pan during placement
    if (e.button === 1) {
      // Middle button always pans
      e.preventDefault();
    } else if (e.button === 0) {
      // Don't pan during wire drawing — clicks should place corners
      if (isDrawingRef.current) return;
      // Left button: only pan in cursor mode on empty space
      if (activeToolRef.current !== "cursor") return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-part-id]")) return;
      // Skip pin hit area circles so onClick fires
      if (target.tagName === "circle") return;
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

  const handlePanEnd = useCallback((e: React.PointerEvent) => {
    if (!panDragRef.current) return;
    panDragRef.current.target.releasePointerCapture(panDragRef.current.pointerId);
    panDragRef.current = null;
  }, []);

  // Auto-incrementing netlabel counter
  const labelCounterRef = useRef(1);

  /** Place a netlabel at a pin position with auto-generated name. */
  const placeNetlabel = useCallback(
    (pinRef: string, pinX: number, pinY: number) => {
      const id = `label-${Date.now()}`;
      const name = `NET${labelCounterRef.current++}`;
      onAddLabel?.({ id, name, pinRef, x: pinX - 20, y: pinY });
      onLabelSelect?.(id);
      onPartSelect?.(null);
      setSelectedWireIdx(null);
    },
    [onAddLabel, onLabelSelect, onPartSelect],
  );

  // --- Pin click dispatch: wire mode → wire handler, label mode → place label ---
  const handlePinClickDispatch = useCallback(
    (pinRef: string, pinX: number, pinY: number) => {
      const tool = activeToolRef.current;
      if (tool === "wire") {
        handlePinClick(pinRef, pinX, pinY);
      } else if (tool === "label") {
        placeNetlabel(pinRef, pinX, pinY);
      } else {
        // cursor mode: still allow wire start/complete for convenience
        handlePinClick(pinRef, pinX, pinY);
      }
    },
    [handlePinClick, placeNetlabel],
  );

  // --- Compute pins & wires ---
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
      const w = el.offsetWidth || el.clientWidth || 0;
      const h = el.offsetHeight || el.clientHeight || 0;
      for (const pin of pins) {
        const pos = pinToCanvas(part, pin, w, h);
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

  // --- Create DOM elements for parts ---
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
        // Sync attributes on the element
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
    const wired = wireComponents(runner, diagram);
    wiredRef.current = wired;

    for (const [id, wc] of wired) {
      const el = elementsRef.current.get(id);
      if (!el) continue;
      if (wc.part.type === "wokwi-led") wc.onStateChange = (high) => { (el as any).value = high; };
      else if (wc.part.type === "wokwi-buzzer") wc.onStateChange = (high) => { (el as any).hasSignal = high; };
      else if (wc.part.type === "wokwi-arduino-uno") (el as any).ledPower = true;
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

    const keyMap = new Map<string, WiredComponent>();
    for (const [, wc] of wired) {
      if (wc.part.type !== "wokwi-pushbutton") continue;
      const key = wc.part.attrs.key;
      if (key) keyMap.set(key, wc);
    }
    const handleKeyDown = (e: KeyboardEvent) => { const wc = keyMap.get(e.key); if (wc) wc.setPressed?.(true); };
    const handleKeyUp = (e: KeyboardEvent) => { const wc = keyMap.get(e.key); if (wc) wc.setPressed?.(false); };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cleanupWiring(wiredRef.current);
    };
  }, [runner, diagram]);

  // --- Clean up placement opacity when placement ends ---
  useEffect(() => {
    if (placingPartId || !containerRef.current) return;
    const wrappers = containerRef.current.querySelectorAll("[data-part-id]");
    wrappers.forEach((el) => {
      (el as HTMLElement).style.opacity = "";
    });
  }, [placingPartId]);

  // Clear ghost label when label placement ends
  useEffect(() => {
    if (!placingLabelId) setGhostLabelPos(null);
  }, [placingLabelId]);

  // --- Selection highlight on part wrappers ---
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

  // --- Highlighted wires ---
  const highlightedWireIndices = new Set<number>();
  if (hoveredPin) {
    wires.forEach((wire, i) => {
      if (wire.fromRef === hoveredPin || wire.toRef === hoveredPin) highlightedWireIndices.add(i);
    });
  }

  // --- Compute visible ruler ticks (in 0.1in units) ---
  const vpW = viewportRef.current?.clientWidth ?? 800;
  const vpH = viewportRef.current?.clientHeight ?? 600;
  const innerW = vpW - RULER_SIZE;
  const innerH = vpH - RULER_SIZE;

  // Visible content range in 0.1in units (relative to origin = 0)
  const visMinX = (panX - ORIGIN_PX) / UNIT_PX;
  const visMaxX = ((panX + innerW / zoom) - ORIGIN_PX) / UNIT_PX;
  const visMinY = (panY - ORIGIN_PX) / UNIT_PX;
  const visMaxY = ((panY + innerH / zoom) - ORIGIN_PX) / UNIT_PX;

  const startTickX = Math.floor(visMinX / TICK_INTERVAL) * TICK_INTERVAL;
  const endTickX = Math.ceil(visMaxX / TICK_INTERVAL) * TICK_INTERVAL;
  const startTickY = Math.floor(visMinY / TICK_INTERVAL) * TICK_INTERVAL;
  const endTickY = Math.ceil(visMaxY / TICK_INTERVAL) * TICK_INTERVAL;

  const xTicks: number[] = [];
  for (let u = startTickX; u <= endTickX; u += TICK_INTERVAL) xTicks.push(u);
  const yTicks: number[] = [];
  for (let u = startTickY; u <= endTickY; u += TICK_INTERVAL) yTicks.push(u);

  // Convert 0.1in unit to screen position: screenPos = (contentPx - panX) * zoom
  const screenX = (u: number) => ((u * UNIT_PX + ORIGIN_PX) - panX) * zoom;
  const screenY = (u: number) => ((u * UNIT_PX + ORIGIN_PX) - panY) * zoom;

  // Cursor style based on active tool
  const cursorStyle = placingPartId || placingLabelId
    ? "crosshair"
    : activeTool === "cursor"
      ? (isDrawing ? "crosshair" : "default")
      : "crosshair";

  // Labels from diagram
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
      <div style={{
        position: "absolute", top: 2, right: 8, zIndex: 30,
        fontSize: 10, color: "#666", fontFamily: "monospace", pointerEvents: "none",
      }}>
        0.1 inches
      </div>

      {/* Top ruler */}
      <div style={{
        position: "absolute", top: 0, left: RULER_SIZE, right: 0, height: RULER_SIZE,
        background: "#1a1a1a", borderBottom: "1px solid #333", zIndex: 20, overflow: "hidden", pointerEvents: "none",
      }}>
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: RULER_SIZE }}>
          {xTicks.map((u) => {
            const sx = screenX(u);
            if (sx < -50 || sx > innerW + 50) return null;
            return (
              <g key={u}>
                <line x1={sx} y1={RULER_SIZE - 8} x2={sx} y2={RULER_SIZE} stroke="#e53935" strokeWidth={1} />
                <text x={sx + 3} y={12} fill="#888" fontSize={10} fontFamily="monospace">{Math.round(u)}</text>
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
          {yTicks.map((u) => {
            const sy = screenY(u);
            if (sy < -50 || sy > innerH + 50) return null;
            return (
              <g key={u}>
                <line x1={RULER_SIZE - 8} y1={sy} x2={RULER_SIZE} y2={sy} stroke="#e53935" strokeWidth={1} />
                <text x={2} y={sy - 3} fill="#888" fontSize={10} fontFamily="monospace">{Math.round(u)}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Inner viewport (receives pan/zoom events) */}
      <div
        style={{
          position: "absolute", top: RULER_SIZE, left: RULER_SIZE, right: 0, bottom: 0,
          overflow: "hidden",
          cursor: cursorStyle,
        }}
        onPointerDown={handlePanStart}
        onPointerMove={(e) => { handlePanMove(e); handlePlacementMove(e); }}
        onPointerUp={handlePanEnd}
        onContextMenu={(e) => e.preventDefault()}
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
              // Finalize label placement on click — snap to nearest pin
              if (placingLabelIdRef.current) {
                const lid = placingLabelIdRef.current;
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect && allPins.length > 0) {
                  const z = zoomRef.current;
                  const cx = (e.clientX - rect.left) / z;
                  const cy = (e.clientY - rect.top) / z;
                  let best: CanvasPin | null = null;
                  let bestDist = 80; // slightly larger snap radius for placement
                  for (const pin of allPins) {
                    const dist = Math.hypot(pin.x - cx, pin.y - cy);
                    if (dist < bestDist) { bestDist = dist; best = pin; }
                  }
                  if (best) {
                    onPlaceLabelAtRef.current?.(lid, best.ref, best.x - 20, best.y);
                    onFinishPlacingLabelRef.current?.();
                    setGhostLabelPos(null);
                    return;
                  }
                }
                // No nearby pin — place at cursor position without pinRef
                const gPos = ghostLabelPosRef.current;
                if (gPos) {
                  onPlaceLabelAtRef.current?.(lid, "", gPos.x - 20, gPos.y);
                  onFinishPlacingLabelRef.current?.();
                  setGhostLabelPos(null);
                }
                return;
              }
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
              // Label mode: clicking empty canvas → find nearest pin and place netlabel
              if (activeToolRef.current === "label") {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect && allPins.length > 0) {
                  const z = zoomRef.current;
                  const cx = (e.clientX - rect.left) / z;
                  const cy = (e.clientY - rect.top) / z;
                  // Find nearest pin within 50px
                  let best: CanvasPin | null = null;
                  let bestDist = 50;
                  for (const pin of allPins) {
                    const dist = Math.hypot(pin.x - cx, pin.y - cy);
                    if (dist < bestDist) { bestDist = dist; best = pin; }
                  }
                  if (best) {
                    placeNetlabel(best.ref, best.x, best.y);
                    return;
                  }
                }
              }
              handleCanvasClick(e as any);
              // Deselect if clicking empty space (not on a part or wire)
              const target = e.target as HTMLElement;
              if (!target.closest("[data-part-id]")) {
                onPartSelect?.(null);
                onLabelSelect?.(null);
                setSelectedWireIdx(null);
              }
            }}
            onMouseMove={handleMouseMove}
            style={{ position: "relative", width: GRID_PX, height: GRID_PX }}
          >
            {/* Dot grid background */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
              <defs>
                <pattern id="grid-dots" width={UNIT_PX} height={UNIT_PX} patternUnits="userSpaceOnUse">
                  <circle cx={UNIT_PX / 2} cy={UNIT_PX / 2} r={0.5} fill="#555" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-dots)" />
            </svg>

            {/* Wire SVG overlay */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5, overflow: "visible" }}>
              {wires.map((wire, i) => {
                const isHighlighted = highlightedWireIndices.has(i);
                const isSelected = selectedWireIdx === i;
                const pts = (isSelected && dragPreviewPoints) ? dragPreviewPoints : wire.points;
                return (
                  <g key={i}>
                    {/* Invisible fat hit area for clicking */}
                    <polyline
                      points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={12}
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onClick={(e) => { e.stopPropagation(); setSelectedWireIdx(i); onPartSelect?.(null); }}
                    />
                    {/* Visible wire — pointerEvents none so clicks fall through to hit area */}
                    <polyline
                      points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={isSelected ? "#4af" : wire.color}
                      strokeWidth={isSelected ? 2.5 : (isHighlighted ? 3 : 1.5)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={hoveredPin ? (isHighlighted ? 1 : 0.2) : (isSelected ? 1 : 0.85)}
                      style={{ transition: "opacity 0.15s, stroke-width 0.15s", pointerEvents: "none" }}
                    />
                    {/* Segment midpoint handles for selected wire */}
                    {isSelected && pts.length >= 2 && pts.slice(0, -1).map((p0, segIdx) => {
                      const p1 = pts[segIdx + 1];
                      const mx = (p0.x + p1.x) / 2;
                      const my = (p0.y + p1.y) / 2;
                      const segDx = Math.abs(p1.x - p0.x);
                      const segDy = Math.abs(p1.y - p0.y);
                      const isHoriz = segDx > segDy;
                      // Skip very short segments (< 5px)
                      if (Math.max(segDx, segDy) < 5) return null;
                      return (
                        <g key={`h${segIdx}`}>
                          {/* Handle background */}
                          <rect
                            x={mx - 5} y={my - 5} width={10} height={10} rx={2}
                            fill="#fff" stroke="#06f" strokeWidth={1.5}
                            style={{ pointerEvents: "all", cursor: isHoriz ? "ns-resize" : "ew-resize" }}
                            onPointerDown={(e) => handleHandlePointerDown(e, i, segIdx)}
                            onPointerMove={handleHandlePointerMove}
                            onPointerUp={handleHandlePointerUp}
                          />
                          {/* Grip lines */}
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
                    })}
                  </g>
                );
              })}
              {wireDrawing && (
                <polyline points={previewPath} fill="none" stroke="#0f0" strokeWidth={2}
                  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" opacity={0.9}
                  style={{ pointerEvents: "none" }} />
              )}
            </svg>

            {/* Global netlabels SVG overlay */}
            {(labels.length > 0 || ghostLabelPos) && (
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 8, overflow: "visible" }}>
                {/* Ghost netlabel during placement */}
                {ghostLabelPos && placingLabelId && (() => {
                  const placingLabel = labels.find((l) => l.id === placingLabelId);
                  const name = placingLabel?.name ?? "NET";
                  const textW = Math.max(name.length * 7, 20);
                  const gx = ghostLabelPos.x;
                  const gy = ghostLabelPos.y;
                  return (
                    <g opacity={0.6}>
                      <path
                        d={`M${gx},${gy} l-8,-12 l-${textW},0 l0,24 l${textW},0 Z`}
                        fill="rgba(0, 180, 80, 0.25)"
                        stroke="#00b450"
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                        strokeDasharray="4 2"
                        style={{ pointerEvents: "none" }}
                      />
                      <text
                        x={gx - 12 - textW / 2}
                        y={gy + 4}
                        fill="#00e060"
                        fontSize={11}
                        fontFamily="'Cascadia Code', 'Fira Code', monospace"
                        fontWeight={600}
                        textAnchor="middle"
                        style={{ pointerEvents: "none" }}
                      >
                        {name}
                      </text>
                      <circle cx={gx} cy={gy} r={3} fill="#00b450" style={{ pointerEvents: "none" }} />
                    </g>
                  );
                })()}
                {labels.filter((l) => (l.x !== 0 || l.y !== 0) && l.id !== placingLabelId).map((label) => {
                  const isLabelSelected = selectedLabelId === label.id;
                  const textW = Math.max(label.name.length * 7, 20);
                  return (
                    <g key={label.id}>
                      {/* Clickable hit area */}
                      <path
                        d={`M${label.x},${label.y} l-8,-12 l-${textW},0 l0,24 l${textW},0 Z`}
                        fill="transparent"
                        style={{ pointerEvents: "fill", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onLabelSelect?.(label.id);
                          onPartSelect?.(null);
                          setSelectedWireIdx(null);
                        }}
                      />
                      {/* Flag shape */}
                      <path
                        d={`M${label.x},${label.y} l-8,-12 l-${textW},0 l0,24 l${textW},0 Z`}
                        fill={isLabelSelected ? "rgba(0, 180, 80, 0.3)" : "rgba(0, 180, 80, 0.15)"}
                        stroke={isLabelSelected ? "#4af" : "#00b450"}
                        strokeWidth={isLabelSelected ? 2 : 1.5}
                        strokeLinejoin="round"
                        style={{ pointerEvents: "none" }}
                      />
                      {/* Label name */}
                      <text
                        x={label.x - 12 - textW / 2}
                        y={label.y + 4}
                        fill={isLabelSelected ? "#6cf" : "#00e060"}
                        fontSize={11}
                        fontFamily="'Cascadia Code', 'Fira Code', monospace"
                        fontWeight={600}
                        textAnchor="middle"
                        style={{ pointerEvents: "none" }}
                      >
                        {label.name}
                      </text>
                      {/* Connection dot */}
                      <circle cx={label.x} cy={label.y} r={3}
                        fill={isLabelSelected ? "#4af" : "#00b450"}
                        style={{ pointerEvents: "none" }}
                      />
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
                    {(isHovered || isWireStart) && (
                      <>
                        <circle cx={pin.x} cy={pin.y} r={8}
                          fill={isWireStart ? "rgba(0, 255, 0, 0.3)" : "rgba(0, 200, 0, 0.25)"}
                          stroke={isWireStart ? "#0f0" : "#0c0"} strokeWidth={2} />
                        <circle cx={pin.x} cy={pin.y} r={3} fill={isWireStart ? "#0f0" : "#0c0"} />
                      </>
                    )}
                    <circle cx={pin.x} cy={pin.y} r={10} fill="transparent"
                      style={{ pointerEvents: "all", cursor: "crosshair" }}
                      onMouseEnter={() => { setHoveredPin(pin.ref); setTooltipPos({ x: pin.x, y: pin.y }); }}
                      onMouseLeave={() => setHoveredPin(null)}
                      onClick={(e) => { e.stopPropagation(); handlePinClickDispatch(pin.ref, pin.x, pin.y); }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Pin tooltip */}
            {hoveredPin && (
              <div style={{
                position: "absolute", left: tooltipPos.x + 12, top: tooltipPos.y - 32,
                background: "rgba(0, 0, 0, 0.9)", color: "#0c0", padding: "4px 10px",
                borderRadius: 4, fontSize: 13, fontFamily: "'Cascadia Code', 'Fira Code', monospace",
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
