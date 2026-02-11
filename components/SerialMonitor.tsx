"use client";

import { useRef, useEffect } from "react";
import styles from "./SimulationPanel.module.css";

interface SerialMonitorProps {
  output: string;
  visible: boolean;
}

export default function SerialMonitor({ output, visible }: SerialMonitorProps) {
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
      </div>
      <div ref={outputRef} className={styles.serialOutput}>
        {output || "Serial output will appear here..."}
      </div>
    </div>
  );
}
