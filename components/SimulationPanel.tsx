"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Tabs from "./Tabs";
import DiagramCanvas from "./DiagramCanvas";
import SimulationControls from "./SimulationControls";
import SerialMonitor from "./SerialMonitor";
import PartAttributePanel from "./PartAttributePanel";
import WireAttributePanel from "./WireAttributePanel";
import LibraryManager from "./LibraryManager";
import styles from "./SimulationPanel.module.css";
import { Diagram, DiagramConnection } from "@/lib/diagram-parser";
import type { AVRRunnerLike } from "@/lib/pin-mapping";
import type { WiredComponent } from "@/lib/wire-components";
import type { ToolType } from "@/hooks/useWireDrawing";
import type { UseDebuggerReturn } from "@/hooks/useDebugger";

const DebugPanel = dynamic(() => import("./debug/DebugPanel"), { ssr: false });

// Dynamic import for PCB editor (no SSR — WebGL)
const KiPCBEditor = dynamic(() => import("./KiPCBEditor"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888", fontFamily: "monospace" }}>
      Loading PCB editor...
    </div>
  ),
});

// Dynamic import for PCB 3D viewer (no SSR — Three.js/WebGL)
const PCB3DViewer = dynamic(() => import("./PCB3DViewer"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888", fontFamily: "monospace" }}>
      Loading 3D viewer...
    </div>
  ),
});

interface SimulationPanelProps {
  diagram: Diagram | null;
  runner: AVRRunnerLike | null;
  status: "idle" | "compiling" | "running" | "paused" | "error";
  serialOutput: string;
  pcbText: string | null;
  onPcbSave: (text: string) => void;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onAddPart: (partType: string) => void;
  onPartMove: (partId: string, top: number, left: number) => void;
  onAddConnection: (conn: DiagramConnection) => void;
  onUpdateConnection: (index: number, conn: DiagramConnection) => void;
  onDeleteConnection: (index: number) => void;
  onWireColorChange: (index: number, color: string) => void;
  selectedPartId: string | null;
  onPartSelect: (partId: string | null) => void;
  onDeletePart: (partId: string) => void;
  onPartRotate: (partId: string, angle: number) => void;
  onDuplicatePart: (partId: string) => void;
  onPartAttrChange: (partId: string, attr: string, value: string) => void;
  placingPartId: string | null;
  onFinishPlacing: () => void;
  showGrid: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onToggleGrid?: () => void;
  onUpdateFromDiagram: () => void;
  onSaveOutline: (svgText: string) => void;
  mcuId?: string;
  mcuOptions?: { id: string; label: string }[];
  onMcuChange?: (id: string) => void;
  librariesTxt?: string;
  onLibrariesChange?: (text: string) => void;
  projectId?: string;
  debugMode?: boolean;
  debugState?: UseDebuggerReturn | null;
  onStartDebug?: () => void;
}

