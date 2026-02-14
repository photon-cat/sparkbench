interface ToolbarProps {
  onAddPart: () => void;
  onSave: () => void;
  isSaving: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToWindow: () => void;
  onToggleGrid: () => void;
  showGrid: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const btnStyle: React.CSSProperties = {
  padding: "6px 12px",
  background: "#333",
  border: "1px solid #555",
  borderRadius: 4,
  color: "#ccc",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "monospace",
  whiteSpace: "nowrap",
};

export default function Toolbar({
  onAddPart,
  onSave,
  isSaving,
  onZoomIn,
  onZoomOut,
  onFitToWindow,
  onToggleGrid,
  showGrid,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        background: "#1a1a1a",
        borderBottom: "1px solid #333",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 8,
        zIndex: 40,
        fontFamily: "monospace",
      }}
    >
      <span style={{ color: "#888", fontSize: 14, fontWeight: 600, marginRight: 8 }}>
        Wokwi Editor
      </span>

      <button onClick={onAddPart} style={{ ...btnStyle, background: "#2563eb", borderColor: "#2563eb", color: "#fff" }} title="Add Part (A)">
        + Add Part
      </button>

      <div style={{ width: 1, height: 20, background: "#444" }} />

      <button
        onClick={onSave}
        style={{ ...btnStyle, background: "#16a34a", borderColor: "#16a34a", color: "#fff", opacity: isSaving ? 0.6 : 1 }}
        disabled={isSaving}
        title="Save (Ctrl+S)"
      >
        {isSaving ? "Saving..." : "Save"}
      </button>

      <div style={{ width: 1, height: 20, background: "#444" }} />

      <button onClick={onUndo} style={{ ...btnStyle, opacity: canUndo ? 1 : 0.4 }} disabled={!canUndo} title="Undo (Ctrl+Z)">
        Undo
      </button>
      <button onClick={onRedo} style={{ ...btnStyle, opacity: canRedo ? 1 : 0.4 }} disabled={!canRedo} title="Redo (Ctrl+Y)">
        Redo
      </button>

      <div style={{ flex: 1 }} />

      <button onClick={onToggleGrid} style={{ ...btnStyle, background: showGrid ? "#2563eb" : "#333", borderColor: showGrid ? "#2563eb" : "#555" }} title="Toggle Grid (G)">
        Grid
      </button>
      <button onClick={onZoomIn} style={btnStyle} title="Zoom In (+)">+</button>
      <button onClick={onZoomOut} style={btnStyle} title="Zoom Out (-)">-</button>
      <button onClick={onFitToWindow} style={btnStyle} title="Fit to Window (F)">Fit</button>
    </div>
  );
}
