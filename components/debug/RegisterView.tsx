"use client";

import styles from "./DebugPanel.module.css";

interface RegisterViewProps {
  registers: Uint8Array;
  prevRegisters: Uint8Array;
  sreg: number;
  pc: number;
  sp: number;
  cycles: number;
}

const SREG_BITS = ["I", "T", "H", "S", "V", "N", "Z", "C"];

export default function RegisterView({
  registers,
  prevRegisters,
  sreg,
  pc,
  sp,
  cycles,
}: RegisterViewProps) {
  return (
    <div className={styles.registers}>
      <div className={styles.regSection}>
        <div className={styles.regLabel}>SREG</div>
        <div className={styles.sregBits}>
          {SREG_BITS.map((name, i) => {
            const bit = 7 - i;
            const isSet = (sreg >> bit) & 1;
            return (
              <span
                key={name}
                className={`${styles.sregBit} ${isSet ? styles.sregBitSet : ""}`}
              >
                {name}
              </span>
            );
          })}
        </div>
      </div>

      <div className={styles.regSection}>
        <div className={styles.regRow}>
          <span className={styles.regLabel}>PC</span>
          <span className={styles.regValue}>0x{(pc * 2).toString(16).padStart(4, "0")}</span>
        </div>
        <div className={styles.regRow}>
          <span className={styles.regLabel}>SP</span>
          <span className={styles.regValue}>0x{sp.toString(16).padStart(4, "0")}</span>
        </div>
        <div className={styles.regRow}>
          <span className={styles.regLabel}>Cycles</span>
          <span className={styles.regValue}>{cycles.toLocaleString()}</span>
        </div>
      </div>

      <div className={styles.regSection}>
        <div className={styles.regLabel}>Registers</div>
        <div className={styles.regGrid}>
          {Array.from({ length: 32 }, (_, i) => {
            const val = registers[i] ?? 0;
            const prev = prevRegisters[i] ?? 0;
            const changed = val !== prev;
            return (
              <div
                key={i}
                className={`${styles.regCell} ${changed ? styles.regChanged : ""}`}
                title={`r${i} = ${val} (0x${val.toString(16).padStart(2, "0")})`}
              >
                <span className={styles.regCellName}>r{i}</span>
                <span className={styles.regCellValue}>
                  {val.toString(16).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
