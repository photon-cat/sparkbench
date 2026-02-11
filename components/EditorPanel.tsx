"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Tabs from "./Tabs";
import styles from "./EditorPanel.module.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MonacoEditor = dynamic(() => import("@monaco-editor/react") as any, {
  ssr: false,
  loading: () => (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
      }}
    >
      Loading editor...
    </div>
  ),
}) as any;

const FILE_TABS = [
  { id: "sketch", label: "sketch.ino" },
  { id: "diagram", label: "diagram.json" },
  { id: "libraries", label: "libraries.txt" },
];

interface EditorPanelProps {
  sketchCode: string;
  diagramJson: string;
  onSketchChange: (code: string) => void;
  onDiagramChange: (json: string) => void;
}

export default function EditorPanel({
  sketchCode,
  diagramJson,
  onSketchChange,
  onDiagramChange,
}: EditorPanelProps) {
  const [activeTab, setActiveTab] = useState("sketch");

  const currentValue =
    activeTab === "sketch"
      ? sketchCode
      : activeTab === "diagram"
        ? diagramJson
        : "";

  const currentLanguage =
    activeTab === "sketch"
      ? "cpp"
      : activeTab === "diagram"
        ? "json"
        : "plaintext";

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      if (activeTab === "sketch") {
        onSketchChange(value);
      } else if (activeTab === "diagram") {
        onDiagramChange(value);
      }
    },
    [activeTab, onSketchChange, onDiagramChange],
  );

  return (
    <div className={styles.panel}>
      <Tabs tabs={FILE_TABS} activeId={activeTab} onTabChange={setActiveTab} />
      <div className={styles.editorWrap}>
        <MonacoEditor
          height="100%"
          theme="vs-dark"
          language={currentLanguage}
          value={currentValue}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}
