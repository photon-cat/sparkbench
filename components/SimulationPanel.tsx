"use client";

import { useState, useCallback, useMemo } from "react";
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
import { AVRRunner } from "@/lib/avr-runner";
import type { WiredComponent } from "@/lib/wire-components";
import type { ToolType } from "@/hooks/useWireDrawing";

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
  runner: AVRRunner | null;
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
  slug?: string;
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
  slug,
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
  ], []);

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== "simulation" && (status === "running" || status === "paused")) {
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
          <>
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
              // Parts with runtime-changeable values (sensors, analog inputs, etc.)
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
          </>
        ) : activeTab === "pcb" ? (
            <KiPCBEditor
              initialPcbText={pcbText}
              onSave={onPcbSave}
              onUpdateFromDiagram={onUpdateFromDiagram}
              onSaveOutline={onSaveOutline}
              slug={slug}
            />
        ) : activeTab === "pcb3d" ? (
          <PCB3DViewer pcbText={pcbText} />
        ) : activeTab === "libraries" ? (
          <LibraryManager
            librariesTxt={librariesTxt ?? ""}
            onLibrariesChange={onLibrariesChange ?? (() => {})}
          />
        ) : null}
      </div>
      <SerialMonitor
        output={serialOutput}
        visible={activeTab === "simulation" && (status === "running" || status === "paused" || status === "error")}
        isError={status === "error"}
        onDebugWithSparky={(errorText) => {
          window.dispatchEvent(new CustomEvent("sparkbench:debug-with-sparky", { detail: errorText }));
        }}
      />
    </div>
  );
}
