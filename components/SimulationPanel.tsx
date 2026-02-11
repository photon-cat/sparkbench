"use client";

import { useState, useCallback } from "react";
import Tabs from "./Tabs";
import SimulationCanvas from "./SimulationCanvas";
import SimulationControls from "./SimulationControls";
import SerialMonitor from "./SerialMonitor";
import ToolPalette, { type ToolType } from "./ToolPalette";
import styles from "./SimulationPanel.module.css";
import { Diagram, DiagramConnection, DiagramLabel } from "@/lib/diagram-parser";
import { AVRRunner } from "@/lib/avr-runner";

const SIM_TABS = [
  { id: "simulation", label: "Diagram" },
  { id: "description", label: "Description" },
];

interface SimulationPanelProps {
  diagram: Diagram | null;
  runner: AVRRunner | null;
  status: "idle" | "compiling" | "running" | "paused" | "error";
  serialOutput: string;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onAddPart: (partType: string) => void;
  onPartMove: (partId: string, top: number, left: number) => void;
  onAddConnection: (conn: DiagramConnection) => void;
  onAddLabel?: (label: DiagramLabel) => void;
}

export default function SimulationPanel({
  diagram,
  runner,
  status,
  serialOutput,
  onStart,
  onStop,
  onPause,
  onResume,
  onRestart,
  onAddPart,
  onPartMove,
  onAddConnection,
  onAddLabel,
}: SimulationPanelProps) {
  const [activeTab, setActiveTab] = useState("simulation");
  const [activeTool, setActiveTool] = useState<ToolType>("cursor");

  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
  }, []);

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
      <Tabs tabs={SIM_TABS} activeId={activeTab} onTabChange={setActiveTab} />
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
                onAddLabel={onAddLabel}
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
          </>
        ) : (
          <div style={{ padding: 16, color: "#999" }}>
            <h3 style={{ color: "#ccc", marginBottom: 8 }}>
              Simon Game with Score Display
            </h3>
            <p>
              A Simon memory game with 4 LEDs, 4 buttons, a buzzer, and a
              7-segment score display. Built for Arduino Uno.
            </p>
          </div>
        )}
      </div>
      <SerialMonitor output={serialOutput} visible={status === "running" || status === "paused"} />
    </div>
  );
}
