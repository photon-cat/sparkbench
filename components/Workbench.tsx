"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import styles from "./Workbench.module.css";
import EditorPanel from "./EditorPanel";
import SimulationPanel from "./SimulationPanel";
import SparkyChat, { type FileSnapshot } from "./SparkyChat";
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
  librariesTxt?: string;
  onLibrariesChange?: (text: string) => void;
  sparkyOpen?: boolean;
  onSparkyToggle?: () => void;
  slug?: string;
  onProjectChanged?: () => void;
  onChangesReady?: (snapshot: FileSnapshot) => void;
  onRevertChanges?: (snapshot: FileSnapshot) => void;
  onAcceptChanges?: () => void;
  onSimStart?: () => void;
  onSimStop?: () => void;
  pendingReview?: FileSnapshot | null;
  currentSnapshot?: FileSnapshot | null;
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
  librariesTxt,
  onLibrariesChange,
  sparkyOpen,
  onSparkyToggle,
  slug,
  onProjectChanged,
  onChangesReady,
  onRevertChanges,
  onAcceptChanges,
  onSimStart,
  onSimStop,
  pendingReview,
  currentSnapshot,
}: WorkbenchProps) {
  const [chatWidth, setChatWidth] = useState(400);
  const dividerRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dividerRef.current = { startX: e.clientX, startWidth: chatWidth };
    const div = e.currentTarget as HTMLElement;
    div.classList.add(styles.chatDividerActive);

    const onMove = (ev: MouseEvent) => {
      if (!dividerRef.current) return;
      const delta = dividerRef.current.startX - ev.clientX;
      setChatWidth(Math.min(Math.max(dividerRef.current.startWidth + delta, 280), 700));
    };
    const onUp = () => {
      dividerRef.current = null;
      div.classList.remove(styles.chatDividerActive);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [chatWidth]);

  return (
    <div className={styles.workbench}>
      <div className={styles.mainRow}>
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
                librariesTxt={librariesTxt}
                onLibrariesChange={onLibrariesChange}
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
                librariesTxt={librariesTxt}
                onLibrariesChange={onLibrariesChange}
              />
            }
          />
        </div>
        {!!sparkyOpen && slug && onSparkyToggle && (
          <>
            <div className={styles.chatDivider} onMouseDown={handleDividerDown} />
            <div className={styles.chatSidePanel} style={{ width: chatWidth }}>
              <SparkyChat
                open={!!sparkyOpen}
                onToggle={onSparkyToggle}
                slug={slug}
                diagramJson={diagramJson}
                sketchCode={sketchCode}
                pcbText={pcbText}
                librariesTxt={librariesTxt || ""}
                projectFiles={projectFiles}
                onProjectChanged={onProjectChanged}
                onChangesReady={onChangesReady}
                onRevertChanges={onRevertChanges}
                onAcceptChanges={onAcceptChanges}
                onSimStart={onSimStart}
                onSimStop={onSimStop}
                onUpdatePCB={onUpdateFromDiagram}
                pendingReview={pendingReview}
                currentSnapshot={currentSnapshot}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
