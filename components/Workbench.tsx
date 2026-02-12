"use client";

import dynamic from "next/dynamic";
import styles from "./Workbench.module.css";
import EditorPanel from "./EditorPanel";
import SimulationPanel from "./SimulationPanel";
import { Diagram, DiagramConnection, DiagramLabel } from "@/lib/diagram-parser";
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
  pcbText: string | null;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onSketchChange: (code: string) => void;
  onDiagramChange: (json: string) => void;
  onPcbChange: (text: string) => void;
  onPcbSave: (text: string) => void;
  onAddPart: (partType: string) => void;
  onPartMove: (partId: string, top: number, left: number) => void;
  onAddConnection: (conn: DiagramConnection) => void;
  onAddLabel?: (label: DiagramLabel) => void;
  selectedPartId: string | null;
  onPartSelect: (partId: string | null) => void;
  onDeletePart: (partId: string) => void;
  onPartRotate: (partId: string, angle: number) => void;
  onPartAttrChange: (partId: string, attr: string, value: string) => void;
  placingPartId: string | null;
  onFinishPlacing: () => void;
  onInitPCB: () => void;
}

export default function Workbench({
  diagram,
  runner,
  status,
  serialOutput,
  sketchCode,
  diagramJson,
  pcbText,
  onStart,
  onStop,
  onPause,
  onResume,
  onRestart,
  onSketchChange,
  onDiagramChange,
  onPcbChange,
  onPcbSave,
  onAddPart,
  onPartMove,
  onAddConnection,
  onAddLabel,
  selectedPartId,
  onPartSelect,
  onDeletePart,
  onPartRotate,
  onPartAttrChange,
  placingPartId,
  onFinishPlacing,
  onInitPCB,
}: WorkbenchProps) {
  return (
    <div className={styles.workbench}>
      <div className={styles.splitContainer}>
        <SplitPane
          left={
            <EditorPanel
              sketchCode={sketchCode}
              diagramJson={diagramJson}
              pcbText={pcbText}
              onSketchChange={onSketchChange}
              onDiagramChange={onDiagramChange}
              onPcbChange={onPcbChange}
            />
          }
          right={
            <SimulationPanel
              diagram={diagram}
              runner={runner}
              status={status}
              serialOutput={serialOutput}
              pcbText={pcbText}
              onPcbSave={onPcbSave}
              onStart={onStart}
              onStop={onStop}
              onPause={onPause}
              onResume={onResume}
              onRestart={onRestart}
              onAddPart={onAddPart}
              onPartMove={onPartMove}
              onAddConnection={onAddConnection}
              onAddLabel={onAddLabel}
              selectedPartId={selectedPartId}
              onPartSelect={onPartSelect}
              onDeletePart={onDeletePart}
              onPartRotate={onPartRotate}
              onPartAttrChange={onPartAttrChange}
              placingPartId={placingPartId}
              onFinishPlacing={onFinishPlacing}
              onInitPCB={onInitPCB}
            />
          }
        />
      </div>
    </div>
  );
}
