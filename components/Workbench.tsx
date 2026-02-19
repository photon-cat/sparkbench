"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import styles from "./Workbench.module.css";
import EditorPanel from "./EditorPanel";
import SimulationPanel from "./SimulationPanel";
import SparkyChat, { type FileSnapshot } from "./SparkyChat";
import { Diagram, DiagramConnection } from "@/lib/diagram-parser";
import type { AVRRunnerLike } from "@/lib/pin-mapping";
import type { UseDebuggerReturn } from "@/hooks/useDebugger";

// SplitPane wraps Allotment and imports its CSS — must skip SSR
const SplitPane = dynamic(() => import("./SplitPane"), { ssr: false });

interface WorkbenchProps {
  diagram: Diagram | null;
  runner: AVRRunnerLike | null;
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
  projectId?: string;
  onProjectChanged?: () => void;
  onChangesReady?: (snapshot: FileSnapshot) => void;
  onRevertChanges?: (snapshot: FileSnapshot) => void;
  onAcceptChanges?: () => void;
  onSimStart?: () => void;
  onSimStop?: () => void;
  pendingReview?: FileSnapshot | null;
  currentSnapshot?: FileSnapshot | null;
  initialMessage?: string | null;
  onInitialMessageConsumed?: () => void;
  debugMode?: boolean;
  debugState?: UseDebuggerReturn | null;
  onStartDebug?: () => void;
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
  projectId,
  onProjectChanged,
  onChangesReady,
  onRevertChanges,
  onAcceptChanges,
  onSimStart,
  onSimStop,
  pendingReview,
  currentSnapshot,
  initialMessage,
  onInitialMessageConsumed,
  debugMode,
  debugState,
  onStartDebug,
}: WorkbenchProps) {
  const [chatWidth, setChatWidth] = useState(400);
  const dividerRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Compute breakpoint lines and current debug line for Monaco
  const breakpointLines = useMemo(() => {
    if (!debugMode || !debugState?.sourceMap || !debugState?.breakpoints) return undefined;
    const lines = new Set<number>();
    for (const entry of debugState.sourceMap) {
      if (entry.file === "main.cpp" && debugState.breakpoints.has(entry.address)) {
        lines.add(entry.line - 1); // Adjust for auto-added #include <Arduino.h>
      }
    }
    return lines.size > 0 ? lines : undefined;
  }, [debugMode, debugState?.sourceMap, debugState?.breakpoints]);

  const currentDebugLine = useMemo(() => {
    if (!debugMode || !debugState?.sourceMap || debugState.status === "idle") return null;
    const pc = debugState.pc;
    const entry = debugState.sourceMap.find((e) => e.file === "main.cpp" && e.address === pc);
    return entry ? entry.line - 1 : null; // Adjust for auto-added #include <Arduino.h>
  }, [debugMode, debugState?.sourceMap, debugState?.pc, debugState?.status]);

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
                debugMode={debugMode}
                breakpointLines={breakpointLines}
                currentDebugLine={currentDebugLine}
                onToggleBreakpointLine={debugState?.handleToggleBreakpointLine}
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
                projectId={projectId}
                debugMode={debugMode}
                debugState={debugState}
                onStartDebug={onStartDebug}
              />
            }
          />
        </div>
        {!!sparkyOpen && projectId && onSparkyToggle && (
          <>
            <div className={styles.chatDivider} onMouseDown={handleDividerDown} />
            <div className={styles.chatSidePanel} style={{ width: chatWidth }}>
              <SparkyChat
                open={!!sparkyOpen}
                onToggle={onSparkyToggle}
                projectId={projectId}
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
                initialMessage={initialMessage}
                onInitialMessageConsumed={onInitialMessageConsumed}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
