"use client";

import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RedoIcon from "@mui/icons-material/Redo";
import ReplayIcon from "@mui/icons-material/Replay";
import styles from "./DebugPanel.module.css";

interface DebugToolbarProps {
  status: "idle" | "compiling" | "paused" | "running" | "error";
  pc: number;
  cycles: number;
  speed: number;
  onSpeedChange: (instructionsPerFrame: number) => void;
  onStep: () => void;
  onStepOver: () => void;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  onStop: () => void;
}

const fabSx = (bg: string, hoverBg: string) => ({
  width: 30,
  height: 30,
  minHeight: 30,
  bgcolor: bg,
  color: "white",
  "&:hover": { bgcolor: hoverBg },
  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
});

export default function DebugToolbar({
  status,
  pc,
  cycles,
  speed,
  onSpeedChange,
  onStep,
  onStepOver,
  onRun,
  onPause,
  onReset,
  onStop,
}: DebugToolbarProps) {
  const isPaused = status === "paused";
  const isRunning = status === "running";
  const isActive = isPaused || isRunning;

  return (
    <div className={styles.toolbar}>
      <Tooltip title={isRunning ? "Pause (F5)" : "Run (F5)"} arrow placement="bottom">
        <span>
          <Fab
            size="small"
            onClick={isPaused ? onRun : onPause}
            disabled={!isActive}
            sx={fabSx("#335533", "#446644")}
          >
            {isRunning ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayArrowIcon sx={{ fontSize: 16 }} />}
          </Fab>
        </span>
      </Tooltip>
      <Tooltip title="Step Into (F10)" arrow placement="bottom">
        <span>
          <Fab
            size="small"
            onClick={onStep}
            disabled={!isPaused}
            sx={fabSx("#2563eb", "#1d4ed8")}
          >
            <SkipNextIcon sx={{ fontSize: 16 }} />
          </Fab>
        </span>
      </Tooltip>
      <Tooltip title="Step Over (F11)" arrow placement="bottom">
        <span>
          <Fab
            size="small"
            onClick={onStepOver}
            disabled={!isPaused}
            sx={fabSx("#7c3aed", "#6d28d9")}
          >
            <RedoIcon sx={{ fontSize: 16 }} />
          </Fab>
        </span>
      </Tooltip>
      <Tooltip title="Reset (F9)" arrow placement="bottom">
        <span>
          <Fab
            size="small"
            onClick={onReset}
            disabled={!isActive}
            sx={fabSx("#92400e", "#78350f")}
          >
            <ReplayIcon sx={{ fontSize: 16 }} />
          </Fab>
        </span>
      </Tooltip>
      <Tooltip title="Stop Debug (Esc)" arrow placement="bottom">
        <span>
          <Fab
            size="small"
            onClick={onStop}
            disabled={!isActive}
            sx={fabSx("#333", "#444")}
          >
            <StopIcon sx={{ fontSize: 14 }} />
          </Fab>
        </span>
      </Tooltip>

      <Tooltip title="Instructions per second (e.g. 10, 1000, 100000)" arrow placement="bottom">
        <input
          type="text"
          className={styles.speedInput}
          defaultValue={speed}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = parseInt((e.target as HTMLInputElement).value, 10);
              if (!isNaN(v) && v > 0) onSpeedChange(v);
            }
          }}
          onBlur={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v > 0) onSpeedChange(v);
          }}
        />
      </Tooltip>

      <div className={styles.toolbarInfo}>
        <Typography component="span" sx={{ color: "#7dd3fc", fontSize: 11, fontFamily: "monospace" }}>
          PC: 0x{(pc * 2).toString(16).padStart(4, "0")}
        </Typography>
        <Typography component="span" sx={{ color: "#999", fontSize: 11, fontFamily: "monospace", ml: 1.5 }}>
          Cycles: {cycles.toLocaleString()}
        </Typography>
      </div>
    </div>
  );
}
