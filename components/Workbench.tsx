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
  pcbText: string | null;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  projectFiles: { name: string; content: string }[];
  onSketchChange: (code: string) => void;
  onDiagramChange: (json: string) => void;
  onPcbChange: (text: string) => void;
  onPcbSave: (text: string) => void;
  onAddFile: (name: string) => void;
  onDeleteFile: (name: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
  onFileContentChange: (name: string, content: string) => void;
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
  projectFiles,
  onSketchChange,
  onDiagramChange,
  onPcbChange,
  onPcbSave,
  onAddFile,
  onDeleteFile,
  onRenameFile,
  onFileContentChange,
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
              projectFiles={projectFiles}
              onSketchChange={onSketchChange}
              onDiagramChange={onDiagramChange}
              onPcbChange={onPcbChange}
              onAddFile={onAddFile}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
              onFileContentChange={onFileContentChange}
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
              onUpdateConnection={onUpdateConnection}
              onDeleteConnection={onDeleteConnection}
              onWireColorChange={onWireColorChange}
              selectedPartId={selectedPartId}
              onPartSelect={onPartSelect}
              onDeletePart={onDeletePart}
              onPartRotate={onPartRotate}
              onDuplicatePart={onDuplicatePart}
              onPartAttrChange={onPartAttrChange}
              placingPartId={placingPartId}
              onFinishPlacing={onFinishPlacing}
              showGrid={showGrid}
              onUndo={onUndo}
              onRedo={onRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              onToggleGrid={onToggleGrid}
              onUpdateFromDiagram={onUpdateFromDiagram}
              onSaveOutline={onSaveOutline}
              mcuId={mcuId}
              mcuOptions={mcuOptions}
              onMcuChange={onMcuChange}
            />
          }
        />
      </div>
    </div>
  );
}
