import React from "react";
import type { Tool } from "../types";
import type { EditorAction } from "../state/editor-state";

interface ToolbarProps {
  activeTool: Tool;
  gridSnap: number;
  dispatch: React.Dispatch<EditorAction>;
}

const tools: { id: Tool; label: string; shortcut: string }[] = [
  { id: "select", label: "Select", shortcut: "V" },
  { id: "path", label: "Path", shortcut: "P" },
  { id: "circle", label: "Circle", shortcut: "C" },
  { id: "box", label: "Box", shortcut: "B" },
  { id: "text", label: "Text", shortcut: "T" },
  { id: "port", label: "Port", shortcut: "O" },
];

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, gridSnap, dispatch }) => {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      const tool = tools.find((t) => t.shortcut === key);
      if (tool) {
        dispatch({ type: "SET_TOOL", tool: tool.id });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  return (
    <div style={styles.toolbar}>
      <div style={styles.title}>Symbol Editor</div>
      <div style={styles.tools}>
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: "SET_TOOL", tool: t.id })}
            style={{
              ...styles.toolBtn,
              ...(activeTool === t.id ? styles.toolBtnActive : {}),
            }}
            title={`${t.label} (${t.shortcut})`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={styles.snapGroup}>
        <label style={styles.snapLabel}>Snap:</label>
        <select
          value={gridSnap}
          onChange={(e) =>
            dispatch({ type: "SET_GRID_SNAP", snap: parseFloat(e.target.value) })
          }
          style={styles.snapSelect}
        >
          <option value={0}>Off</option>
          <option value={0.01}>0.01</option>
          <option value={0.025}>0.025</option>
          <option value={0.05}>0.05</option>
          <option value={0.1}>0.1</option>
        </select>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "12px 8px",
    background: "#1e1e1e",
    color: "#eee",
    width: 100,
    flexShrink: 0,
  },
  title: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.6,
    textAlign: "center",
    paddingBottom: 8,
    borderBottom: "1px solid #333",
  },
  tools: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  toolBtn: {
    background: "transparent",
    border: "1px solid transparent",
    color: "#ccc",
    padding: "6px 8px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    textAlign: "left",
  },
  toolBtnActive: {
    background: "#0078ff",
    color: "#fff",
    borderColor: "#0078ff",
  },
  snapGroup: {
    marginTop: "auto",
    paddingTop: 8,
    borderTop: "1px solid #333",
  },
  snapLabel: {
    fontSize: 11,
    display: "block",
    marginBottom: 4,
    opacity: 0.6,
  },
  snapSelect: {
    width: "100%",
    background: "#2d2d2d",
    color: "#eee",
    border: "1px solid #444",
    borderRadius: 4,
    padding: "4px",
    fontSize: 12,
  },
};
