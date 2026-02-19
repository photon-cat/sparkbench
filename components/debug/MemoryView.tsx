"use client";

import { useState } from "react";
import type { CPU } from "avr8js";
import styles from "./DebugPanel.module.css";

interface MemoryViewProps {
  cpu: CPU | null;
  recentWrites: Set<number>;
}

const ROWS = 16;
const COLS = 16;

export default function MemoryView({ cpu, recentWrites }: MemoryViewProps) {
  const [region, setRegion] = useState<"sram" | "flash">("sram");
  const [startAddr, setStartAddr] = useState(0);

  if (!cpu) return <div className={styles.memory}>No CPU</div>;

  const data = region === "sram" ? cpu.data : cpu.progBytes;
  const maxAddr = data.length;

  const alignedStart = Math.max(0, startAddr & ~0xf);

  return (
    <div className={styles.memory}>
      <div className={styles.memControls}>
        <select
          value={region}
          onChange={(e) => {
            setRegion(e.target.value as "sram" | "flash");
            setStartAddr(0);
          }}
          className={styles.memSelect}
        >
          <option value="sram">SRAM</option>
          <option value="flash">Flash</option>
        </select>
        <input
          type="text"
          placeholder="Address"
          className={styles.memAddrInput}
          onChange={(e) => {
            const v = parseInt(e.target.value, 16);
            if (!isNaN(v) && v >= 0 && v < maxAddr) setStartAddr(v);
          }}
        />
      </div>
      <div className={styles.memDump}>
        <div className={styles.memHeader}>
          <span className={styles.memAddrCol}>Addr</span>
          {Array.from({ length: COLS }, (_, i) => (
            <span key={i} className={styles.memHexCol}>
              {i.toString(16).toUpperCase()}
            </span>
          ))}
          <span className={styles.memAsciiCol}>ASCII</span>
        </div>
        {Array.from({ length: ROWS }, (_, row) => {
          const rowAddr = alignedStart + row * COLS;
          if (rowAddr >= maxAddr) return null;
          return (
            <div key={row} className={styles.memRow}>
              <span className={styles.memAddrCol}>
                {rowAddr.toString(16).padStart(4, "0")}
              </span>
              {Array.from({ length: COLS }, (_, col) => {
                const addr = rowAddr + col;
                if (addr >= maxAddr) return <span key={col} className={styles.memHexCol}>  </span>;
                const val = data[addr];
                const isRecent = region === "sram" && recentWrites.has(addr);
                return (
                  <span
                    key={col}
                    className={`${styles.memHexCol} ${isRecent ? styles.memRecent : ""} ${val === 0 ? styles.memZero : ""}`}
                  >
                    {val.toString(16).padStart(2, "0")}
                  </span>
                );
              })}
              <span className={styles.memAsciiCol}>
                {Array.from({ length: COLS }, (_, col) => {
                  const addr = rowAddr + col;
                  if (addr >= maxAddr) return " ";
                  const val = data[addr];
                  return val >= 0x20 && val <= 0x7e ? String.fromCharCode(val) : ".";
                }).join("")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
