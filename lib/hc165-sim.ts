/**
 * 74HC165 Parallel-In/Serial-Out Shift Register Simulation
 *
 * Hooks into avr8js GPIO ports to simulate the digital logic:
 * - PL (Parallel Load, active LOW): loads D0-D7 into the register
 * - CP (Clock): shifts the register on rising edge
 * - CE (Clock Enable, active LOW): enables the clock
 * - Q7: serial output (MSB of the register)
 * - D0-D7: parallel data inputs (from switches or other sources)
 */

import { PinState } from "avr8js";
import { PinInfo, getPort, type AVRRunnerLike } from "./pin-mapping";

export class HC165Simulator {
  private register = 0; // 8-bit shift register
  private inputs = 0; // 8-bit parallel input state (D0-D7)
  private lastPL = true; // PL defaults HIGH (shift mode)
  private lastCP = false; // CP defaults LOW
  private cleanups: (() => void)[] = [];

  /**
   * @param runner    - AVR simulation runner
   * @param plPin     - MCU pin connected to PL (parallel load)
   * @param cpPin     - MCU pin connected to CP (clock)
   * @param q7Pin     - MCU pin connected to Q7 (serial output)
   * @param cePin     - MCU pin connected to CE, or null if hardwired to GND (always enabled)
   */
  constructor(
    private runner: AVRRunnerLike,
    private plPin: PinInfo,
    private cpPin: PinInfo,
    private q7Pin: PinInfo,
    private cePin: PinInfo | null,
  ) {
    const plPort = getPort(runner, plPin.port);
    const cpPort = getPort(runner, cpPin.port);

    const listener = () => this.tick();
    plPort.addListener(listener);
    this.cleanups.push(() => plPort.removeListener(listener));

    if (cpPort !== plPort) {
      cpPort.addListener(listener);
      this.cleanups.push(() => cpPort.removeListener(listener));
    }

    if (cePin) {
      const cePort = getPort(runner, cePin.port);
      if (cePort !== plPort && cePort !== cpPort) {
        cePort.addListener(listener);
        this.cleanups.push(() => cePort.removeListener(listener));
      }
    }

    this.updateQ7();
  }

  /** Set a parallel data input bit (0-7). */
  setInput(bit: number, high: boolean) {
    if (high) {
      this.inputs |= 1 << bit;
    } else {
      this.inputs &= ~(1 << bit);
    }
    // In parallel load mode (PL LOW), register reflects inputs immediately
    if (!this.lastPL) {
      this.register = this.inputs;
      this.updateQ7();
    }
  }

  private tick() {
    const plPort = getPort(this.runner, this.plPin.port);
    const cpPort = getPort(this.runner, this.cpPin.port);

    const plHigh = plPort.pinState(this.plPin.pin) === PinState.High;
    const cpHigh = cpPort.pinState(this.cpPin.pin) === PinState.High;

    // CE active LOW — if not connected, always enabled
    let ceEnabled = true;
    if (this.cePin) {
      const cePort = getPort(this.runner, this.cePin.port);
      ceEnabled = cePort.pinState(this.cePin.pin) !== PinState.High;
    }

    // PL falling edge: load parallel data into register
    if (!plHigh && this.lastPL) {
      this.register = this.inputs;
      this.updateQ7();
    }

    // CP rising edge (when PL HIGH and CE enabled): shift register left
    if (cpHigh && !this.lastCP && plHigh && ceEnabled) {
      this.register = (this.register << 1) & 0xff;
      this.updateQ7();
    }

    this.lastPL = plHigh;
    this.lastCP = cpHigh;
  }

  private updateQ7() {
    const q7Port = getPort(this.runner, this.q7Pin.port);
    const high = (this.register & 0x80) !== 0;
    q7Port.setPin(this.q7Pin.pin, high);
  }

  dispose() {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
  }
}
