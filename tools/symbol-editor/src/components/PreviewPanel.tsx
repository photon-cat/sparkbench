import React from "react";
import type { SchSymbol, Primitive, Port } from "../types";

interface PreviewPanelProps {
  symbol: SchSymbol;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ symbol }) => {
  const { size, center, primitives, ports } = symbol;
  const vx = center.x - size.width / 2;
  const vy = center.y - size.height / 2;
  const pad = 0.1;

  return (
    <div style={styles.container}>
      <div style={styles.header}>Preview</div>
      <div style={styles.svgWrap}>
        <svg
          viewBox={`${vx - pad} ${vy - pad} ${size.width + pad * 2} ${size.height + pad * 2}`}
          style={{ width: "100%", height: "100%", background: "#fff" }}
        >
          {primitives.map((p, i) => (
            <PrimPreview key={i} prim={p} />
          ))}
          {ports.map((port, i) => (
            <PortPreview key={`p${i}`} port={port} />
          ))}
        </svg>
      </div>
    </div>
  );
};

function PrimPreview({ prim }: { prim: Primitive }) {
  switch (prim.type) {
    case "path": {
      if (prim.points.length < 2) return null;
      const d = prim.points
        .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
        .join(" ");
      return (
        <path
          d={prim.closed ? d + " Z" : d}
          stroke={prim.color}
          strokeWidth={0.02}
          fill={prim.fill ? prim.color : "none"}
        />
      );
    }
    case "circle":
      return (
        <circle
          cx={prim.x}
          cy={prim.y}
          r={prim.radius}
          stroke={prim.color}
          strokeWidth={0.02}
          fill={prim.fill ? prim.color : "none"}
        />
      );
    case "text":
      return (
        <text
          x={prim.x}
          y={prim.y}
          fontSize={prim.fontSize ?? 0.1}
          textAnchor={prim.anchor}
          fill={prim.color}
        >
          {prim.text}
        </text>
      );
    case "box":
      return (
        <rect
          x={prim.x}
          y={prim.y}
          width={prim.width}
          height={prim.height}
          stroke={prim.color}
          strokeWidth={0.02}
          fill={prim.fill ? prim.color : "none"}
        />
      );
  }
}

function PortPreview({ port }: { port: Port }) {
  const s = 0.03;
  return (
    <g>
      <line
        x1={port.x - s}
        y1={port.y - s}
        x2={port.x + s}
        y2={port.y + s}
        stroke="red"
        strokeWidth={0.015}
      />
      <line
        x1={port.x - s}
        y1={port.y + s}
        x2={port.x + s}
        y2={port.y - s}
        stroke="red"
        strokeWidth={0.015}
      />
    </g>
  );
}

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
  svgWrap: {
    padding: 8,
    height: 160,
  },
};
