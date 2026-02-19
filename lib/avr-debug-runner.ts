import {
  avrInstruction,
  AVRTimer,
  CPU,
  timer0Config,
  timer1Config,
  timer2Config,
  AVRIOPort,
  AVRUSART,
  AVRTWI,
  AVRADC,
  portBConfig,
  portCConfig,
  portDConfig,
  usart0Config,
  twiConfig,
  adcConfig,
} from "avr8js";
import { loadHex } from "./intelhex";
import { disassembleProgram, type DisassembledInstruction } from "./disassembler";

export type DebuggerState = "stopped" | "running" | "paused";

export interface DebuggerEvent {
  type: "state-change" | "step" | "breakpoint-hit" | "serial-output" | "program-loaded";
}

export type DebuggerListener = (event: DebuggerEvent) => void;

const FLASH = 0x8000;

export class AVRDebugRunner {
  readonly program = new Uint16Array(FLASH);
  readonly cpu: CPU;
  readonly timer0: AVRTimer;
  readonly timer1: AVRTimer;
  readonly timer2: AVRTimer;
  readonly portB: AVRIOPort;
  readonly portC: AVRIOPort;
  readonly portD: AVRIOPort;
  readonly usart: AVRUSART;
  readonly twi: AVRTWI;
  readonly adc: AVRADC;
  readonly speed = 16e6;

  breakpoints = new Set<number>();
  state: DebuggerState = "stopped";
  disassembly: DisassembledInstruction[] = [];
  serialOutput = "";
  programSize = 0;

  recentWrites = new Set<number>();
  prevRegisters = new Uint8Array(32);
  prevSREG = 0;
  prevSP = 0;
  prevPC = 0;

  private listeners: DebuggerListener[] = [];
  private animFrameId: number | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private instructionsPerFrame = 10000;
  private hzMode = false; // true when speed <= 1000 (Hz-based stepping)

  constructor(hex: string) {
    loadHex(hex, new Uint8Array(this.program.buffer));
    this.cpu = new CPU(this.program);
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);
    this.usart = new AVRUSART(this.cpu, usart0Config, this.speed);
    this.twi = new AVRTWI(this.cpu, twiConfig, this.speed);
    this.adc = new AVRADC(this.cpu, adcConfig);

    this.usart.onByteTransmit = (byte: number) => {
      this.serialOutput += String.fromCharCode(byte);
      this.emit({ type: "serial-output" });
    };

