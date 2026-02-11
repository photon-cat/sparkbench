import React from "react";
import type { Port } from "../types";

interface PortRendererProps {
  port: Port;
  index: number;
  zoom: number;
  selected?: boolean;
  onPointerDown?: (index: number, e: React.PointerEvent) => void;
}

export const PortRenderer: React.FC<PortRendererProps> = ({
  port,
  index,
  zoom,
  selected,
  onPointerDown,
}) => {
  const size = 0.03;
  const handlePointerDown = (e: React.PointerEvent) => {
    onPointerDown?.(index, e);
  };

  return (
    <g onPointerDown={handlePointerDown} style={{ cursor: "pointer" }}>
      {selected && (
        <circle
          cx={port.x}
          cy={port.y}
          r={size * 2}
          fill="rgba(255,0,0,0.15)"
          stroke="red"
          strokeWidth={2 / zoom}
        />
      )}
      <line
        x1={port.x - size}
        y1={port.y - size}
        x2={port.x + size}
        y2={port.y + size}
        stroke="red"
        strokeWidth={0.015}
      />
      <line
        x1={port.x - size}
        y1={port.y + size}
        x2={port.x + size}
        y2={port.y - size}
        stroke="red"
        strokeWidth={0.015}
      />
      {port.labels.length > 0 && (
        <text
          x={port.x}
          y={port.y - 0.05}
          fontSize={0.04}
          textAnchor="middle"
          fill="red"
          style={{ userSelect: "none" }}
        >
          {port.labels[0]}
        </text>
      )}
      {/* Hit area */}
      <circle cx={port.x} cy={port.y} r={8 / zoom} fill="transparent" />
    </g>
  );
};
