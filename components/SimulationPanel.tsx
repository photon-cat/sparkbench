"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Tabs from "./Tabs";
import SimulationCanvas from "./SimulationCanvas";
import SimulationControls from "./SimulationControls";
import SerialMonitor from "./SerialMonitor";
import ToolPalette, { type ToolType } from "./ToolPalette";
import PartAttributePanel from "./PartAttributePanel";
import WireAttributePanel from "./WireAttributePanel";
import NetlabelAttributePanel from "./NetlabelAttributePanel";
import styles from "./SimulationPanel.module.css";
import { Diagram, DiagramConnection, DiagramLabel } from "@/lib/diagram-parser";
import { AVRRunner } from "@/lib/avr-runner";
import { extractNetlist } from "@/lib/netlist";

// Dynamic import for PCB editor (no SSR — WebGL)
const KiPCBEditor = dynamic(() => import("./KiPCBEditor"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888", fontFamily: "monospace" }}>
      Loading PCB editor...
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
  onAddLabel?: (label: DiagramLabel) => void;
  onUpdateLabel?: (labelId: string, name: string) => void;
  onDeleteLabel?: (labelId: string) => void;
  onMoveLabel?: (labelId: string, x: number, y: number) => void;
  selectedPartId: string | null;
  selectedLabelId: string | null;
  onPartSelect: (partId: string | null) => void;
  onLabelSelect: (labelId: string | null) => void;
  onDeletePart: (partId: string) => void;
  onPartRotate: (partId: string, angle: number) => void;
  onPartAttrChange: (partId: string, attr: string, value: string) => void;
  placingPartId: string | null;
  onFinishPlacing: () => void;
  placingLabelId: string | null;
  onFinishPlacingLabel: () => void;
  onCancelPlacingLabel: () => void;
  onPlaceLabelAt: (labelId: string, pinRef: string, x: number, y: number) => void;
  onInitPCB: () => void;
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
  onAddLabel,
  onUpdateLabel,
  onDeleteLabel,
  onMoveLabel,
  selectedPartId,
  selectedLabelId,
  onPartSelect,
  onLabelSelect,
  onDeletePart,
  onPartRotate,
  onPartAttrChange,
  placingPartId,
  onFinishPlacing,
  placingLabelId,
  onFinishPlacingLabel,
  onCancelPlacingLabel,
  onPlaceLabelAt,
  onInitPCB,
}: SimulationPanelProps) {
  const [activeTab, setActiveTab] = useState("simulation");
  const [activeTool, setActiveTool] = useState<ToolType>("cursor");
  const [selectedConnectionIdx, setSelectedConnectionIdx] = useState<number | null>(null);

  const simTabs = useMemo(() => [
    { id: "simulation", label: "Diagram" },
    { id: "pcb", label: "PCB" },
    { id: "description", label: "Description" },
  ], []);

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

  // Compute net name for selected connection
  const selectedWireNetName = useMemo(() => {
    if (selectedConnectionIdx === null || !diagram) return "";
    const conn = diagram.connections[selectedConnectionIdx];
    if (!conn) return "";
    const netlist = extractNetlist(diagram);
    return netlist.pinToNet.get(conn[0]) ?? netlist.pinToNet.get(conn[1]) ?? "unconnected";
  }, [selectedConnectionIdx, diagram]);

  // Handle net name change: add/update a global netlabel on the wire's pin
  const handleNetNameChange = useCallback((netName: string, pinRef: string) => {
    if (!diagram) return;
    // Find existing label on any pin in this net
    const conn = selectedConnectionIdx !== null ? diagram.connections[selectedConnectionIdx] : null;
    if (!conn) return;

    // Find existing label attached to either pin of this connection
    const labels = diagram.labels ?? [];
    const existing = labels.find((l) =>
      l.pinRef === conn[0] || l.pinRef === conn[1]
    );

    if (existing) {
      onUpdateLabel?.(existing.id, netName);
    } else {
      // Create a new global netlabel on the fromRef pin
      onAddLabel?.({
        id: `label-${Date.now()}`,
        name: netName,
        pinRef,
        x: 0,
        y: 0,
      });
    }
  }, [diagram, selectedConnectionIdx, onUpdateLabel, onAddLabel]);

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
      <Tabs tabs={simTabs} activeId={activeTab} onTabChange={setActiveTab} />
      <div className={styles.body}>
        {activeTab === "simulation" ? (
          <>
            <div className={styles.canvas}>
              <SimulationCanvas
                diagram={diagram}
                runner={runner}
                activeTool={activeTool}
                onToolChange={handleToolChange}
                onPartMove={onPartMove}
                onAddConnection={onAddConnection}
                onUpdateConnection={onUpdateConnection}
                onDeleteConnection={onDeleteConnection}
                onWireSelect={handleWireSelect}
                onAddLabel={onAddLabel}
                onDeleteLabel={onDeleteLabel}
                onMoveLabel={onMoveLabel}
                selectedPartId={selectedPartId}
                selectedLabelId={selectedLabelId}
                onPartSelect={onPartSelect}
                onLabelSelect={onLabelSelect}
                onDeletePart={onDeletePart}
                onPartRotate={onPartRotate}
                placingPartId={placingPartId}
                onFinishPlacing={onFinishPlacing}
                placingLabelId={placingLabelId}
                onFinishPlacingLabel={onFinishPlacingLabel}
                onCancelPlacingLabel={onCancelPlacingLabel}
                onPlaceLabelAt={onPlaceLabelAt}
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
              />
            </div>

            {/* Tool palette */}
            <ToolPalette activeTool={activeTool} onToolChange={handleToolChange} />

            {/* Part attribute panel */}
            {selectedPartId && diagram && (
              <PartAttributePanel
                part={diagram.parts.find((p) => p.id === selectedPartId) ?? null}
                onAttrChange={(attr, value) => onPartAttrChange(selectedPartId, attr, value)}
                onRotate={(angle) => onPartRotate(selectedPartId, angle)}
                onDelete={() => onDeletePart(selectedPartId)}
                onClose={() => onPartSelect(null)}
              />
            )}

            {/* Wire attribute panel */}
            {selectedConnectionIdx !== null && !selectedPartId && !selectedLabelId && diagram && diagram.connections[selectedConnectionIdx] && (
              <WireAttributePanel
                connection={diagram.connections[selectedConnectionIdx]}
                connectionIndex={selectedConnectionIdx}
                netName={selectedWireNetName}
                onColorChange={onWireColorChange}
                onNetNameChange={handleNetNameChange}
                onDelete={handleWireDelete}
                onClose={() => setSelectedConnectionIdx(null)}
              />
            )}

            {/* Netlabel attribute panel */}
            {selectedLabelId && !selectedPartId && diagram && (() => {
              const label = (diagram.labels ?? []).find((l) => l.id === selectedLabelId);
              if (!label) return null;
              return (
                <NetlabelAttributePanel
                  label={label}
                  onNameChange={(name) => onUpdateLabel?.(selectedLabelId, name)}
                  onDelete={() => { onDeleteLabel?.(selectedLabelId); onLabelSelect(null); }}
                  onClose={() => onLabelSelect(null)}
                />
              );
            })()}
          </>
        ) : activeTab === "pcb" ? (
          pcbText !== null ? (
            <KiPCBEditor
              initialPcbText={pcbText}
              onSave={onPcbSave}
            />
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 16, color: "#999",
              fontFamily: "monospace",
            }}>
              <div style={{ fontSize: 14, color: "#ccc" }}>No PCB layout yet</div>
              <div style={{ fontSize: 12, maxWidth: 280, textAlign: "center", lineHeight: 1.5 }}>
                Generate an initial board layout from your schematic diagram with footprints placed in a grid.
              </div>
              <button
                onClick={onInitPCB}
                style={{
                  padding: "8px 20px", background: "#1a5c2a", border: "1px solid #2a8a42",
                  borderRadius: 4, color: "#fff", fontSize: 13, cursor: "pointer",
                  fontFamily: "monospace", fontWeight: 600,
                }}
              >
                Initialize from Schematic
              </button>
            </div>
          )
        ) : (
          <div style={{ padding: 16, color: "#999" }}>
            <h3 style={{ color: "#ccc", marginBottom: 8 }}>
              Project Description
            </h3>
            <p>
              Select the Diagram tab to view and edit the schematic,
              or the PCB tab to edit the board layout.
            </p>
          </div>
        )}
      </div>
      <SerialMonitor output={serialOutput} visible={activeTab === "simulation" && (status === "running" || status === "paused")} />
    </div>
  );
}
