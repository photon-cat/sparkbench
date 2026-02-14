import type { DiagramConnection } from "../lib/diagram-types";

const WIRE_COLORS = [
  { name: "green", hex: "#0c0" },
  { name: "blue", hex: "#06f" },
  { name: "red", hex: "#e00" },
  { name: "gold", hex: "#da2" },
  { name: "orange", hex: "#f80" },
  { name: "purple", hex: "#80f" },
  { name: "pink", hex: "#f6b" },
  { name: "black", hex: "#555" },
  { name: "gray", hex: "#888" },
  { name: "white", hex: "#ddd" },
  { name: "yellow", hex: "#fc0" },
  { name: "brown", hex: "#852" },
];

interface WireAttributePanelProps {
  connection: DiagramConnection;
  connectionIndex: number;
  onColorChange: (index: number, color: string) => void;
  onDelete: (index: number) => void;
  onClose: () => void;
}

export default function WireAttributePanel({
  connection,
  connectionIndex,
  onColorChange,
  onDelete,
  onClose,
}: WireAttributePanelProps) {
  const [fromRef, toRef, color] = connection;
  const fromPart = fromRef.split(":")[0];
  const fromPin = fromRef.split(":")[1] || "";
  const toPart = toRef.split(":")[0];
  const toPin = toRef.split(":")[1] || "";

  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        left: 12,
        background: "rgba(26, 26, 26, 0.95)",
        border: "1px solid #444",
        borderRadius: 6,
        padding: "10px 12px",
        minWidth: 200,
        maxWidth: 260,
        zIndex: 20,
        fontFamily: "monospace",
        fontSize: 12,
        color: "#ccc",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Wire</div>
          <div style={{ color: "#888", fontSize: 10 }}>
            {fromPart}:{fromPin} — {toPart}:{toPin}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", color: "#888",
            cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1,
          }}
          title="Deselect (Esc)"
        >
          x
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ color: "#999", fontSize: 10, display: "block", marginBottom: 4 }}>
          Color
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {WIRE_COLORS.map((wc) => (
            <button
              key={wc.name}
              onClick={() => onColorChange(connectionIndex, wc.name)}
              title={wc.name}
              style={{
                width: 20, height: 20, borderRadius: 3,
                background: wc.hex,
                border: color === wc.name ? "2px solid #fff" : "2px solid transparent",
                cursor: "pointer",
                outline: color === wc.name ? "1px solid #06f" : "none",
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button
          onClick={() => onDelete(connectionIndex)}
          style={{
            padding: "4px 10px", background: "#333",
            border: "1px solid #a33", borderRadius: 3,
            color: "#e55", fontSize: 11, cursor: "pointer", fontFamily: "monospace",
          }}
          title="Delete (Del)"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
