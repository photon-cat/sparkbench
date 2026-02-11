import React, { useState } from "react";
import type { SchSymbol, Primitive, SimTag, Port } from "../types";

interface SimPreviewProps {
  symbol: SchSymbol;
  simTags: Record<number, SimTag>;
}

export const SimPreview: React.FC<SimPreviewProps> = ({ symbol, simTags }) => {
  const [ledOn, setLedOn] = useState(false);
  const [voltage, setVoltage] = useState(3.3);
  const [segments, setSegments] = useState<boolean[]>([false, false, false, false, false, false, false, false]);

  const hasGlow = Object.values(simTags).some((t) => t.role === "glow");
  const hasVoltage = Object.values(simTags).some((t) => t.role === "voltage-text");
  const hasSegments = Object.values(simTags).some((t) => t.role === "segment");

  if (Object.keys(simTags).length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>Sim Preview</div>
        <div style={styles.empty}>Tag primitives with sim roles to preview</div>
      </div>
    );
  }

  const { size, center } = symbol;
  const vx = center.x - size.width / 2;
  const vy = center.y - size.height / 2;
  const pad = 0.1;

  function renderPrim(prim: Primitive, idx: number) {
    const tag = simTags[idx];

    // Apply sim state modifications
    let fillOverride: string | undefined;
    let opacityOverride: number | undefined;
    let textOverride: string | undefined;

    if (tag?.role === "glow" && ledOn) {
      fillOverride = tag.color;
      opacityOverride = 0.8;
    }

    if (tag?.role === "voltage-text") {
      textOverride = `${voltage.toFixed(1)}V`;
    }

    if (tag?.role === "segment") {
      const on = segments[tag.index];
      fillOverride = on ? "#f00" : "#300";
      opacityOverride = on ? 1 : 0.3;
    }

    if (tag?.role === "current-color") {
      fillOverride = ledOn ? "#0f0" : "#888";
    }

    switch (prim.type) {
      case "path": {
        if (prim.points.length < 2) return null;
        const d = prim.points
          .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
          .join(" ");
        return (
          <path
            key={idx}
            d={prim.closed ? d + " Z" : d}
            stroke={prim.color}
            strokeWidth={0.02}
            fill={fillOverride ?? (prim.fill ? prim.color : "none")}
            opacity={opacityOverride}
          />
        );
      }
      case "circle":
        return (
          <circle
            key={idx}
            cx={prim.x}
            cy={prim.y}
            r={prim.radius}
            stroke={prim.color}
            strokeWidth={0.02}
            fill={fillOverride ?? (prim.fill ? prim.color : "none")}
            opacity={opacityOverride}
          />
        );
      case "text":
        return (
          <text
            key={idx}
            x={prim.x}
            y={prim.y}
            fontSize={prim.fontSize ?? 0.1}
            textAnchor={prim.anchor}
            fill={fillOverride ?? prim.color}
          >
            {textOverride ?? prim.text}
          </text>
        );
      case "box":
        return (
          <rect
            key={idx}
            x={prim.x}
            y={prim.y}
            width={prim.width}
            height={prim.height}
            stroke={prim.color}
            strokeWidth={0.02}
            fill={fillOverride ?? (prim.fill ? prim.color : "none")}
            opacity={opacityOverride}
          />
        );
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>Sim Preview</div>

      <div style={styles.svgWrap}>
        <svg
          viewBox={`${vx - pad} ${vy - pad} ${size.width + pad * 2} ${size.height + pad * 2}`}
          style={{ width: "100%", height: "100%", background: "#111" }}
        >
          {symbol.primitives.map((p, i) => renderPrim(p, i))}
          {symbol.ports.map((port: Port, i: number) => {
            const s = 0.03;
            return (
              <g key={`p${i}`}>
                <line x1={port.x - s} y1={port.y - s} x2={port.x + s} y2={port.y + s} stroke="red" strokeWidth={0.015} />
                <line x1={port.x - s} y1={port.y + s} x2={port.x + s} y2={port.y - s} stroke="red" strokeWidth={0.015} />
              </g>
            );
          })}
        </svg>
      </div>

      <div style={styles.controls}>
        {hasGlow && (
          <label style={styles.controlRow}>
            <input type="checkbox" checked={ledOn} onChange={(e) => setLedOn(e.target.checked)} />
            <span>LED On</span>
          </label>
        )}

        {hasVoltage && (
          <div style={styles.controlRow}>
            <label style={{ fontSize: 11, color: "#aaa" }}>Voltage</label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={voltage}
              onChange={(e) => setVoltage(parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 11, color: "#eee", width: 36, textAlign: "right" }}>
              {voltage.toFixed(1)}V
            </span>
          </div>
        )}

        {hasSegments && (
          <div>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Segments</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {segments.map((on, i) => (
                <label key={i} style={{ fontSize: 10, color: "#ccc", display: "flex", alignItems: "center", gap: 2 }}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => {
                      const next = [...segments];
                      next[i] = e.target.checked;
                      setSegments(next);
                    }}
                  />
                  {i}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: "1px solid #333",
  },
  header: {
    padding: "8px 12px",
    fontWeight: 600,
    fontSize: 12,
    color: "#eee",
    borderBottom: "1px solid #333",
  },
  empty: {
    padding: "12px",
    color: "#666",
    fontSize: 11,
  },
  svgWrap: {
    padding: 8,
    height: 140,
  },
  controls: {
    padding: "4px 12px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  controlRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#eee",
  },
};
