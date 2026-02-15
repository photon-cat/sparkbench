import { AVRRunner } from "./avr-runner";
import { PinInfo, getPort } from "./pin-mapping";

/**
 * KY-040 rotary encoder simulator.
 *
 * Generates quadrature signals on CLK and DT pins.
 * At idle, both CLK and DT are HIGH (pulled up).
 *
 * CW step: DT drops first, then CLK drops, then DT rises, then CLK rises.
 *   → When CLK rises, DT is already HIGH → sketch sees CW.
 *
 * CCW step: CLK drops first, then DT drops, then CLK rises, then DT rises.
 *   → When CLK rises, DT is still LOW → sketch sees CCW.
 *
 * Each transition is spaced ~500µs apart (8000 cycles at 16MHz).
 */
export class EncoderSimulator {
  private stepping = false;

  constructor(
    private runner: AVRRunner,
    private clkPin: PinInfo,
    private dtPin: PinInfo,
    private swPin: PinInfo | null,
  ) {
    // Initialize: CLK and DT HIGH (pullup idle state)
    const clkPort = getPort(runner, clkPin.port);
    const dtPort = getPort(runner, dtPin.port);
    clkPort.setPin(clkPin.pin, true);
    dtPort.setPin(dtPin.pin, true);

    // SW: default HIGH (INPUT_PULLUP, not pressed)
    if (swPin) {
      const swPort = getPort(runner, swPin.port);
      swPort.setPin(swPin.pin, true);
    }
  }

  /** Generate one CW step via quadrature signals. */
  stepCW() {
    this.generateStep(true);
  }

  /** Generate one CCW step via quadrature signals. */
  stepCCW() {
    this.generateStep(false);
  }

  /** Press the encoder button (SW goes LOW). */
  pressButton() {
    if (!this.swPin) return;
    const port = getPort(this.runner, this.swPin.port);
    port.setPin(this.swPin.pin, false);
  }

  /** Release the encoder button (SW goes HIGH). */
  releaseButton() {
    if (!this.swPin) return;
    const port = getPort(this.runner, this.swPin.port);
    port.setPin(this.swPin.pin, true);
  }

  private generateStep(clockwise: boolean) {
    if (this.stepping) return; // prevent overlapping steps
    this.stepping = true;

    const cpu = this.runner.cpu;
    const clkPort = getPort(this.runner, this.clkPin.port);
    const dtPort = getPort(this.runner, this.dtPin.port);
    const clkPin = this.clkPin.pin;
    const dtPin = this.dtPin.pin;
    const stepDelay = 8000; // ~500µs between transitions

    // Quadrature sequence (4 transitions + return to idle)
    // CW:  DT↓, CLK↓, DT↑, CLK↑
    // CCW: CLK↓, DT↓, CLK↑, DT↑
    const transitions: [typeof clkPort, number, boolean][] = clockwise
      ? [
          [dtPort, dtPin, false],   // DT goes LOW
          [clkPort, clkPin, false], // CLK goes LOW
          [dtPort, dtPin, true],    // DT goes HIGH
          [clkPort, clkPin, true],  // CLK goes HIGH → DT is HIGH → CW
        ]
      : [
          [clkPort, clkPin, false], // CLK goes LOW
          [dtPort, dtPin, false],   // DT goes LOW
          [clkPort, clkPin, true],  // CLK goes HIGH → DT is LOW → CCW
          [dtPort, dtPin, true],    // DT goes HIGH
        ];

    let idx = 0;
    const scheduleNext = () => {
      if (idx >= transitions.length) {
        this.stepping = false;
        return;
      }
      const [port, pin, value] = transitions[idx];
      idx++;
      cpu.addClockEvent(() => {
        port.setPin(pin, value);
        scheduleNext();
      }, stepDelay);
    };
    scheduleNext();
  }

  dispose() {
    // No persistent listeners to clean up — only clock events which will expire
  }
}
