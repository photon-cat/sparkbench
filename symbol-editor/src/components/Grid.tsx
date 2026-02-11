import React from "react";
import type { Viewport } from "../types";

interface GridProps {
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
}

export const Grid: React.FC<GridProps> = React.memo(
  ({ viewport, canvasWidth, canvasHeight }) => {
    const { offsetX, offsetY, zoom } = viewport;

    // Visible area in symbol space
    const left = offsetX - canvasWidth / 2 / zoom;
    const top = offsetY - canvasHeight / 2 / zoom;
    const right = offsetX + canvasWidth / 2 / zoom;
    const bottom = offsetY + canvasHeight / 2 / zoom;

    // Pick grid spacing based on zoom level
    const fineStep = zoom > 200 ? 0.05 : 0.1;
    const coarseStep = fineStep * 5;

    const fineLines: React.ReactNode[] = [];
    const coarseLines: React.ReactNode[] = [];

    // Vertical lines
    const startX = Math.floor(left / fineStep) * fineStep;
    for (let x = startX; x <= right; x += fineStep) {
      const rx = Math.round(x * 1000) / 1000;
      const isCoarse = Math.abs(rx % coarseStep) < 0.001;
      const arr = isCoarse ? coarseLines : fineLines;
      arr.push(
        <line
          key={`v${rx}`}
          x1={rx}
          y1={top}
          x2={rx}
          y2={bottom}
          stroke={isCoarse ? "#ccc" : "#eee"}
          strokeWidth={isCoarse ? 1.5 / zoom : 0.8 / zoom}
        />
      );
    }

    // Horizontal lines
    const startY = Math.floor(top / fineStep) * fineStep;
    for (let y = startY; y <= bottom; y += fineStep) {
      const ry = Math.round(y * 1000) / 1000;
      const isCoarse = Math.abs(ry % coarseStep) < 0.001;
      const arr = isCoarse ? coarseLines : fineLines;
      arr.push(
        <line
          key={`h${ry}`}
          x1={left}
          y1={ry}
          x2={right}
          y2={ry}
          stroke={isCoarse ? "#ccc" : "#eee"}
          strokeWidth={isCoarse ? 1.5 / zoom : 0.8 / zoom}
        />
      );
    }

    // Origin crosshair
    const originLines = (
      <>
        <line
          x1={left}
          y1={0}
          x2={right}
          y2={0}
          stroke="#bbb"
          strokeWidth={2 / zoom}
        />
        <line
          x1={0}
          y1={top}
          x2={0}
          y2={bottom}
          stroke="#bbb"
          strokeWidth={2 / zoom}
        />
      </>
    );

    return (
      <g>
        {fineLines}
        {coarseLines}
        {originLines}
      </g>
    );
  }
);

Grid.displayName = "Grid";
