"use client";

import { useState, useRef, useCallback } from "react";
import type { Diagram } from "@/lib/diagram-parser";
import type { AVRRunner } from "@/lib/avr-runner";
import { buildProject } from "@/lib/api";

export type SimulationStatus = "idle" | "compiling" | "running" | "paused" | "error";

export interface UseSimulationOptions {
  slug: string;
  diagram: Diagram | null;
  sketchCode: string;
  projectFiles: { name: string; content: string }[];
}

export interface UseSimulationReturn {
  status: SimulationStatus;
  serialOutput: string;
  runner: AVRRunner | null;
  handleStart: () => Promise<void>;
  handleStop: () => void;
  handlePause: () => void;
  handleResume: () => void;
  handleRestart: () => void;
}

export function useSimulation({
  slug,
  diagram,
  sketchCode,
  projectFiles,
}: UseSimulationOptions): UseSimulationReturn {
  const [status, setStatus] = useState<SimulationStatus>("idle");
  const [serialOutput, setSerialOutput] = useState("");
  const [runner, setRunner] = useState<AVRRunner | null>(null);
  const runnerRef = useRef<AVRRunner | null>(null);

  const handleStart = useCallback(async () => {
    if (!diagram) return;

    setStatus("compiling");
    setSerialOutput("");

    try {
      const buildResult = await buildProject(slug, sketchCode, projectFiles);

      if (!buildResult.success) {
        setStatus("error");
        setSerialOutput(`Build error: ${buildResult.error}\n`);
        return;
      }

      const { AVRRunner } = await import("@/lib/avr-runner");

      if (runnerRef.current) {
        runnerRef.current.stop();
      }

      const newRunner = new AVRRunner(buildResult.hex);
      runnerRef.current = newRunner;

      newRunner.usart.onByteTransmit = (byte: number) => {
        setSerialOutput((prev) => prev + String.fromCharCode(byte));
      };

      setRunner(newRunner);
      setStatus("running");

      newRunner.execute(() => {});
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : String(err);
      setSerialOutput(`Error: ${msg}\n`);
    }
  }, [diagram, sketchCode, slug, projectFiles]);

  const handleStop = useCallback(() => {
    if (runnerRef.current) {
      runnerRef.current.stop();
      runnerRef.current = null;
    }
    setRunner(null);
    setStatus("idle");
  }, []);

  const handlePause = useCallback(() => {
    if (runnerRef.current) {
      runnerRef.current.stop();
    }
    setStatus("paused");
  }, []);

  const handleResume = useCallback(() => {
    if (runnerRef.current) {
      runnerRef.current.resume();
      runnerRef.current.execute(() => {});
    }
    setStatus("running");
  }, []);

  const handleRestart = useCallback(() => {
    if (runnerRef.current) {
      runnerRef.current.stop();
      runnerRef.current = null;
    }
    setRunner(null);
    setStatus("idle");
    setTimeout(() => handleStart(), 0);
  }, [handleStart]);

  return {
    status,
    serialOutput,
    runner,
    handleStart,
    handleStop,
    handlePause,
    handleResume,
    handleRestart,
  };
}
