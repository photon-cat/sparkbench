// SPDX-License-Identifier: MIT
// Based on avr8js demo execute.ts by Uri Shaked

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
  portBConfig,
  portCConfig,
  portDConfig,
  usart0Config,
  twiConfig,
} from "avr8js";
import { loadHex } from "./intelhex";
import { MicroTaskScheduler } from "./task-scheduler";

// ATmega328p flash size
const FLASH = 0x8000;

export class AVRRunner {
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
  readonly speed = 16e6; // 16 MHz
  readonly workUnitCycles = 500000;
  readonly taskScheduler = new MicroTaskScheduler();
  private wallStartMs = 0;
  private simStartCycles = 0;

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
    this.taskScheduler.start();
  }

  execute(callback: (cpu: CPU) => void) {
    if (this.wallStartMs === 0) {
      this.wallStartMs = performance.now();
      this.simStartCycles = this.cpu.cycles;
    }

    const cyclesToRun = this.cpu.cycles + this.workUnitCycles;
    while (this.cpu.cycles < cyclesToRun) {
      avrInstruction(this.cpu);
      this.cpu.tick();
    }
    callback(this.cpu);

    // Throttle to real-time: compare simulated time vs wall-clock time
    const simElapsedMs = ((this.cpu.cycles - this.simStartCycles) / this.speed) * 1000;
    const wallElapsedMs = performance.now() - this.wallStartMs;
    const aheadMs = simElapsedMs - wallElapsedMs;

    if (aheadMs > 2) {
      // Simulation is ahead of real-time, delay before next batch
      setTimeout(() => this.execute(callback), aheadMs);
    } else {
      // Simulation is behind or on-time, run immediately
      this.taskScheduler.postTask(() => this.execute(callback));
    }
  }

  stop() {
    this.taskScheduler.stop();
    this.wallStartMs = 0;
    this.simStartCycles = 0;
  }
}