export default function SimulationPanel({
  diagram,
  runner,
  status,
  serialOutput,
  pcbText,
  onPcbSave,
  onStart,
  onStop,
  onPause,
  onResume,
  onRestart,
  onAddPart,
  onPartMove,
  onAddConnection,
  onUpdateConnection,
  onDeleteConnection,
  onWireColorChange,
  selectedPartId,
  onPartSelect,
  onDeletePart,
  onPartRotate,
  onDuplicatePart,
  onPartAttrChange,
  placingPartId,
  onFinishPlacing,
  showGrid,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleGrid,
  onUpdateFromDiagram,
  onSaveOutline,
  mcuId,
  mcuOptions,
  onMcuChange,
  librariesTxt,
  onLibrariesChange,
  projectId,
  debugMode,
  debugState,
  onStartDebug,
}: SimulationPanelProps) {
  const [activeTab, setActiveTab] = useState("simulation");
  const [activeTool, setActiveTool] = useState<ToolType>("cursor");
  const [selectedConnectionIdx, setSelectedConnectionIdx] = useState<number | null>(null);
  const [wiredComponents, setWiredComponents] = useState<Map<string, WiredComponent>>(new Map());

  const simTabs = useMemo(() => [
    { id: "simulation", label: "Diagram" },
    { id: "pcb", label: "PCB" },
    { id: "pcb3d", label: "PCB 3D Viewer" },
    { id: "libraries", label: "Library Manager" },
    { id: "debugger", label: "Debugger" },
  ], []);

  const [showInlineDebug, setShowInlineDebug] = useState(true);
  const [inlineDebugHeight, setInlineDebugHeight] = useState(280);
  const debugResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Auto-switch to debugger tab when debug session starts
  useEffect(() => {
    if (debugMode && debugState && debugState.status !== "idle") {
      setShowInlineDebug(true);
    }
  }, [debugMode, debugState?.status]);

  const handleDebugResizeDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    debugResizeRef.current = { startY: e.clientY, startHeight: inlineDebugHeight };
    const el = e.currentTarget as HTMLElement;
    el.classList.add(styles.inlineDebugResizeActive);

    const onMove = (ev: MouseEvent) => {
      if (!debugResizeRef.current) return;
      const delta = debugResizeRef.current.startY - ev.clientY;
      setInlineDebugHeight(Math.min(Math.max(debugResizeRef.current.startHeight + delta, 120), 600));
    };
    const onUp = () => {
      debugResizeRef.current = null;
      el.classList.remove(styles.inlineDebugResizeActive);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [inlineDebugHeight]);

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== "simulation" && tabId !== "debugger" && (status === "running" || status === "paused")) {
      onStop();
    }
    setActiveTab(tabId);
  }, [status, onStop]);

  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
  }, []);

  const handleWireSelect = useCallback((connectionIndex: number | null) => {
    setSelectedConnectionIdx(connectionIndex);
  }, []);

  const handleWireDelete = useCallback((index: number) => {
    onDeleteConnection(index);
    setSelectedConnectionIdx(null);
  }, [onDeleteConnection]);

  const debugActive = !!(debugMode && debugState && debugState.status !== "idle");

  const statusLabel =
    status === "compiling"
      ? "Compiling..."
      : status === "running"
        ? "Running"
        : status === "paused"
          ? "Paused"
          : status === "error"
            ? "Error"
            : "Stopped";

  return (
    <div className={styles.panel}>
      <Tabs tabs={simTabs} activeId={activeTab} onTabChange={handleTabChange} />
      <div className={styles.body}>
        {activeTab === "simulation" ? (
          <div className={debugActive && showInlineDebug ? styles.diagramDebugSplit : undefined} style={!(debugActive && showInlineDebug) ? { height: "100%" } : undefined}>
            <div className={debugActive && showInlineDebug ? styles.diagramArea : styles.canvas} style={!(debugActive && showInlineDebug) ? { width: "100%", height: "100%" } : undefined}>
              <div className={styles.canvas}>
                <DiagramCanvas
                  diagram={diagram}
                  runner={runner}
                  activeTool={activeTool}
                  onToolChange={handleToolChange}
                  onPartMove={onPartMove}
                  onAddConnection={onAddConnection}
                  onUpdateConnection={onUpdateConnection}
                  onDeleteConnection={onDeleteConnection}
                  onWireSelect={handleWireSelect}
                  onWireColorChange={onWireColorChange}
                  selectedPartId={selectedPartId}
                  onPartSelect={onPartSelect}
                  onDeletePart={onDeletePart}
                  onPartRotate={onPartRotate}
                  onDuplicatePart={onDuplicatePart}
                  placingPartId={placingPartId}
                  onFinishPlacing={onFinishPlacing}
                  showGrid={showGrid}
                  mcuId={mcuId}
                  simRunning={status === "running" || status === "paused"}
                  onWiredComponentsChange={setWiredComponents}
                />
              </div>

              {/* Status bar */}
              <div className={styles.statusBar}>
                <span
                  className={`${styles.statusDot} ${
                    status === "running" || status === "paused"
                      ? styles.running
                      : status === "compiling"
                        ? styles.compiling
                        : status === "error"
                          ? styles.error
                          : ""
                  }`}
                />
                <span>{statusLabel}</span>
              </div>

              {/* Controls */}
              <div className={styles.controls}>
                <SimulationControls
                  status={status}
                  runner={runner}
                  onStart={onStart}
                  onStop={onStop}
                  onPause={onPause}
                  onResume={onResume}
                  onRestart={onRestart}
                  onAddPart={onAddPart}
                  onUndo={onUndo}
                  onRedo={onRedo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onToggleGrid={onToggleGrid}
                  mcuId={mcuId}
                  mcuOptions={mcuOptions}
                  onMcuChange={onMcuChange}
                />
              </div>

              {/* Part attribute panel — hide for non-interactive parts while sim is running */}
              {selectedPartId && diagram && (() => {
                const part = diagram.parts.find((p) => p.id === selectedPartId) ?? null;
                const simRunning = status === "running" || status === "paused";
                const RUNTIME_INTERACTIVE_TYPES = new Set([
                  "wokwi-dht22", "wokwi-mpu6050", "wokwi-bmp180", "wokwi-ds18b20",
                  "wokwi-potentiometer", "wokwi-slide-potentiometer",
                  "wokwi-analog-joystick", "wokwi-temperature-sensor",
                  "wokwi-hx711", "wokwi-ntc-temperature-sensor",
                  "wokwi-pir-motion-sensor", "wokwi-clock-generator",
                ]);
                const showPanel = !simRunning || (part && RUNTIME_INTERACTIVE_TYPES.has(part.type));
                return showPanel ? (
                  <PartAttributePanel
                    part={part}
                    wiredComponent={wiredComponents.get(selectedPartId) ?? null}
                    onAttrChange={(attr, value) => onPartAttrChange(selectedPartId, attr, value)}
                    onRotate={(angle) => onPartRotate(selectedPartId, angle)}
                    onDelete={() => onDeletePart(selectedPartId)}
                    onClose={() => onPartSelect(null)}
                  />
                ) : null;
              })()}

              {/* Wire attribute panel */}
              {selectedConnectionIdx !== null && !selectedPartId && diagram && diagram.connections[selectedConnectionIdx] && (
                <WireAttributePanel
                  connection={diagram.connections[selectedConnectionIdx]}
                  connectionIndex={selectedConnectionIdx}
                  onColorChange={onWireColorChange}
                  onDelete={handleWireDelete}
                  onClose={() => setSelectedConnectionIdx(null)}
                />
              )}
            </div>

            {/* Inline debug panel below diagram when debug is active */}
            {debugActive && showInlineDebug && (
              <>
                <div className={styles.inlineDebugResize} onMouseDown={handleDebugResizeDown} />
                <div className={styles.inlineDebugPanel} style={{ height: inlineDebugHeight }}>
                  <DebugPanel debug={debugState!} />
                </div>
              </>
            )}
          </div>
        ) : activeTab === "pcb" ? (
            <KiPCBEditor
              initialPcbText={pcbText}
              onSave={onPcbSave}
              onUpdateFromDiagram={onUpdateFromDiagram}
              onSaveOutline={onSaveOutline}
              projectId={projectId}
            />
        ) : activeTab === "pcb3d" ? (
          <PCB3DViewer pcbText={pcbText} />
        ) : activeTab === "libraries" ? (
          <LibraryManager
            librariesTxt={librariesTxt ?? ""}
            onLibrariesChange={onLibrariesChange ?? (() => {})}
          />
        ) : activeTab === "debugger" ? (
          debugMode && debugState && debugState.status !== "idle" ? (
            <DebugPanel debug={debugState} />
          ) : (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 16,
              color: "#888",
              fontFamily: '"Cascadia Code", "Fira Code", monospace',
            }}>
              <div style={{ fontSize: 13, color: "#666", textAlign: "center", maxWidth: 280, lineHeight: 1.6 }}>
                Step through AVR instructions, set breakpoints, inspect registers and memory.
              </div>
              {onStartDebug && (
                <button
                  onClick={onStartDebug}
                  disabled={debugState?.status === "compiling"}
                  style={{
                    background: debugState?.status === "compiling" ? "#444" : "#7c3aed",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "10px 24px",
                    fontSize: 13,
                    fontFamily: '"Cascadia Code", "Fira Code", monospace',
                    cursor: debugState?.status === "compiling" ? "wait" : "pointer",
                  }}
                >
                  {debugState?.status === "compiling" ? "Compiling..." : "Start Debug Session"}
                </button>
              )}
              <div style={{ fontSize: 11, color: "#555", textAlign: "center" }}>
                F5 Run/Pause &middot; F10 Step &middot; F11 Step Over &middot; F9 Reset &middot; Esc Stop
              </div>
            </div>
          )
        ) : null}
      </div>
      <SerialMonitor
        output={debugMode && debugState ? debugState.serialOutput : serialOutput}
        visible={
          (activeTab === "simulation" && (status === "running" || status === "paused" || status === "error"))
          || (activeTab === "debugger" && !!(debugMode && debugState && debugState.status !== "idle"))
        }
        isError={status === "error" || (debugState?.status === "error") || false}
        onDebugWithSparky={(errorText) => {
          window.dispatchEvent(new CustomEvent("sparkbench:debug-with-sparky", { detail: errorText }));
        }}
      />
    </div>
  );
}