    this.onProgramLoaded();
  }

  addListener(fn: DebuggerListener) {
    this.listeners.push(fn);
  }

  removeListener(fn: DebuggerListener) {
    const idx = this.listeners.indexOf(fn);
    if (idx >= 0) this.listeners.splice(idx, 1);
  }

  private emit(event: DebuggerEvent) {
    for (const fn of this.listeners) fn(event);
  }

  private savePrevState() {
    for (let i = 0; i < 32; i++) this.prevRegisters[i] = this.cpu.data[i];
    this.prevSREG = this.cpu.SREG;
    this.prevSP = this.cpu.SP;
    this.prevPC = this.cpu.pc;
  }

  private onProgramLoaded() {
    this.programSize = this.program.length;
    for (let i = this.program.length - 1; i >= 0; i--) {
      if (this.program[i] !== 0) {
        this.programSize = i + 1;
        break;
      }
    }

    this.state = "paused";
    this.serialOutput = "";
    this.recentWrites.clear();
    this.disassembly = disassembleProgram(this.program, this.programSize + 1);
    this.savePrevState();
    this.emit({ type: "program-loaded" });
    this.emit({ type: "state-change" });
  }

  step() {
    if (this.state === "stopped") return;
    this.savePrevState();
    this.recentWrites.clear();

    const origWrite = this.cpu.writeData.bind(this.cpu);
    this.cpu.writeData = (addr: number, value: number, mask?: number) => {
      this.recentWrites.add(addr);
      origWrite(addr, value, mask);
    };

    avrInstruction(this.cpu);
    this.cpu.tick();

    this.cpu.writeData = origWrite;

    this.state = "paused";
    this.emit({ type: "step" });
    this.emit({ type: "state-change" });
  }

  stepOver() {
    if (this.state === "stopped") return;
    const opcode = this.cpu.progMem[this.cpu.pc];
    const isCall = (opcode & 0xfe0e) === 0x940e || (opcode & 0xf000) === 0xd000;
    if (isCall) {
      const returnAddr = this.cpu.pc + ((opcode & 0xfe0e) === 0x940e ? 2 : 1);
      this.savePrevState();
      this.recentWrites.clear();
      let maxIter = 1000000;
      while (maxIter-- > 0) {
        avrInstruction(this.cpu);
        this.cpu.tick();
        if (this.cpu.pc === returnAddr || this.breakpoints.has(this.cpu.pc)) break;
      }
      this.state = "paused";
      this.emit({ type: "step" });
      this.emit({ type: "state-change" });
    } else {
      this.step();
    }
  }

  run() {
    if (this.state === "stopped") return;
    this.state = "running";
    this.emit({ type: "state-change" });
    if (this.hzMode) {
      this.hzLoop();
    } else {
      this.animFrameId = requestAnimationFrame(() => this.runLoop());
    }
  }

  private runLoop() {
    if (this.state !== "running") return;

    this.savePrevState();
    this.recentWrites.clear();

    for (let i = 0; i < this.instructionsPerFrame; i++) {
      avrInstruction(this.cpu);
      this.cpu.tick();

      if (this.breakpoints.has(this.cpu.pc)) {
        this.state = "paused";
        this.emit({ type: "breakpoint-hit" });
        this.emit({ type: "state-change" });
        return;
      }
    }

    this.emit({ type: "step" });
    this.animFrameId = requestAnimationFrame(() => this.runLoop());
  }

  private hzLoop() {
    if (this.state !== "running") return;

    this.savePrevState();
    this.recentWrites.clear();

    const origWrite = this.cpu.writeData.bind(this.cpu);
    this.cpu.writeData = (addr: number, value: number, mask?: number) => {
      this.recentWrites.add(addr);
      origWrite(addr, value, mask);
    };

    avrInstruction(this.cpu);
    this.cpu.tick();

    this.cpu.writeData = origWrite;

    if (this.breakpoints.has(this.cpu.pc)) {
      this.state = "paused";
      this.emit({ type: "breakpoint-hit" });
      this.emit({ type: "state-change" });
      return;
    }

    this.emit({ type: "step" });
    this.timerId = setTimeout(() => this.hzLoop(), 1000 / this.instructionsPerFrame);
  }

  pause() {
    if (this.state !== "running") return;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.state = "paused";
    this.emit({ type: "state-change" });
  }

  reset() {
    this.pause();
    this.cpu.reset();
    this.serialOutput = "";
    this.recentWrites.clear();
    this.state = this.programSize > 0 ? "paused" : "stopped";
    this.savePrevState();
    this.emit({ type: "state-change" });
  }

  stop() {
    this.pause();
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.state = "stopped";
    this.emit({ type: "state-change" });
  }

  toggleBreakpoint(addr: number) {
    if (this.breakpoints.has(addr)) {
      this.breakpoints.delete(addr);
    } else {
      this.breakpoints.add(addr);
    }
  }

  setSpeed(value: number) {
    // Values <= 1000 are Hz-based (1 instruction per tick at that frequency)
    // Values > 1000 are instructions-per-frame (bulk execution)
    this.hzMode = value <= 1000;
    this.instructionsPerFrame = value;

    // If currently running, restart the loop with the new speed
    if (this.state === "running") {
      if (this.animFrameId !== null) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      if (this.timerId !== null) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      if (this.hzMode) {
        this.hzLoop();
      } else {
        this.animFrameId = requestAnimationFrame(() => this.runLoop());
      }
    }
  }

  getSpeed(): number {
    return this.instructionsPerFrame;
  }

  getDisasmIndexForPC(pc: number): number {
    return this.disassembly.findIndex((inst) => inst.address === pc);
  }
}
