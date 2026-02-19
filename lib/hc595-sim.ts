/**
 * 74HC595 Serial-In/Parallel-Out Shift Register Simulation
 *
 * Supports single chips and daisy-chained configurations.
 *
 * HC595Chip: pure shift/latch logic for one chip
 * HC595Chain: manages port listeners and propagates shifts through a chain
 */

import { PinState } from "avr8js";
import { PinInfo, getPort, type AVRRunnerLike } from "./pin-mapping";

/** A single 74HC595 chip's shift/latch logic (no port listeners). */
export class HC595Chip {
  shiftRegister = 0; // 8-bit shift register
  outputRegister = 0; // 8-bit output latch

  /** Called when the output register changes. Receives 8-element boolean array [Q0..Q7]. */
  onOutputChange?: (outputs: boolean[]) => void;

  /**
   * Shift one bit in. Returns the old MSB (Q7S) for daisy-chaining.
   */
  shift(ds: boolean): boolean {
    const q7s = (this.shiftRegister & 0x80) !== 0;
    this.shiftRegister = ((this.shiftRegister << 1) | (ds ? 1 : 0)) & 0xff;
    return q7s;
  }

  /** Latch: copy shift register to output register. */
  latch() {
    const prev = this.outputRegister;
    this.outputRegister = this.shiftRegister;
    if (this.outputRegister !== prev) {
      this.fireOutputChange();
    }
  }

  private fireOutputChange() {
    if (!this.onOutputChange) return;
    const outputs: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      outputs.push((this.outputRegister & (1 << i)) !== 0);
    }
    this.onOutputChange(outputs);
  }
}

/**
 * Manages a chain of one or more daisy-chained 74HC595 chips.
 * Listens to the shared SHCP/STCP clock pins and the head chip's DS pin.
 * On SHCP rising edge: shifts through all chips (head first, Q7S feeds next).
 * On STCP rising edge: latches all chips.
 */
export class HC595Chain {
  private lastSHCP = false;
  private lastSTCP = false;
  private cleanups: (() => void)[] = [];

  constructor(
    private runner: AVRRunnerLike,
    private dsPin: PinInfo,
    private shcpPin: PinInfo,
    private stcpPin: PinInfo,
    readonly chips: HC595Chip[],
  ) {
    const listener = () => this.tick();

    const ports = new Set([
      getPort(runner, dsPin.port),
      getPort(runner, shcpPin.port),
      getPort(runner, stcpPin.port),
    ]);
    for (const port of ports) {
      port.addListener(listener);
      this.cleanups.push(() => port.removeListener(listener));
    }
  }

  private tick() {
    const shcpPort = getPort(this.runner, this.shcpPin.port);
    const stcpPort = getPort(this.runner, this.stcpPin.port);

    const shcpHigh = shcpPort.pinState(this.shcpPin.pin) === PinState.High;
    const stcpHigh = stcpPort.pinState(this.stcpPin.pin) === PinState.High;

    // SHCP rising edge: shift all chips in chain order
    if (shcpHigh && !this.lastSHCP) {
      const dsPort = getPort(this.runner, this.dsPin.port);
      let ds = dsPort.pinState(this.dsPin.pin) === PinState.High;
      for (const chip of this.chips) {
        ds = chip.shift(ds); // Q7S overflow becomes next chip's DS
      }
    }

    // STCP rising edge: latch all chips
    if (stcpHigh && !this.lastSTCP) {
      for (const chip of this.chips) {
        chip.latch();
      }
    }

    this.lastSHCP = shcpHigh;
    this.lastSTCP = stcpHigh;
  }

  dispose() {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
  }
}
