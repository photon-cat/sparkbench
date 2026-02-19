"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Diagram } from "@/lib/diagram-parser";
import type { AVRDebugRunner, DebuggerState } from "@/lib/avr-debug-runner";
import type { DisassembledInstruction } from "@/lib/disassembler";
import { buildProject, type SourceMapEntry } from "@/lib/api";

export type DebugStatus = "idle" | "compiling" | "paused" | "running" | "error";

export interface UseDebuggerOptions {
  projectId: string;
  diagram: Diagram | null;
  sketchCode: string;
  projectFiles: { name: string; content: string }[];
  board?: string;
  librariesTxt?: string;
}

export interface UseDebuggerReturn {
  status: DebugStatus;
  debugRunner: AVRDebugRunner | null;
  disassembly: DisassembledInstruction[];
  registers: Uint8Array;
  prevRegisters: Uint8Array;
  sreg: number;
  pc: number;
  sp: number;
  cycles: number;
  breakpoints: Set<number>;
  serialOutput: string;
  recentWrites: Set<number>;
  sourceMap: SourceMapEntry[] | null;

  speed: number;
  handleSpeedChange: (value: number) => void;
  handleStartDebug: () => Promise<void>;
  handleStop: () => void;
  handleStep: () => void;
  handleStepOver: () => void;
  handleRun: () => void;
  handlePause: () => void;
  handleReset: () => void;
  handleToggleBreakpoint: (addr: number) => void;
  handleToggleBreakpointLine: (line: number) => void;
}

const EMPTY_REGISTERS = new Uint8Array(32);
const EMPTY_SET = new Set<number>();

export function useDebugger({
  projectId,
  diagram,
  sketchCode,
  projectFiles,
  board,
  librariesTxt,
}: UseDebuggerOptions): UseDebuggerReturn {
  const [status, setStatus] = useState<DebugStatus>("idle");
  const [debugRunner, setDebugRunner] = useState<AVRDebugRunner | null>(null);
  const [disassembly, setDisassembly] = useState<DisassembledInstruction[]>([]);
  const [registers, setRegisters] = useState<Uint8Array>(EMPTY_REGISTERS);
  const [prevRegisters, setPrevRegisters] = useState<Uint8Array>(EMPTY_REGISTERS);
  const [sreg, setSreg] = useState(0);
  const [pc, setPc] = useState(0);
  const [sp, setSp] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(EMPTY_SET);
  const [serialOutput, setSerialOutput] = useState("");
  const [recentWrites, setRecentWrites] = useState<Set<number>>(EMPTY_SET);
  const [sourceMap, setSourceMap] = useState<SourceMapEntry[] | null>(null);
  const [speed, setSpeed] = useState(10000);

  const runnerRef = useRef<AVRDebugRunner | null>(null);

  const syncState = useCallback(() => {
    const r = runnerRef.current;
    if (!r) return;
    setRegisters(new Uint8Array(r.cpu.data.buffer, 0, 32));
    setPrevRegisters(new Uint8Array(r.prevRegisters));
    setSreg(r.cpu.SREG);
    setPc(r.cpu.pc);
    setSp(r.cpu.SP);
    setCycles(r.cpu.cycles);
    setSerialOutput(r.serialOutput);
    setRecentWrites(new Set(r.recentWrites));
    setBreakpoints(new Set(r.breakpoints));
  }, []);

  const mapDebuggerState = useCallback((state: DebuggerState): DebugStatus => {
    if (state === "running") return "running";
    if (state === "paused") return "paused";
    return "idle";
  }, []);

  const handleStartDebug = useCallback(async () => {
    if (!diagram) return;

    setStatus("compiling");
    setSerialOutput("");

    try {
      const buildResult = await buildProject(
        projectId, sketchCode, projectFiles, board || "uno", librariesTxt || "", true,
      );

      if (!buildResult.success) {
        setStatus("error");
        setSerialOutput(`Build error: ${buildResult.error}\n${buildResult.stderr || ""}`);
        return;
      }

      const { AVRDebugRunner } = await import("@/lib/avr-debug-runner");

      if (runnerRef.current) {
        runnerRef.current.stop();
      }

      const runner = new AVRDebugRunner(buildResult.hex);
      runnerRef.current = runner;

      runner.addListener((event) => {
        if (event.type === "state-change") {
          setStatus(mapDebuggerState(runner.state));
          syncState();
        } else if (event.type === "step" || event.type === "breakpoint-hit") {
          syncState();
        } else if (event.type === "serial-output") {
          setSerialOutput(runner.serialOutput);
        }
      });

      setDebugRunner(runner);
      setDisassembly(runner.disassembly);
      setSourceMap(buildResult.sourceMap || null);
      setStatus("paused");
      syncState();
    } catch (err) {
      setStatus("error");
      setSerialOutput(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }, [diagram, sketchCode, projectId, projectFiles, board, librariesTxt, syncState, mapDebuggerState]);

  const handleStop = useCallback(() => {
    if (runnerRef.current) {
      runnerRef.current.stop();
      runnerRef.current = null;
    }
    setDebugRunner(null);
    setDisassembly([]);
    setSourceMap(null);
    setStatus("idle");
  }, []);

  const handleStep = useCallback(() => {
    runnerRef.current?.step();
  }, []);

  const handleStepOver = useCallback(() => {
    runnerRef.current?.stepOver();
  }, []);

  const handleRun = useCallback(() => {
    runnerRef.current?.run();
  }, []);

  const handlePause = useCallback(() => {
    runnerRef.current?.pause();
  }, []);

  const handleReset = useCallback(() => {
    runnerRef.current?.reset();
  }, []);

  const handleSpeedChange = useCallback((value: number) => {
    setSpeed(value);
    runnerRef.current?.setSpeed(value);
  }, []);

  const handleToggleBreakpoint = useCallback((addr: number) => {
    const r = runnerRef.current;
    if (!r) return;
    r.toggleBreakpoint(addr);
    setBreakpoints(new Set(r.breakpoints));
  }, []);

  const handleToggleBreakpointLine = useCallback((line: number) => {
    const r = runnerRef.current;
    if (!r || !sourceMap) return;
    // Find addresses for this source line (in main.cpp, line+1 because of auto-added Arduino.h include)
    const adjustedLine = line + 1;
    const addrs = sourceMap
      .filter((e) => e.file === "main.cpp" && e.line === adjustedLine)
      .map((e) => e.address);
    if (addrs.length === 0) return;
    // Toggle all addresses for this line
    const firstAddr = addrs[0];
    const isSet = r.breakpoints.has(firstAddr);
    for (const addr of addrs) {
      if (isSet) {
        r.breakpoints.delete(addr);
      } else {
        r.breakpoints.add(addr);
      }
    }
    setBreakpoints(new Set(r.breakpoints));
  }, [sourceMap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (runnerRef.current) {
        runnerRef.current.stop();
        runnerRef.current = null;
      }
    };
  }, []);

  return {
    status,
    debugRunner,
    disassembly,
    registers,
    prevRegisters,
    sreg,
    pc,
    sp,
    cycles,
    breakpoints,
    serialOutput,
    recentWrites,
    sourceMap,
    speed,
    handleSpeedChange,
    handleStartDebug,
    handleStop,
    handleStep,
    handleStepOver,
    handleRun,
    handlePause,
    handleReset,
    handleToggleBreakpoint,
    handleToggleBreakpointLine,
  };
}
