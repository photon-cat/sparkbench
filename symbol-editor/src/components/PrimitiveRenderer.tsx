import React from "react";
import type { Primitive } from "../types";

interface PrimitiveRendererProps {
  primitive: Primitive;
  index: number;
  selected: boolean;
  zoom: number;
  onPointerDown?: (index: number, e: React.PointerEvent) => void;
}

export const PrimitiveRenderer: React.FC<PrimitiveRendererProps> = ({
  primitive,
  index,
  selected,
  zoom,
  onPointerDown,
}) => {
  const handlePointerDown = (e: React.PointerEvent) => {
    onPointerDown?.(index, e);
  };

  const selectionStroke = selected ? "rgba(0,120,255,0.6)" : undefined;
  const selectionWidth = selected ? 4 / zoom : undefined;

  switch (primitive.type) {
    case "path": {
      if (primitive.points.length < 2) return null;
      const d = primitive.points
        .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
        .join(" ");
      const pathD = primitive.closed ? d + " Z" : d;
      return (
        <g onPointerDown={handlePointerDown} style={{ cursor: "pointer" }}>
          {selected && (
            <path
              d={pathD}
              stroke={selectionStroke}
              strokeWidth={selectionWidth}
              fill="none"
            />
          )}
          <path
            d={pathD}
            stroke={primitive.color}
            strokeWidth={0.02}
            fill={primitive.fill ? primitive.color : "none"}
          />
          {/* Hit target */}
          <path
            d={pathD}
            stroke="transparent"
            strokeWidth={8 / zoom}
            fill="none"
          />
        </g>
      );
    }

    case "circle": {
      return (
        <g onPointerDown={handlePointerDown} style={{ cursor: "pointer" }}>
          {selected && (
            <circle
              cx={primitive.x}
              cy={primitive.y}
              r={primitive.radius}
              stroke={selectionStroke}
              strokeWidth={selectionWidth}
              fill="none"
            />
          )}
          <circle
            cx={primitive.x}
            cy={primitive.y}
            r={primitive.radius}
            stroke={primitive.color}
            strokeWidth={0.02}
            fill={primitive.fill ? primitive.color : "none"}
          />
          <circle
            cx={primitive.x}
            cy={primitive.y}
            r={Math.max(primitive.radius, 0.02)}
            stroke="transparent"
            strokeWidth={8 / zoom}
            fill="transparent"
          />
        </g>
      );
    }

    case "text": {
      return (
        <g onPointerDown={handlePointerDown} style={{ cursor: "pointer" }}>
          {selected && (
            <rect
              x={primitive.x - 0.05}
              y={primitive.y - (primitive.fontSize ?? 0.1)}
              width={0.2}
              height={(primitive.fontSize ?? 0.1) * 1.2}
              stroke={selectionStroke}
              strokeWidth={selectionWidth}
              fill="rgba(0,120,255,0.1)"
            />
          )}
          <text
            x={primitive.x}
            y={primitive.y}
            fontSize={primitive.fontSize ?? 0.1}
            textAnchor={primitive.anchor}
            fill={primitive.color}
            style={{ userSelect: "none" }}
          >
            {primitive.text}
          </text>
          {/* Larger hit area */}
          <rect
            x={primitive.x - 0.1}
            y={primitive.y - (primitive.fontSize ?? 0.1)}
            width={0.3}
            height={(primitive.fontSize ?? 0.1) * 1.5}
            fill="transparent"
          />
        </g>
      );
    }

    case "box": {
      return (
        <g onPointerDown={handlePointerDown} style={{ cursor: "pointer" }}>
          {selected && (
            <rect
              x={primitive.x}
              y={primitive.y}
              width={primitive.width}
              height={primitive.height}
              stroke={selectionStroke}
              strokeWidth={selectionWidth}
              fill="rgba(0,120,255,0.1)"
            />
          )}
          <rect
            x={primitive.x}
            y={primitive.y}
            width={primitive.width}
            height={primitive.height}
            stroke={primitive.color}
            strokeWidth={0.02}
            fill={primitive.fill ? primitive.color : "none"}
          />
          <rect
            x={primitive.x}
            y={primitive.y}
            width={primitive.width}
            height={primitive.height}
            stroke="transparent"
            strokeWidth={8 / zoom}
            fill="transparent"
          />
        </g>
      );
    }
  }
};
