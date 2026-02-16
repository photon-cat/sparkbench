"use client";
import { useState } from "react";
import type { DiagramPart } from "@/lib/diagram-parser";
import type { WiredComponent } from "@/lib/wire-components";
import { FOOTPRINT_OPTIONS, FOOTPRINT_LIBRARY } from "@/lib/pcb-footprints";

interface PartAttributePanelProps {
  part: DiagramPart | null;
  wiredComponent?: WiredComponent | null;
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
  "wokwi-text": [
    { label: "Text", attr: "text", type: "text", placeholder: "Enter text..." },
  ],
  "wokwi-clock-generator": [
    { label: "Frequency (Hz)", attr: "frequency", type: "text", placeholder: "10" },
  ],
  "wokwi-neopixel": [],
  "wokwi-ssd1306": [],
  "wokwi-arduino-uno": [],
  "wokwi-arduino-mega": [],
  "wokwi-arduino-nano": [],
  "sb-atmega328": [],
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

function SensorSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
      <span style={{ width: 28, fontSize: 11, color: "#aaa", textAlign: "right", flexShrink: 0 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: "#f59e0b", height: 14 }}
      />
      <span style={{ width: 42, fontSize: 11, color: "#f59e0b", textAlign: "right", fontFamily: "monospace", flexShrink: 0 }}>
        {value.toFixed(step < 1 ? 1 : 0)}{unit}
      </span>
    </div>
  );
}

function DHT22Controls({ wc }: { wc: WiredComponent }) {
  const [temp, setTemp] = useState(22);
  const [hum, setHum] = useState(50);
  return (
    <div style={{ marginTop: 8, borderTop: "1px solid #333", paddingTop: 8 }}>
      <div style={{ fontSize: 10, color: "#888", marginBottom: 4, fontWeight: 600 }}>Sensor Controls</div>
      <SensorSlider label="Temp" value={temp} min={-40} max={80} step={0.5} unit="C"
        onChange={(v) => { setTemp(v); wc.setTemperature?.(v); }} />
      <SensorSlider label="Hum" value={hum} min={0} max={100} step={0.5} unit="%"
        onChange={(v) => { setHum(v); wc.setHumidity?.(v); }} />
    </div>
  );
}

function MPU6050Controls({ wc }: { wc: WiredComponent }) {
  const [ax, setAx] = useState(0);
  const [ay, setAy] = useState(0);
  const [az, setAz] = useState(1);
  const [gx, setGx] = useState(0);
  const [gy, setGy] = useState(0);
  const [gz, setGz] = useState(0);
  return (
    <div style={{ marginTop: 8, borderTop: "1px solid #333", paddingTop: 8 }}>
      <div style={{ fontSize: 10, color: "#888", marginBottom: 4, fontWeight: 600 }}>Sensor Controls</div>
      <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>Accel (g)</div>
      <SensorSlider label="X" value={ax} min={-2} max={2} step={0.1} unit="g"
        onChange={(v) => { setAx(v); wc.setAccel?.(v, ay, az); }} />
      <SensorSlider label="Y" value={ay} min={-2} max={2} step={0.1} unit="g"
        onChange={(v) => { setAy(v); wc.setAccel?.(ax, v, az); }} />
      <SensorSlider label="Z" value={az} min={-2} max={2} step={0.1} unit="g"
        onChange={(v) => { setAz(v); wc.setAccel?.(ax, ay, v); }} />
      <div style={{ fontSize: 10, color: "#888", marginTop: 4, marginBottom: 2 }}>Gyro (deg/s)</div>
      <SensorSlider label="X" value={gx} min={-250} max={250} step={1} unit=""
        onChange={(v) => { setGx(v); wc.setGyro?.(v, gy, gz); }} />
      <SensorSlider label="Y" value={gy} min={-250} max={250} step={1} unit=""
        onChange={(v) => { setGy(v); wc.setGyro?.(gx, v, gz); }} />
      <SensorSlider label="Z" value={gz} min={-250} max={250} step={1} unit=""
        onChange={(v) => { setGz(v); wc.setGyro?.(gx, gy, v); }} />
    </div>
  );
}

export default function PartAttributePanel({
  part,
  wiredComponent,
  onAttrChange,
  onRotate,
  onDelete,
  onClose,
}: PartAttributePanelProps) {
  if (!part) return null;

  const attrDefs = PART_ATTR_DEFS[part.type];
  const friendlyType = part.type.replace(/^wokwi-/, "").replace(/^sb-/, "").replace(/-/g, " ");

  const hasValue = ["wokwi-resistor", "wokwi-led", "wokwi-buzzer"].includes(part.type) ||
    part.value !== undefined;

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
        minWidth: 240,
        maxWidth: 320,
        zIndex: 20,
        fontFamily: "monospace",
        fontSize: 12,
        color: "#ccc",
        backdropFilter: "blur(8px)",
      }}
    >
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

      <div style={{ marginBottom: 6 }}>
        <label style={{ color: "#999", fontSize: 10, display: "block", marginBottom: 2 }}>Footprint</label>
        <FootprintDropdown
          partType={part.type}
          value={part.footprint ?? ""}
          onChange={(v) => onAttrChange("__footprint", v)}
        />
      </div>

      {wiredComponent && part.type === "wokwi-dht22" && (
        <DHT22Controls wc={wiredComponent} />
      )}
      {wiredComponent && part.type === "wokwi-mpu6050" && (
        <MPU6050Controls wc={wiredComponent} />
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button onClick={() => onRotate(90)} style={btnStyle} title="Rotate 90 (R)">
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

function FootprintDropdown({
  partType,
  value,
  onChange,
}: {
  partType: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const suggested = FOOTPRINT_OPTIONS[partType] ?? [];
  const suggestedValues = new Set(suggested.map((o) => o.value));

  // Group remaining library entries by group, excluding already-suggested ones
  const groups = new Map<string, typeof FOOTPRINT_LIBRARY>();
  for (const entry of FOOTPRINT_LIBRARY) {
    if (suggestedValues.has(entry.value)) continue;
    if (!groups.has(entry.group)) groups.set(entry.group, []);
    groups.get(entry.group)!.push(entry);
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "#2a2a2a",
        border: "1px solid #555",
        borderRadius: 3,
        color: "#eee",
        padding: "3px 6px",
        fontSize: 12,
        fontFamily: "monospace",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <option value="">(default)</option>
      {suggested.length > 0 && (
        <optgroup label="Suggested">
          {suggested.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </optgroup>
      )}
      {[...groups.entries()].map(([group, entries]) => (
        <optgroup key={group} label={group}>
          {entries.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
