"use client";

import type { DiagramLabel } from "@/lib/diagram-parser";

interface NetlabelAttributePanelProps {
  label: DiagramLabel;
  onNameChange: (name: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function NetlabelAttributePanel({
  label,
  onNameChange,
  onDelete,
  onClose,
}: NetlabelAttributePanelProps) {
  const pinPart = label.pinRef.split(":")[0];
  const pinName = label.pinRef.split(":")[1] || "";

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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Global Netlabel</div>
          <div style={{ color: "#888", fontSize: 10 }}>
            on {pinPart}:{pinName}
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

      {/* Name */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ color: "#999", fontSize: 10, display: "block", marginBottom: 2 }}>
          Net name
        </label>
        <input
          type="text"
          value={label.name}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
          style={{
            background: "#2a2a2a", border: "1px solid #555", borderRadius: 3,
            color: "#eee", padding: "3px 6px", fontSize: 12, fontFamily: "monospace",
            width: "100%", boxSizing: "border-box",
          }}
          placeholder="e.g. VCC, GND, SDA"
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button
          onClick={onDelete}
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
