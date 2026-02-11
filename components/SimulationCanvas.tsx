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

const MM_PX = 3.7795275591; // 1 mm in CSS pixels (96 dpi)
const GRID_MM = 1000; // grid size in mm
const GRID_PX = GRID_MM * MM_PX; // grid size in px
const RULER_SIZE = 28; // ruler thickness in px
const TICK_INTERVAL_MM = 25; // major tick every 25mm

let elementsLoaded = false;
function ensureElementsLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (elementsLoaded) return Promise.resolve();
  elementsLoaded = true;
  return import("@wokwi/elements").then(() => {
    return import("./DipChip").then((m) => m.registerDipChips());
  });
}

interface ElementPin {
  name: string;
  x: number;
  y: number;
}

interface CanvasPin {
  ref: string;
  x: number;
  y: number;
  name: string;
}

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

  if (!θ) {
    return { x: part.left + pin.x, y: part.top + pin.y };
  }

  const dx = pin.x - elWidth / 2;
  const dy = pin.y - elHeight / 2;
  const cos = Math.cos(θ);
  const sin = Math.sin(θ);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;

  return {
    x: part.left + elWidth / 2 + rx,
    y: part.top + elHeight / 2 + ry,
  };
}

export default function SimulationCanvas({
  diagram,
  runner,
  onPartMove,
  onAddConnection,
}: SimulationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const wiredRef = useRef<Map<string, WiredComponent>>(new Map());
  const [ready, setReady] = useState(false);
  const [wires, setWires] = useState<RenderedWire[]>([]);
  const [allPins, setAllPins] = useState<CanvasPin[]>([]);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });

  const {
    wireDrawing,
    isDrawing,
    previewPath,
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
  } = useWireDrawing({ containerRef, onAddConnection });

  const { attachDragHandlers } = useDragParts({ onPartMove });

  // Pan state
  const panRef = useRef<{
    startX: number;
    startY: number;
    origScrollLeft: number;
    origScrollTop: number;
  } | null>(null);

  const prevPartsKeyRef = useRef<string>("");

  useEffect(() => {
    ensureElementsLoaded().then(() => setReady(true));
  }, []);

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

    if (elementsWithPins < diag.parts.length / 2) {
      return false;
    }

    setWires(renderWires(diag.connections, pinPositions));
    setAllPins(pinList);
    return true;
  }, []);

  // Create DOM elements for each part
  useEffect(() => {
    if (!ready || !diagram || !containerRef.current) return;
    const container = containerRef.current;

    const partsKey = diagram.parts.map((p) => `${p.id}|${p.type}`).join(",");
    const isPositionOnly =
      prevPartsKeyRef.current === partsKey && prevPartsKeyRef.current !== "";
    prevPartsKeyRef.current = partsKey;

    if (isPositionOnly) {
      for (const part of diagram.parts) {
        const wrapper = container.querySelector(
          `[data-part-id="${part.id}"]`,
        ) as HTMLElement | null;
        if (wrapper) {
          wrapper.style.top = `${part.top}px`;
          wrapper.style.left = `${part.left}px`;
        }
      }
      let attempt = 0;
      const tryCompute = () => {
        attempt++;
        const success = computePinsAndWires(diagram);
        if (!success && attempt < 5) {
          setTimeout(tryCompute, attempt * 200);
        }
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
      wrapper.style.top = `${part.top}px`;
      wrapper.style.left = `${part.left}px`;
      wrapper.style.zIndex = "1";
      if (part.rotate) {
        wrapper.style.transform = `rotate(${part.rotate}deg)`;
      }
      wrapper.dataset.partId = part.id;

      attachDragHandlers(wrapper, part.id);

      const el = document.createElement(part.type);
      for (const [key, value] of Object.entries(part.attrs || {})) {
        el.setAttribute(key, value);
      }

      wrapper.appendChild(el);
      container.appendChild(wrapper);
      elementsRef.current.set(part.id, el);
    }

    let attempt = 0;
    const tryCompute = () => {
      attempt++;
      const success = computePinsAndWires(diagram);
      if (!success && attempt < 5) {
        setTimeout(tryCompute, attempt * 200);
      }
    };
    setTimeout(tryCompute, 400);
  }, [ready, diagram, attachDragHandlers, computePinsAndWires]);

  // Wire components to runner when runner starts
  useEffect(() => {
    if (!runner || !diagram || elementsRef.current.size === 0) return;

    cleanupWiring(wiredRef.current);
    const wired = wireComponents(runner, diagram);
    wiredRef.current = wired;

    for (const [id, wc] of wired) {
      const el = elementsRef.current.get(id);
      if (!el) continue;

      if (wc.part.type === "wokwi-led") {
        wc.onStateChange = (high) => {
          (el as any).value = high;
        };
      } else if (wc.part.type === "wokwi-buzzer") {
        wc.onStateChange = (high) => {
          (el as any).hasSignal = high;
        };
      } else if (wc.part.type === "wokwi-arduino-uno") {
        (el as any).ledPower = true;
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

    const handleKeyDown = (e: KeyboardEvent) => {
      const wc = keyMap.get(e.key);
      if (wc) wc.setPressed?.(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const wc = keyMap.get(e.key);
      if (wc) wc.setPressed?.(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cleanupWiring(wiredRef.current);
    };
  }, [runner, diagram]);

  // --- Pan handlers (grab empty space to scroll) ---
  const handlePanStart = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-part-id]")) return;

    const sp = scrollRef.current;
    if (!sp) return;

    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origScrollLeft: sp.scrollLeft,
      origScrollTop: sp.scrollTop,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const handlePanMove = useCallback((e: React.PointerEvent) => {
    if (!panRef.current) return;

    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;

    const sp = scrollRef.current;
    if (sp) {
      sp.scrollLeft = panRef.current.origScrollLeft - dx;
      sp.scrollTop = panRef.current.origScrollTop - dy;
    }
  }, []);

  const handlePanEnd = useCallback((e: React.PointerEvent) => {
    if (!panRef.current) return;
    panRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Find wires connected to the hovered pin
  const highlightedWireIndices = new Set<number>();
  if (hoveredPin) {
    wires.forEach((wire, i) => {
      if (wire.fromRef === hoveredPin || wire.toRef === hoveredPin) {
        highlightedWireIndices.add(i);
      }
    });
  }

  // Track scroll for ruler updates
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) setScrollPos({ x: el.scrollLeft, y: el.scrollTop });
  }, []);

  // Build ruler ticks
  const rulerTicks: number[] = [];
  for (let mm = 0; mm <= GRID_MM; mm += TICK_INTERVAL_MM) {
    rulerTicks.push(mm);
  }

  if (!diagram) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#666",
        }}
      >
        Loading diagram...
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Corner box with "Millimetres" label */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: RULER_SIZE,
          height: RULER_SIZE,
          background: "#1a1a1a",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRight: "1px solid #333",
          borderBottom: "1px solid #333",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 2,
          right: 8,
          zIndex: 30,
          fontSize: 10,
          color: "#666",
          fontFamily: "monospace",
          pointerEvents: "none",
        }}
      >
        Millimetres
      </div>

      {/* Top ruler */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: RULER_SIZE,
          right: 0,
          height: RULER_SIZE,
          background: "#1a1a1a",
          borderBottom: "1px solid #333",
          zIndex: 20,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: -scrollPos.x,
            width: GRID_PX,
            height: RULER_SIZE,
          }}
        >
          {rulerTicks.map((mm) => {
            const x = mm * MM_PX;
            return (
              <g key={mm}>
                <line x1={x} y1={RULER_SIZE - 8} x2={x} y2={RULER_SIZE} stroke="#c084fc" strokeWidth={1} />
                <text x={x + 3} y={12} fill="#888" fontSize={10} fontFamily="monospace">
                  {Math.round(mm)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Left ruler */}
      <div
        style={{
          position: "absolute",
          top: RULER_SIZE,
          left: 0,
          bottom: 0,
          width: RULER_SIZE,
          background: "#1a1a1a",
          borderRight: "1px solid #333",
          zIndex: 20,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <svg
          style={{
            position: "absolute",
            top: -scrollPos.y,
            left: 0,
            width: RULER_SIZE,
            height: GRID_PX,
          }}
        >
          {rulerTicks.map((mm) => {
            const y = mm * MM_PX;
            return (
              <g key={mm}>
                <line x1={RULER_SIZE - 8} y1={y} x2={RULER_SIZE} y2={y} stroke="#c084fc" strokeWidth={1} />
                <text x={2} y={y + 12} fill="#888" fontSize={10} fontFamily="monospace">
                  {Math.round(mm)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Scrollable canvas area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          position: "absolute",
          top: RULER_SIZE,
          left: RULER_SIZE,
          right: 0,
          bottom: 0,
          overflow: "auto",
        }}
      >
        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onPointerDown={isDrawing ? undefined : handlePanStart}
          onPointerMove={isDrawing ? undefined : handlePanMove}
          onPointerUp={isDrawing ? undefined : handlePanEnd}
          style={{
            position: "relative",
            width: GRID_PX,
            height: GRID_PX,
            cursor: isDrawing ? "crosshair" : "grab",
          }}
        >
          {/* Dot grid background */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <defs>
              <pattern
                id="mm-grid"
                width={MM_PX}
                height={MM_PX}
                patternUnits="userSpaceOnUse"
              >
                <circle cx={MM_PX / 2} cy={MM_PX / 2} r={0.5} fill="#555" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mm-grid)" />
          </svg>

          {/* Wire SVG overlay */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 5,
              overflow: "visible",
            }}
          >
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
                  opacity={
                    hoveredPin
                      ? isHighlighted
                        ? 1
                        : 0.2
                      : 0.85
                  }
                  style={{
                    transition: "opacity 0.15s, stroke-width 0.15s",
                  }}
                />
              );
            })}

            {/* Wire drawing preview */}
            {wireDrawing && (
              <polyline
                points={previewPath}
                fill="none"
                stroke="#0f0"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 3"
                opacity={0.9}
              />
            )}
          </svg>

          {/* Pin hit areas + highlights */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 10,
              overflow: "visible",
            }}
          >
            {allPins.map((pin) => {
              const isHovered = hoveredPin === pin.ref;
              const isWireStart = wireDrawing?.fromRef === pin.ref;
              return (
                <g key={pin.ref}>
                  {(isHovered || isWireStart) && (
                    <>
                      <circle
                        cx={pin.x}
                        cy={pin.y}
                        r={8}
                        fill={isWireStart ? "rgba(0, 255, 0, 0.3)" : "rgba(0, 200, 0, 0.25)"}
                        stroke={isWireStart ? "#0f0" : "#0c0"}
                        strokeWidth={2}
                      />
                      <circle
                        cx={pin.x}
                        cy={pin.y}
                        r={3}
                        fill={isWireStart ? "#0f0" : "#0c0"}
                      />
                    </>
                  )}
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={10}
                    fill="transparent"
                    style={{ pointerEvents: "all", cursor: "crosshair" }}
                    onMouseEnter={() => {
                      setHoveredPin(pin.ref);
                      setTooltipPos({ x: pin.x, y: pin.y });
                    }}
                    onMouseLeave={() => setHoveredPin(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinClick(pin.ref, pin.x, pin.y);
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Pin tooltip */}
          {hoveredPin && (
            <div
              style={{
                position: "absolute",
                left: tooltipPos.x + 12,
                top: tooltipPos.y - 32,
                background: "rgba(0, 0, 0, 0.9)",
                color: "#0c0",
                padding: "4px 10px",
                borderRadius: 4,
                fontSize: 13,
                fontFamily: "'Cascadia Code', 'Fira Code', monospace",
                fontWeight: 600,
                whiteSpace: "nowrap",
                zIndex: 20,
                pointerEvents: "none",
                border: "1px solid #0c0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              {hoveredPin}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
