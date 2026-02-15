import { PinState } from "avr8js";
import { AVRRunner } from "./avr-runner";
import { PinInfo, getPort } from "./pin-mapping";

/**
 * DHT22 temperature/humidity sensor simulator.
 *
 * Protocol (one-wire GPIO):
 * 1. MCU pulls data pin LOW for ≥1ms (start signal)
 * 2. MCU releases (sets to INPUT)
 * 3. DHT22 responds: LOW 80µs, HIGH 80µs
 * 4. 40 data bits: each is LOW 50µs, then HIGH 26µs (0) or 70µs (1)
 * 5. DHT22 releases line
 *
 * Data format (40 bits):
 *   [humidity_high][humidity_low][temp_high][temp_low][checksum]
 *   Humidity: unsigned 16-bit, value = actual * 10
 *   Temperature: bit 15 = sign, bits 0-14 = abs(temp) * 10
 *   Checksum: sum of first 4 bytes & 0xFF
 */
export class DHT22Simulator {
  private temperature = 22.0; // °C
  private humidity = 50.0; // %
  private lastOutputLow = false;
  private lastOutputLowCycle = 0;
  private responding = false;
  private removeListener: (() => void) | null = null;
  private pendingCallback: (() => void) | null = null;

  constructor(
    private runner: AVRRunner,
    private pinInfo: PinInfo,
  ) {
    const port = getPort(runner, pinInfo.port);
    const pin = pinInfo.pin;

    // Default: line is HIGH (pullup)
    port.setPin(pin, true);

    const listener = () => {
      if (this.responding) return; // Don't react during our response

      const state = port.pinState(pin);

      if (state === PinState.Low) {
        // MCU is driving the pin LOW — record when this started
        if (!this.lastOutputLow) {
          this.lastOutputLow = true;
          this.lastOutputLowCycle = runner.cpu.cycles;
        }
      } else if (
        (state === PinState.Input || state === PinState.InputPullUp) &&
        this.lastOutputLow
      ) {
        // MCU released the line — check if LOW was long enough (>800µs = start signal)
        const lowDuration =
          ((runner.cpu.cycles - this.lastOutputLowCycle) / runner.speed) * 1e6;
        this.lastOutputLow = false;

        if (lowDuration > 800) {
          this.startResponse();
        }
      }
    };

    port.addListener(listener);
    this.removeListener = () => port.removeListener(listener);
  }

  setTemperature(celsius: number) {
    this.temperature = Math.max(-40, Math.min(80, celsius));
  }

  setHumidity(percent: number) {
    this.humidity = Math.max(0, Math.min(100, percent));
  }

  private startResponse() {
    this.responding = true;
    const port = getPort(this.runner, this.pinInfo.port);
    const pin = this.pinInfo.pin;
    const cpu = this.runner.cpu;
    const cyclesPerUs = this.runner.speed / 1e6; // 16 cycles per µs

    // Build the 40-bit data
    const data = this.encodeData();

    // Build array of [offsetUs, pinValue] transitions from response start
    const transitions: [number, boolean][] = [];
    let offset = 20; // wait 20µs before pulling LOW

    // Response start: LOW 80µs
    transitions.push([offset, false]);
    offset += 80;
    // HIGH 80µs
    transitions.push([offset, true]);
    offset += 80;

    // 40 data bits
    for (let i = 0; i < 40; i++) {
      const byte = Math.floor(i / 8);
      const bit = 7 - (i % 8);
      const isOne = (data[byte] >> bit) & 1;

      // LOW 50µs (bit start)
      transitions.push([offset, false]);
      offset += 50;
      // HIGH: 26µs for 0, 70µs for 1
      transitions.push([offset, true]);
      offset += isOne ? 70 : 26;
    }

    // Final: LOW 50µs then release
    transitions.push([offset, false]);
    offset += 50;
    transitions.push([offset, true]); // release line

    // Schedule transitions using chained clock events (relative cycle counts)
    let tIdx = 0;
    const scheduleNext = () => {
      if (tIdx >= transitions.length) {
        this.responding = false;
        return;
      }
      const [us, value] = transitions[tIdx];
      const prevUs = tIdx > 0 ? transitions[tIdx - 1][0] : 0;
      const delayUs = us - prevUs;
      const delayCycles = Math.round(delayUs * cyclesPerUs);
      tIdx++;
      cpu.addClockEvent(() => {
        port.setPin(pin, value);
        scheduleNext();
      }, delayCycles);
    };
    scheduleNext();
  }

  private encodeData(): Uint8Array {
    const data = new Uint8Array(5);

    // Humidity: unsigned, value * 10
    const humRaw = Math.round(this.humidity * 10);
    data[0] = (humRaw >> 8) & 0xff;
    data[1] = humRaw & 0xff;

    // Temperature: bit 15 = sign, bits 0-14 = abs * 10
    const absTemp = Math.abs(this.temperature);
    let tempRaw = Math.round(absTemp * 10);
    if (this.temperature < 0) tempRaw |= 0x8000;
    data[2] = (tempRaw >> 8) & 0xff;
    data[3] = tempRaw & 0xff;

    // Checksum
    data[4] = (data[0] + data[1] + data[2] + data[3]) & 0xff;

    return data;
  }

  dispose() {
    this.removeListener?.();
    this.removeListener = null;
  }
}
