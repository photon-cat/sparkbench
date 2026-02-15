/**
 * 74HC595 Serial-In/Parallel-Out Shift Register Simulation
 *
 * Hooks into avr8js GPIO ports to simulate the digital logic:
 * - DS (Serial Data Input): data bit to shift in
 * - SHCP (Shift Register Clock): shifts DS into the register on rising edge
 * - STCP (Storage Register Clock / Latch): copies shift register to output register on rising edge
 * - OE (Output Enable, active LOW): enables Q0-Q7 outputs (assumed always enabled here)
 * - MR (Master Reset, active LOW): clears the shift register (assumed always HIGH here)
 * - Q0-Q7: parallel outputs
 * - Q7S: serial output for daisy-chaining
 */

import { PinState } from "avr8js";
import { AVRRunner } from "./avr-runner";
import { PinInfo, getPort } from "./pin-mapping";

export class HC595Simulator {
  private shiftRegister = 0; // 8-bit shift register
  private outputRegister = 0; // 8-bit output latch
  private lastSHCP = false; // shift clock state
  private lastSTCP = false; // latch clock state
  private cleanups: (() => void)[] = [];

  /** Called when the output register changes. Receives 8-element boolean array [Q0..Q7]. */
  onOutputChange?: (outputs: boolean[]) => void;

  /**
   * @param runner   - AVR simulation runner
   * @param dsPin    - MCU pin connected to DS (serial data input)
   * @param shcpPin  - MCU pin connected to SHCP (shift clock)
   * @param stcpPin  - MCU pin connected to STCP (storage/latch clock)
   */
  constructor(
    private runner: AVRRunner,
    private dsPin: PinInfo,
    private shcpPin: PinInfo,
    private stcpPin: PinInfo,
  ) {
    const dsPort = getPort(runner, dsPin.port);
    const shcpPort = getPort(runner, shcpPin.port);
    const stcpPort = getPort(runner, stcpPin.port);

    const listener = () => this.tick();

    // Add listener to each unique port
    const ports = new Set([dsPort, shcpPort, stcpPort]);
    for (const port of ports) {
      port.addListener(listener);
      this.cleanups.push(() => port.removeListener(listener));
    }
  }

  private tick() {
    const dsPort = getPort(this.runner, this.dsPin.port);
    const shcpPort = getPort(this.runner, this.shcpPin.port);
    const stcpPort = getPort(this.runner, this.stcpPin.port);

    const shcpHigh = shcpPort.pinState(this.shcpPin.pin) === PinState.High;
    const stcpHigh = stcpPort.pinState(this.stcpPin.pin) === PinState.High;

    // SHCP rising edge: shift DS into the register (MSB first — DS goes into bit 0,
    // existing bits shift left)
    if (shcpHigh && !this.lastSHCP) {
      const dsHigh = dsPort.pinState(this.dsPin.pin) === PinState.High;
      this.shiftRegister = ((this.shiftRegister << 1) | (dsHigh ? 1 : 0)) & 0xff;
    }

    // STCP rising edge: latch shift register to output register
    if (stcpHigh && !this.lastSTCP) {
      const prev = this.outputRegister;
      this.outputRegister = this.shiftRegister;
      if (this.outputRegister !== prev) {
        this.fireOutputChange();
      }
    }

    this.lastSHCP = shcpHigh;
    this.lastSTCP = stcpHigh;
  }

  private fireOutputChange() {
    if (!this.onOutputChange) return;
    const outputs: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      outputs.push((this.outputRegister & (1 << i)) !== 0);
    }
    this.onOutputChange(outputs);
  }

  dispose() {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
  }
}
