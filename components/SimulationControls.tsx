"use client";

import { useState, useEffect, useRef } from "react";
import Fab from "@mui/material/Fab";
import Popover from "@mui/material/Popover";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import GridOnIcon from "@mui/icons-material/GridOn";
import HelpIcon from "@mui/icons-material/Help";
import AddPartPanel from "./AddPartPanel";
import type { AVRRunner } from "@/lib/avr-runner";

type Status = "idle" | "compiling" | "running" | "paused" | "error";

interface SimulationControlsProps {
  status: Status;
  runner: AVRRunner | null;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onAddPart: (partType: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onToggleGrid?: () => void;
}

function formatTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

const fabSx = (bg: string, hoverBg: string) => ({
  width: 36,
  height: 36,
  minHeight: 36,
  bgcolor: bg,
  color: "white",
  "&:hover": { bgcolor: hoverBg },
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
});

export default function SimulationControls({
  status,
  runner,
  onStart,
  onStop,
  onPause,
  onResume,
  onRestart,
  onAddPart,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleGrid,
}: SimulationControlsProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null);
  const [displayMs, setDisplayMs] = useState(0);
  const [speed, setSpeed] = useState(0);

  const accumulatedMsRef = useRef(0);
  const segmentStartRef = useRef(0);
  const prevStatusRef = useRef<Status>(status);

  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isActive = isRunning || isPaused;
  const isCompiling = status === "compiling";

  // Handle status transitions for timer
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === "running" && (prev === "idle" || prev === "compiling" || prev === "error")) {
      accumulatedMsRef.current = 0;
      segmentStartRef.current = Date.now();
    } else if (status === "running" && prev === "paused") {
      segmentStartRef.current = Date.now();
    } else if (status === "paused" && prev === "running") {
      accumulatedMsRef.current += Date.now() - segmentStartRef.current;
    } else if (status === "idle") {
      accumulatedMsRef.current = 0;
      setDisplayMs(0);
      setSpeed(0);
    }
  }, [status]);

  // Timer interval while running
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const total = accumulatedMsRef.current + (now - segmentStartRef.current);
      setDisplayMs(total);

      if (runner && total > 0) {
        const expectedCycles = (total / 1000) * 16_000_000;
        const actualCycles = runner.cpu.cycles;
        setSpeed(Math.round((actualCycles / expectedCycles) * 100));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, runner]);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(e.currentTarget);
  };
  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  type MenuEntry = { icon: React.ReactNode; label: string; shortcut: string; action?: () => void; disabled?: boolean } | "divider";

  const menuItems: MenuEntry[] = [
    { icon: <UndoIcon fontSize="small" />, label: "Undo", shortcut: "Ctrl+Z", action: onUndo, disabled: !canUndo },
    { icon: <RedoIcon fontSize="small" />, label: "Redo", shortcut: "Ctrl+Shift+Z", action: onRedo, disabled: !canRedo },
    "divider",
    { icon: <ZoomOutMapIcon fontSize="small" />, label: "Fit", shortcut: "F" },
    { icon: <ZoomInIcon fontSize="small" />, label: "Zoom in", shortcut: "+" },
    { icon: <ZoomOutIcon fontSize="small" />, label: "Zoom out", shortcut: "-" },
    "divider",
    { icon: <GridOnIcon fontSize="small" />, label: "Toggle Grid", shortcut: "G", action: onToggleGrid },
    "divider",
    { icon: <HelpIcon fontSize="small" />, label: "Help", shortcut: "?" },
  ];

  // Idle / compiling / error state
  if (!isActive) {
    return (
      <>
        <Fab
          size="small"
          onClick={onStart}
          disabled={isCompiling}
          sx={{
            ...fabSx("#335533", "#446644"),
            "&.Mui-disabled": { bgcolor: "#2a2a2a", color: "#666" },
          }}
        >
          <PlayArrowIcon />
        </Fab>
        <Fab size="small" onClick={(e) => setAddAnchor(e.currentTarget)} sx={fabSx("#2563eb", "#1d4ed8")}>
          <AddIcon />
        </Fab>
        <Fab size="small" onClick={handleMenuOpen} sx={fabSx("rgba(50,50,50,0.8)", "rgba(70,70,70,0.9)")}>
          <MoreVertIcon />
        </Fab>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          slotProps={{
            paper: {
              sx: {
                bgcolor: "#2a2a2a",
                color: "#999",
                minWidth: 220,
                "& .MuiMenuItem-root": { py: 0.75, px: 2 },
              },
            },
          }}
        >
          {menuItems.map((item, i) =>
            item === "divider" ? (
              <Divider key={i} sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
            ) : (
              <MenuItem
                key={i}
                disabled={item.disabled ?? !item.action}
                onClick={() => {
                  item.action?.();
                  handleMenuClose();
                }}
                sx={{ opacity: (item.disabled ?? !item.action) ? "0.5 !important" : 1 }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 32 }}>{item.icon}</ListItemIcon>
                <ListItemText>{item.label}</ListItemText>
                <Typography variant="body2" sx={{ color: "#666", ml: 3, fontSize: 12 }}>
                  {item.shortcut}
                </Typography>
              </MenuItem>
            ),
          )}
        </Menu>

        <Popover
          open={Boolean(addAnchor)}
          anchorEl={addAnchor}
          onClose={() => setAddAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          transformOrigin={{ vertical: "bottom", horizontal: "center" }}
          slotProps={{
            paper: {
              sx: { bgcolor: "transparent", boxShadow: "0 4px 20px rgba(0,0,0,0.5)", borderRadius: 2, overflow: "hidden" },
            },
          }}
        >
          <AddPartPanel
            onSelect={(type) => {
              onAddPart(type);
              setAddAnchor(null);
            }}
          />
        </Popover>
      </>
    );
  }

  // Running / paused state
  return (
    <>
      <Fab size="small" onClick={onRestart} sx={fabSx("#335533", "#446644")}>
        <ReplayIcon />
      </Fab>
      <Fab
        size="small"
        onClick={onStop}
        sx={fabSx("#333", "#444")}
      >
        <StopIcon sx={{ fontSize: 18 }} />
      </Fab>
      <Fab
        size="small"
        onClick={isPaused ? onResume : onPause}
        sx={fabSx("rgba(50,50,50,0.8)", "rgba(70,70,70,0.9)")}
      >
        {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
      </Fab>

      <Typography
        sx={{
          color: "#ccc",
          fontSize: 13,
          fontFamily: '"Cascadia Code", "Fira Code", monospace',
          ml: 1,
          userSelect: "none",
        }}
      >
        {formatTime(displayMs)}
      </Typography>

      <Typography
        sx={{
          color: "#999",
          fontSize: 12,
          fontFamily: '"Cascadia Code", "Fira Code", monospace',
          ml: 0.5,
          userSelect: "none",
        }}
      >
        {speed}%
      </Typography>
    </>
  );
}
