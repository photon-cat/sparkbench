"use client";

import { useState } from "react";
import type { WiredComponent } from "@/lib/wire-components";

interface SensorEntry {
  id: string;
  type: string;
  wc: WiredComponent;
}

interface SensorPanelProps {
  sensors: SensorEntry[];
}

const sliderRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 4,
};

const labelStyle: React.CSSProperties = {
  width: 28,
  fontSize: 11,
  color: "#aaa",
  textAlign: "right",
  flexShrink: 0,
};

const valueStyle: React.CSSProperties = {
  width: 42,
  fontSize: 11,
  color: "#0c0",
  textAlign: "right",
  fontFamily: "monospace",
  flexShrink: 0,
};

function Slider({
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
    <div style={sliderRow}>
      <span style={labelStyle}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: "#0c0", height: 14 }}
      />
      <span style={valueStyle}>
        {value.toFixed(step < 1 ? 1 : 0)}{unit}
      </span>
    </div>
  );
}

function DHT22Controls({ wc }: { wc: WiredComponent }) {
  const [temp, setTemp] = useState(22);
  const [hum, setHum] = useState(50);

  return (
    <>
      <Slider
        label="Temp"
        value={temp}
        min={-40}
        max={80}
        step={0.5}
        unit="°C"
        onChange={(v) => {
          setTemp(v);
          wc.setTemperature?.(v);
        }}
      />
      <Slider
        label="Hum"
        value={hum}
        min={0}
        max={100}
        step={0.5}
        unit="%"
        onChange={(v) => {
          setHum(v);
          wc.setHumidity?.(v);
        }}
      />
    </>
  );
}

function MPU6050Controls({ wc }: { wc: WiredComponent }) {
  const [ax, setAx] = useState(0);
  const [ay, setAy] = useState(0);
  const [az, setAz] = useState(1);
  const [gx, setGx] = useState(0);
  const [gy, setGy] = useState(0);
  const [gz, setGz] = useState(0);

  const updateAccel = (x: number, y: number, z: number) => {
    setAx(x);
    setAy(y);
    setAz(z);
    wc.setAccel?.(x, y, z);
  };

  const updateGyro = (x: number, y: number, z: number) => {
    setGx(x);
    setGy(y);
    setGz(z);
    wc.setGyro?.(x, y, z);
  };

  return (
    <>
      <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>Accel (g)</div>
      <Slider label="X" value={ax} min={-2} max={2} step={0.1} unit="g" onChange={(v) => updateAccel(v, ay, az)} />
      <Slider label="Y" value={ay} min={-2} max={2} step={0.1} unit="g" onChange={(v) => updateAccel(ax, v, az)} />
      <Slider label="Z" value={az} min={-2} max={2} step={0.1} unit="g" onChange={(v) => updateAccel(ax, ay, v)} />
      <div style={{ fontSize: 10, color: "#888", marginTop: 4, marginBottom: 2 }}>Gyro (°/s)</div>
      <Slider label="X" value={gx} min={-250} max={250} step={1} unit="" onChange={(v) => updateGyro(v, gy, gz)} />
      <Slider label="Y" value={gy} min={-250} max={250} step={1} unit="" onChange={(v) => updateGyro(gx, v, gz)} />
      <Slider label="Z" value={gz} min={-250} max={250} step={1} unit="" onChange={(v) => updateGyro(gx, gy, v)} />
    </>
  );
}

export default function SensorPanel({ sensors }: SensorPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (sensors.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 30,
        background: "rgba(20, 20, 20, 0.92)",
        border: "1px solid #333",
        borderRadius: 6,
        padding: 8,
        minWidth: 200,
        maxWidth: 260,
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        color: "#ccc",
        backdropFilter: "blur(8px)",
      }}
    >
      {sensors.map((s) => {
        const isCollapsed = collapsed[s.id];
        return (
          <div key={s.id} style={{ marginBottom: sensors.length > 1 ? 6 : 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                userSelect: "none",
                marginBottom: isCollapsed ? 0 : 4,
              }}
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
              }
            >
              <span style={{ fontSize: 10, marginRight: 4, color: "#888" }}>
                {isCollapsed ? "\u25B6" : "\u25BC"}
              </span>
              <span style={{ fontWeight: 600, fontSize: 11 }}>{s.id}</span>
              <span style={{ fontSize: 10, color: "#666", marginLeft: 4 }}>
                {s.type === "wokwi-dht22" ? "DHT22" : "MPU6050"}
              </span>
            </div>
            {!isCollapsed && (
              <div style={{ paddingLeft: 4 }}>
                {s.type === "wokwi-dht22" && <DHT22Controls wc={s.wc} />}
                {s.type === "wokwi-mpu6050" && <MPU6050Controls wc={s.wc} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
