"use client";

import { useRef, useEffect } from "react";
import styles from "./SimulationPanel.module.css";

interface SerialMonitorProps {
  output: string;
  visible: boolean;
  isError?: boolean;
  onDebugWithSparky?: (errorText: string) => void;
}

export default function SerialMonitor({ output, visible, isError, onDebugWithSparky }: SerialMonitorProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  if (!visible) return null;

  return (
    <div className={styles.serialSection}>
      <div className={styles.serialHeader}>
        <span>Serial Monitor</span>
        {isError && onDebugWithSparky && (
          <button
            onClick={() => onDebugWithSparky(output)}
            style={{
              marginLeft: 8,
              padding: "2px 10px",
              background: "#5c3a8a",
              border: "1px solid #7a5aaa",
              borderRadius: 4,
              color: "#e8d0ff",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "monospace",
              fontWeight: 600,
            }}
          >
            Debug with Sparky
          </button>
        )}
      </div>
      <div ref={outputRef} className={styles.serialOutput}>
        {output || "Serial output will appear here..."}
      </div>
    </div>
  );
}
