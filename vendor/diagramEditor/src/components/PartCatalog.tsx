import { useState, useMemo, useEffect, useRef } from "react";

interface PartEntry {
  type: string;
  label: string;
  thumbAttrs?: Record<string, string>;
}

interface Category {
  name: string;
  parts: PartEntry[];
}

const CATALOG: Category[] = [
  {
    name: "MCU Boards",
    parts: [
      { type: "wokwi-arduino-uno", label: "Arduino Uno" },
      { type: "wokwi-arduino-mega", label: "Arduino Mega" },
      { type: "wokwi-arduino-nano", label: "Arduino Nano" },
    ],
  },
  {
    name: "Basic",
    parts: [
      { type: "wokwi-led", label: "LED", thumbAttrs: { color: "red" } },
      { type: "wokwi-pushbutton", label: "Pushbutton" },
      { type: "wokwi-pushbutton-6mm", label: "Pushbutton 6mm" },
      { type: "wokwi-resistor", label: "Resistor" },
    ],
  },
  {
    name: "Display",
    parts: [
      { type: "wokwi-rgb-led", label: "RGB LED" },
      { type: "wokwi-7segment", label: "7-Segment" },
      { type: "wokwi-ssd1306", label: "SSD1306 OLED" },
      { type: "wokwi-lcd1602", label: "LCD 16x2" },
      { type: "wokwi-lcd2004", label: "LCD 20x4" },
      { type: "wokwi-ili9341", label: "ILI9341 TFT" },
    ],
  },
  {
    name: "Input",
    parts: [
      { type: "wokwi-potentiometer", label: "Potentiometer" },
      { type: "wokwi-slide-potentiometer", label: "Slide Potentiometer" },
      { type: "wokwi-slide-switch", label: "Slide Switch" },
      { type: "wokwi-membrane-keypad", label: "Membrane Keypad" },
      { type: "wokwi-analog-joystick", label: "Analog Joystick" },
      { type: "wokwi-ky-040", label: "Rotary Encoder" },
    ],
  },
  {
    name: "Sensor",
    parts: [
      { type: "wokwi-dht22", label: "DHT22" },
      { type: "wokwi-hc-sr04", label: "HC-SR04" },
      { type: "wokwi-pir-motion-sensor", label: "PIR Motion" },
      { type: "wokwi-photoresistor-sensor", label: "Photoresistor" },
      { type: "wokwi-ntc-temperature-sensor", label: "NTC Temperature" },
    ],
  },
  {
    name: "Audio",
    parts: [
      { type: "wokwi-buzzer", label: "Buzzer" },
    ],
  },
  {
    name: "Motor",
    parts: [
      { type: "wokwi-servo", label: "Servo" },
      { type: "wokwi-stepper-motor", label: "Stepper Motor" },
    ],
  },
  {
    name: "ICs",
    parts: [
      { type: "wokwi-74hc595", label: "74HC595 Shift Register" },
      { type: "wokwi-74hc165", label: "74HC165 Shift Register" },
    ],
  },
  {
    name: "Other",
    parts: [
      { type: "wokwi-neopixel", label: "NeoPixel" },
      { type: "wokwi-neopixel-matrix", label: "NeoPixel Matrix" },
      { type: "wokwi-led-ring", label: "LED Ring" },
      { type: "wokwi-led-bar-graph", label: "LED Bar Graph" },
    ],
  },
];

function PartThumbnail({ type, attrs }: { type: string; attrs?: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = "";
    const el = document.createElement(type);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        el.setAttribute(k, v);
      }
    }
    container.appendChild(el);
  }, [type, attrs]);

  return (
    <div
      style={{
        width: 40,
        height: 40,
        overflow: "hidden",
        borderRadius: 4,
        background: "#2a2a2a",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        ref={ref}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) scale(0.3)",
        }}
      />
    </div>
  );
}

interface PartCatalogProps {
  onSelect: (partType: string) => void;
  onClose: () => void;
}

export default function PartCatalog({ onSelect, onClose }: PartCatalogProps) {
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import("@wokwi/elements").then(() => setReady(true));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return CATALOG;
    return CATALOG.map((cat) => ({
      ...cat,
      parts: cat.parts.filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.parts.length > 0);
  }, [search]);

  return (
    <div style={{
      position: "absolute",
      top: 48,
      left: 12,
      width: 340,
      maxHeight: 500,
      display: "flex",
      flexDirection: "column",
      background: "rgba(26, 26, 26, 0.95)",
      border: "1px solid #444",
      borderRadius: 6,
      zIndex: 30,
      backdropFilter: "blur(8px)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #333" }}>
        <input
          type="text"
          placeholder="Search parts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: "#ccc",
            fontSize: 14,
            fontFamily: "monospace",
            outline: "none",
          }}
        />
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            fontSize: 16,
            padding: "0 4px",
          }}
        >
          x
        </button>
      </div>

      {/* Scrollable list */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {filtered.map((cat) => (
          <div key={cat.name}>
            <div style={{
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: "#777",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              background: "#222",
              fontFamily: "monospace",
            }}>
              {cat.name}
            </div>
            {cat.parts.map((part) => (
              <div
                key={part.type}
                onClick={() => onSelect(part.type)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: 13,
                  color: "#ccc",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#2a2a2a"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
              >
                {ready ? (
                  <PartThumbnail type={part.type} attrs={part.thumbAttrs} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 4, background: "#2a2a2a", flexShrink: 0 }} />
                )}
                {part.label}
              </div>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: "#666", fontSize: 13, textAlign: "center", padding: "24px 0", fontFamily: "monospace" }}>
            No parts found
          </div>
        )}
      </div>
    </div>
  );
}
