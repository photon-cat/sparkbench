"use client";

import { useEffect, useRef } from "react";
import type { DisassembledInstruction } from "@/lib/disassembler";
import styles from "./DebugPanel.module.css";

interface DisassemblyViewProps {
  disassembly: DisassembledInstruction[];
  pc: number;
  breakpoints: Set<number>;
  onToggleBreakpoint: (addr: number) => void;
}

export default function DisassemblyView({
  disassembly,
  pc,
  breakpoints,
  onToggleBreakpoint,
}: DisassemblyViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pcRowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current PC
  useEffect(() => {
    if (pcRowRef.current && containerRef.current) {
      pcRowRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [pc]);

  return (
    <div ref={containerRef} className={styles.disassembly}>
      {disassembly.map((inst) => {
        const isCurrent = inst.address === pc;
        const hasBp = breakpoints.has(inst.address);
        return (
          <div
            key={inst.address}
            ref={isCurrent ? pcRowRef : undefined}
            className={`${styles.disasmRow} ${isCurrent ? styles.disasmCurrent : ""}`}
          >
            <span
              className={`${styles.disasmBp} ${hasBp ? styles.disasmBpActive : ""}`}
              onClick={() => onToggleBreakpoint(inst.address)}
            />
            <span className={styles.disasmAddr}>
              {(inst.address * 2).toString(16).padStart(4, "0")}
            </span>
            <span className={styles.disasmBytes}>{inst.bytes}</span>
            <span className={styles.disasmMnemonic}>{inst.mnemonic}</span>
            <span className={styles.disasmOperands}>{inst.operands}</span>
          </div>
        );
      })}
    </div>
  );
}
