"use client";

import { useState, useCallback, useRef } from "react";
import type { UseDebuggerReturn } from "@/hooks/useDebugger";
import DebugToolbar from "./DebugToolbar";
import DisassemblyView from "./DisassemblyView";
import RegisterView from "./RegisterView";
import MemoryView from "./MemoryView";
import styles from "./DebugPanel.module.css";

interface DebugPanelProps {
  debug: UseDebuggerReturn;
}

type RightTab = "registers" | "memory" | "serial";

export default function DebugPanel({ debug }: DebugPanelProps) {
  const [rightTab, setRightTab] = useState<RightTab>("registers");
  const [rightWidth, setRightWidth] = useState(280);
  const dividerRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dividerRef.current = { startX: e.clientX, startWidth: rightWidth };
    const el = e.currentTarget as HTMLElement;
    el.classList.add(styles.panelDividerActive);

    const onMove = (ev: MouseEvent) => {
      if (!dividerRef.current) return;
      const delta = dividerRef.current.startX - ev.clientX;
      setRightWidth(Math.min(Math.max(dividerRef.current.startWidth + delta, 200), 700));
    };
    const onUp = () => {
      dividerRef.current = null;
      el.classList.remove(styles.panelDividerActive);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [rightWidth]);

  return (
    <div className={styles.panel}>
      <DebugToolbar
        status={debug.status}
        pc={debug.pc}
        cycles={debug.cycles}
        speed={debug.speed}
        onSpeedChange={debug.handleSpeedChange}
        onStep={debug.handleStep}
        onStepOver={debug.handleStepOver}
        onRun={debug.handleRun}
        onPause={debug.handlePause}
        onReset={debug.handleReset}
        onStop={debug.handleStop}
      />
      <div className={styles.panelBody}>
        <div className={styles.panelLeft}>
          <DisassemblyView
            disassembly={debug.disassembly}
            pc={debug.pc}
            breakpoints={debug.breakpoints}
            onToggleBreakpoint={debug.handleToggleBreakpoint}
          />
        </div>
        <div className={styles.panelDivider} onMouseDown={handleDividerDown} />
        <div className={styles.panelRight} style={{ width: rightWidth }}>
          <div className={styles.tabBar}>
            {(["registers", "memory", "serial"] as const).map((tab) => (
              <button
                key={tab}
                className={`${styles.tab} ${rightTab === tab ? styles.tabActive : ""}`}
                onClick={() => setRightTab(tab)}
              >
                {tab === "registers" ? "Regs" : tab === "memory" ? "Memory" : "Serial"}
              </button>
            ))}
          </div>
          <div className={styles.tabContent}>
            {rightTab === "registers" && (
              <RegisterView
                registers={debug.registers}
                prevRegisters={debug.prevRegisters}
                sreg={debug.sreg}
                pc={debug.pc}
                sp={debug.sp}
                cycles={debug.cycles}
              />
            )}
            {rightTab === "memory" && (
              <MemoryView
                cpu={debug.debugRunner?.cpu ?? null}
                recentWrites={debug.recentWrites}
              />
            )}
            {rightTab === "serial" && (
              <pre className={styles.serialOutput}>
                {debug.serialOutput || "(no output)"}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
