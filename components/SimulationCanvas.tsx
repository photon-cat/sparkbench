"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Diagram, DiagramPart, DiagramConnection } from "@/lib/diagram-parser";
import type { AVRRunner } from "@/lib/avr-runner";
import {
  wireComponents,
  cleanupWiring,
  WiredComponent,
} from "@/lib/wire-components";
import {
  renderWires,
  type RenderedWire,
  type PinPosition,
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
  onPartMove?: (partId: string, top: number, left: number) => void;
  onAddConnection?: (conn: DiagramConnection) => void;
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

  const dx = pin.x - elWidth / 2;
  const dy = pin.y - elHeight / 2;
  const cos = Math.cos(θ);
  const sin = Math.sin(θ);

  return {
    x: ox + elWidth / 2 + (dx * cos - dy * sin),
    y: oy + elHeight / 2 + (dx * sin + dy * cos),
  };
}

export default function SimulationCanvas({
  diagram,
  runner,
  onPartMove,
  onAddConnection,
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

  const {
    wireDrawing,
    isDrawing,
    previewPath,
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
  } = useWireDrawing({ containerRef, onAddConnection, zoomRef, panRef: panStateRef });

  // Wrapper: useDragParts reports positions including ORIGIN_PX offset;
  // subtract it so diagram coordinates stay origin-relative.
  const handlePartMove = useCallback(
    (partId: string, top: number, left: number) => {
      onPartMove?.(partId, top - ORIGIN_PX, left - ORIGIN_PX);
    },
    [onPartMove],
  );
  const { attachDragHandlers } = useDragParts({ onPartMove: handlePartMove, zoomRef });

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
      // Content point under cursor: cx = mx / oldZoom + panX
      // After zoom: (cx - newPanX) * newZoom = mx → newPanX = cx - mx / newZoom
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

  // --- Pan with left-click (empty space) or middle-click ---
  const handlePanStart = useCallback((e: React.PointerEvent) => {
    // Middle button (1) always pans; left button (0) only on empty space
    if (e.button === 1) {
      e.preventDefault();
    } else if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-part-id]")) return;
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
          cursor: isDrawing ? "crosshair" : "grab",
        }}
        onPointerDown={isDrawing ? undefined : handlePanStart}
        onPointerMove={isDrawing ? undefined : handlePanMove}
        onPointerUp={isDrawing ? undefined : handlePanEnd}
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
            onClick={handleCanvasClick}
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
                return (
                  <polyline
                    key={i}
                    points={wire.points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={wire.color}
                    strokeWidth={isHighlighted ? 3 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={hoveredPin ? (isHighlighted ? 1 : 0.2) : 0.85}
                    style={{ transition: "opacity 0.15s, stroke-width 0.15s" }}
                  />
                );
              })}
              {wireDrawing && (
                <polyline points={previewPath} fill="none" stroke="#0f0" strokeWidth={2}
                  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" opacity={0.9} />
              )}
            </svg>

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
                      onClick={(e) => { e.stopPropagation(); handlePinClick(pin.ref, pin.x, pin.y); }}
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
