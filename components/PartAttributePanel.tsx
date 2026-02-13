"use client";

import { useState } from "react";
import type { DiagramPart } from "@/lib/diagram-parser";
import { FOOTPRINT_OPTIONS, getDefaultFootprint } from "@/lib/pcb-footprints";

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
  const [customFp, setCustomFp] = useState(false);

  if (!part) return null;

  const attrDefs = PART_ATTR_DEFS[part.type];
  const friendlyType = part.type.replace("wokwi-", "").replace(/-/g, " ");
  const fpOptions = FOOTPRINT_OPTIONS[part.type];
  const defaultFp = getDefaultFootprint(part.type);
  const currentFp = part.footprint ?? defaultFp ?? "";
  const showCustomFpInput = customFp || (currentFp && fpOptions && !fpOptions.some((o) => o.value === currentFp));

  // Parts that typically have a meaningful value field
  const hasValue = ["wokwi-resistor", "wokwi-led", "wokwi-buzzer"].includes(part.type) ||
    part.value !== undefined;

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

      {/* Value field */}
      {hasValue && (
        <div style={{ marginBottom: 6 }}>
          <label style={{ color: "#999", fontSize: 10, display: "block", marginBottom: 2 }}>Value</label>
          <input
            type="text"
            value={part.value ?? part.attrs.value ?? ""}
            placeholder="e.g. 1k, 100nF"
            onChange={(e) => onAttrChange("__value", e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      {/* Footprint field */}
      {fpOptions && (
        <div style={{ marginBottom: 8 }}>
          <label style={{ color: "#999", fontSize: 10, display: "block", marginBottom: 2 }}>Footprint</label>
          {showCustomFpInput ? (
            <div style={{ display: "flex", gap: 4 }}>
              <input
                type="text"
                value={currentFp}
                placeholder="Custom footprint"
                onChange={(e) => onAttrChange("__footprint", e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => { setCustomFp(false); onAttrChange("__footprint", defaultFp ?? ""); }}
                style={{ ...btnStyle, padding: "3px 6px", fontSize: 10 }}
                title="Reset to list"
              >
                Reset
              </button>
            </div>
          ) : (
            <select
              value={currentFp}
              onChange={(e) => {
                if (e.target.value === "__custom") {
                  setCustomFp(true);
                } else {
                  onAttrChange("__footprint", e.target.value);
                }
              }}
              style={inputStyle}
            >
              {fpOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              <option value="__custom">Custom...</option>
            </select>
          )}
        </div>
      )}

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
