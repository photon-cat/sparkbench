"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";

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
      { type: "wokwi-flame-sensor", label: "Flame Sensor" },
      { type: "wokwi-gas-sensor", label: "Gas Sensor" },
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
    name: "Other",
    parts: [
      { type: "wokwi-neopixel", label: "NeoPixel" },
      { type: "wokwi-neopixel-matrix", label: "NeoPixel Matrix" },
      { type: "wokwi-led-ring", label: "LED Ring" },
      { type: "wokwi-led-bar-graph", label: "LED Bar Graph" },
      { type: "wokwi-microsd-card", label: "MicroSD Card" },
    ],
  },
];

/** Renders a scaled-down Wokwi custom element as a 40x40 thumbnail. */
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

interface AddPartPanelProps {
  onSelect: (partType: string) => void;
}

export default function AddPartPanel({ onSelect }: AddPartPanelProps) {
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);

  // Ensure wokwi elements are loaded before rendering thumbnails
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
    <Box sx={{ width: 380, maxHeight: 500, display: "flex", flexDirection: "column", bgcolor: "#1a1a1a" }}>
      {/* Search bar */}
      <Box sx={{ display: "flex", alignItems: "center", px: 1.5, py: 1, borderBottom: "1px solid #333" }}>
        <InputBase
          placeholder="Search parts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          sx={{
            flex: 1,
            color: "#ccc",
            fontSize: 14,
            "& input::placeholder": { color: "#666", opacity: 1 },
          }}
        />
        <SearchIcon sx={{ color: "#666", fontSize: 20 }} />
      </Box>

      {/* Scrollable list */}
      <Box sx={{ overflowY: "auto", flex: 1 }}>
        {filtered.map((cat) => (
          <Box key={cat.name}>
            {/* Category header */}
            <Typography
              sx={{
                px: 1.5,
                py: 0.75,
                fontSize: 11,
                fontWeight: 600,
                color: "#777",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                bgcolor: "#222",
              }}
            >
              {cat.name}
            </Typography>

            {/* Part rows */}
            {cat.parts.map((part) => (
              <Box
                key={part.type}
                onClick={() => onSelect(part.type)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1.5,
                  py: 0.75,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "#2a2a2a" },
                }}
              >
                {ready ? (
                  <PartThumbnail type={part.type} attrs={part.thumbAttrs} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 4, background: "#2a2a2a", flexShrink: 0 }} />
                )}
                <Typography sx={{ color: "#ccc", fontSize: 13 }}>
                  {part.label}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}

        {filtered.length === 0 && (
          <Typography sx={{ color: "#666", fontSize: 13, textAlign: "center", py: 3 }}>
            No parts found
          </Typography>
        )}
      </Box>
    </Box>
  );
}
