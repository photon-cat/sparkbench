import { PinState } from "avr8js";
import { AVRRunner } from "./avr-runner";
import { PinInfo, getPort } from "./pin-mapping";

/**
 * Servo motor simulator.
 *
 * The Arduino Servo library uses Timer1 interrupts to bit-bang a PWM signal
 * on a GPIO pin. We simply listen for pin state changes and measure the
 * HIGH pulse width to compute the angle.
 *
 * Pulse width mapping (Arduino defaults):
 *   544 µs  → 0°
 *   2400 µs → 180°
 */
export class ServoSimulator {
  private riseTime = 0;
  private lastAngle = -1;
  private removeListener: (() => void) | null = null;

  onAngleChange: ((angle: number) => void) | null = null;

  constructor(
    private runner: AVRRunner,
    private pinInfo: PinInfo,
  ) {
    const port = getPort(runner, pinInfo.port);
    const listener = () => {
      const state = port.pinState(pinInfo.pin);
      if (state === PinState.High) {
        // Rising edge — record cycle count
        this.riseTime = runner.cpu.cycles;
      } else if (state === PinState.Low && this.riseTime > 0) {
        // Falling edge — compute pulse width
        const cycles = runner.cpu.cycles - this.riseTime;
        const pulseUs = (cycles / runner.speed) * 1e6;
        this.riseTime = 0;

        // Only process valid servo pulses (400-2600 µs range)
        if (pulseUs >= 400 && pulseUs <= 2600) {
          const MIN_PULSE = 544;
          const MAX_PULSE = 2400;
          const clamped = Math.max(MIN_PULSE, Math.min(MAX_PULSE, pulseUs));
          const angle = Math.round(((clamped - MIN_PULSE) / (MAX_PULSE - MIN_PULSE)) * 180);

          if (angle !== this.lastAngle) {
            this.lastAngle = angle;
            this.onAngleChange?.(angle);
          }
        }
      }
    };
    port.addListener(listener);
    this.removeListener = () => port.removeListener(listener);
  }

  dispose() {
    this.removeListener?.();
    this.removeListener = null;
  }
}
