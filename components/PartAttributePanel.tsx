"use client";

import type { DiagramPart } from "@/lib/diagram-parser";

interface PartAttributePanelProps {
  part: DiagramPart | null;
  onAttrChange: (attr: string, value: string) => void;
  onRotate: (angle: number) => void;
  onDelete: () => void;
  onClose: () => void;
}

const LED_COLORS = ["red", "green", "blue", "yellow", "white", "orange", "purple"];
const BUTTON_COLORS = ["green", "red", "blue", "yellow", "white", "black", "purple"];
const SERVO_HORNS = ["single", "double", "cross"];
const LCD_BACKGROUNDS = ["green", "blue"];
const SEG_COLORS = ["red", "green", "blue", "yellow", "white"];

type AttrDef = {
  label: string;
  attr: string;
  type: "text" | "select" | "number";
  options?: string[];
  placeholder?: string;
};

const PART_ATTR_DEFS: Record<string, AttrDef[]> = {
  "wokwi-led": [
    { label: "Color", attr: "color", type: "select", options: LED_COLORS },
    { label: "Light color", attr: "lightColor", type: "text", placeholder: "#ff0000" },
    { label: "Label", attr: "label", type: "text" },
    { label: "Flip", attr: "flip", type: "select", options: ["", "1"] },
  ],
  "wokwi-rgb-led": [
    { label: "Common", attr: "common", type: "select", options: ["cathode", "anode"] },
  ],
  "wokwi-resistor": [
    { label: "Resistance", attr: "value", type: "text", placeholder: "1000" },
  ],
  "wokwi-pushbutton": [
    { label: "Color", attr: "color", type: "select", options: BUTTON_COLORS },
    { label: "Key binding", attr: "key", type: "text", placeholder: "e.g. a" },
    { label: "Label", attr: "label", type: "text" },
  ],
  "wokwi-pushbutton-6mm": [
    { label: "Color", attr: "color", type: "select", options: BUTTON_COLORS },
    { label: "Key binding", attr: "key", type: "text", placeholder: "e.g. a" },
    { label: "Label", attr: "label", type: "text" },
  ],
  "wokwi-buzzer": [],
  "wokwi-servo": [
    { label: "Horn", attr: "horn", type: "select", options: SERVO_HORNS },
    { label: "Horn color", attr: "hornColor", type: "text", placeholder: "#ccc" },
  ],
  "wokwi-potentiometer": [
    { label: "Min", attr: "min", type: "number" },
    { label: "Max", attr: "max", type: "number" },
  ],
  "wokwi-lcd1602": [
    { label: "Pins", attr: "pins", type: "select", options: ["i2c", "full", "none"] },
    { label: "Background", attr: "background", type: "select", options: LCD_BACKGROUNDS },
  ],
  "wokwi-lcd2004": [
    { label: "Pins", attr: "pins", type: "select", options: ["i2c", "full", "none"] },
    { label: "Background", attr: "background", type: "select", options: LCD_BACKGROUNDS },
  ],
  "wokwi-7segment": [
    { label: "Color", attr: "color", type: "select", options: SEG_COLORS },
    { label: "Digits", attr: "digits", type: "select", options: ["1", "2", "3", "4"] },
    { label: "Colon", attr: "colon", type: "select", options: ["", "1"] },
  ],
  "wokwi-neopixel": [],
  "wokwi-ssd1306": [],
  "wokwi-arduino-uno": [],
  "wokwi-arduino-mega": [],
  "wokwi-arduino-nano": [],
};

const inputStyle: React.CSSProperties = {
  background: "#2a2a2a",
  border: "1px solid #555",
  borderRadius: 3,
  color: "#eee",
  padding: "3px 6px",
  fontSize: 12,
  fontFamily: "monospace",
  width: "100%",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  padding: "4px 10px",
  background: "#333",
  border: "1px solid #555",
  borderRadius: 3,
  color: "#ccc",
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "monospace",
};

export default function PartAttributePanel({
  part,
  onAttrChange,
  onRotate,
  onDelete,
  onClose,
}: PartAttributePanelProps) {
  if (!part) return null;

  const attrDefs = PART_ATTR_DEFS[part.type];
  const friendlyType = part.type.replace("wokwi-", "").replace(/-/g, " ");

  // For unknown part types, show raw attrs
  const showRawAttrs = attrDefs === undefined && Object.keys(part.attrs).length > 0;

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
        minWidth: 180,
        maxWidth: 240,
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
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{part.id}</div>
          <div style={{ color: "#888", fontSize: 10 }}>{friendlyType}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            fontSize: 16,
            padding: "0 4px",
            lineHeight: 1,
          }}
          title="Deselect (Esc)"
        >
          x
        </button>
      </div>

      {/* Type-specific attributes */}
      {attrDefs && attrDefs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {attrDefs.map((def) => (
            <div key={def.attr}>
              <label style={{ color: "#999", fontSize: 10, display: "block", marginBottom: 2 }}>
                {def.label}
              </label>
              {def.type === "select" && def.options ? (
                <select
                  value={part.attrs[def.attr] ?? ""}
                  onChange={(e) => onAttrChange(def.attr, e.target.value)}
                  style={inputStyle}
                >
                  {def.options.map((opt) => (
                    <option key={opt} value={opt}>{opt || "(default)"}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={def.type === "number" ? "number" : "text"}
                  value={part.attrs[def.attr] ?? ""}
                  placeholder={def.placeholder}
                  onChange={(e) => onAttrChange(def.attr, e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Generic attrs for unknown parts */}
      {showRawAttrs && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {Object.entries(part.attrs).map(([key, value]) => (
            <div key={key}>
              <label style={{ color: "#999", fontSize: 10, display: "block", marginBottom: 2 }}>
                {key}
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => onAttrChange(key, e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      )}

      {/* Actions — always shown */}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button onClick={() => onRotate(90)} style={btnStyle} title="Rotate 90° (R)">
          Rotate
        </button>
        <button
          onClick={onDelete}
          style={{ ...btnStyle, color: "#e55", borderColor: "#a33" }}
          title="Delete (Del)"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
