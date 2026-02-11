"use client";

import dynamic from "next/dynamic";
import styles from "./Workbench.module.css";
import EditorPanel from "./EditorPanel";
import SimulationPanel from "./SimulationPanel";
import { Diagram, DiagramConnection } from "@/lib/diagram-parser";
import { AVRRunner } from "@/lib/avr-runner";

// SplitPane wraps Allotment and imports its CSS — must skip SSR
const SplitPane = dynamic(() => import("./SplitPane"), { ssr: false });

interface WorkbenchProps {
  diagram: Diagram | null;
  runner: AVRRunner | null;
  status: "idle" | "compiling" | "running" | "paused" | "error";
  serialOutput: string;
  sketchCode: string;
  diagramJson: string;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onSketchChange: (code: string) => void;
  onDiagramChange: (json: string) => void;
  onAddPart: (partType: string) => void;
  onPartMove: (partId: string, top: number, left: number) => void;
  onAddConnection: (conn: DiagramConnection) => void;
}

export default function Workbench({
  diagram,
  runner,
  status,
  serialOutput,
  sketchCode,
  diagramJson,
  onStart,
  onStop,
  onPause,
  onResume,
  onRestart,
  onSketchChange,
  onDiagramChange,
  onAddPart,
  onPartMove,
  onAddConnection,
}: WorkbenchProps) {
  return (
    <div className={styles.workbench}>
      <div className={styles.splitContainer}>
        <SplitPane
          left={
            <EditorPanel
              sketchCode={sketchCode}
              diagramJson={diagramJson}
              onSketchChange={onSketchChange}
              onDiagramChange={onDiagramChange}
            />
          }
          right={
            <SimulationPanel
              diagram={diagram}
              runner={runner}
              status={status}
              serialOutput={serialOutput}
              onStart={onStart}
              onStop={onStop}
              onPause={onPause}
              onResume={onResume}
              onRestart={onRestart}
              onAddPart={onAddPart}
              onPartMove={onPartMove}
              onAddConnection={onAddConnection}
            />
          }
        />
      </div>
    </div>
  );
}
