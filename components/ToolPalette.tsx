"use client";

import Fab from "@mui/material/Fab";

export type ToolType = "cursor" | "wire" | "label";

interface ToolPaletteProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const fabSx = (active: boolean) => ({
  width: 36,
  height: 36,
  minHeight: 36,
  bgcolor: active ? "#2563eb" : "#333",
  color: "white",
  "&:hover": { bgcolor: active ? "#1d4ed8" : "#444" },
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
});

function CursorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M4 2L4 16L8.5 11.5L13 18L15 17L10.5 10.5L16 10L4 2Z" fill="currentColor" />
    </svg>
  );
}

function WireIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="3" cy="3" r="2.5" fill="currentColor" />
      <path d="M3 3L3 12L17 12L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="17" r="2.5" fill="currentColor" />
    </svg>
  );
}

function LabelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M2 4L12 4L16 10L12 16L2 16Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="5" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
}

export default function ToolPalette({ activeTool, onToolChange }: ToolPaletteProps) {
  return (
    <div
      style={{
        position: "absolute",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 10,
      }}
    >
      <Fab size="small" sx={fabSx(activeTool === "cursor")} onClick={() => onToolChange("cursor")} title="Cursor (Esc)">
        <CursorIcon />
      </Fab>
      <Fab size="small" sx={fabSx(activeTool === "wire")} onClick={() => onToolChange("wire")} title="Wire (W)">
        <WireIcon />
      </Fab>
      <Fab size="small" sx={fabSx(activeTool === "label")} onClick={() => onToolChange("label")} title="Global Netlabel (L)">
        <LabelIcon />
      </Fab>
    </div>
  );
}
